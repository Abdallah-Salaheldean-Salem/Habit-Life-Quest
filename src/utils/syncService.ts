import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import { Quest, LedgerEntry, FrictionItem, Debuff, TriggerEvent, TraitGoal, CustomPath } from '../types';
import { mergePaths } from './paths';

export interface SaveStateData {
  version: number;
  userName: string;
  userClass: string;
  quests: Quest[];
  ledger: LedgerEntry[];
  currentMockDate: string;
  hasCreatedCharacter: boolean;
  syncEmail?: string | null;
  frictionItems?: FrictionItem[];
  debuffs?: Debuff[];
  triggerEvents?: TriggerEvent[];
  traitGoals?: TraitGoal[];
  customPaths?: CustomPath[];
  deletedIds?: string[];
  liveClock?: boolean;
}

// ---------------------------------------------------------
// CHARACTER ID + PASSWORD AUTH
// A character logs in with a short ID and a password — no email anywhere. Under
// the hood it uses Supabase email/password auth with a synthetic address built
// from the ID, so passwords are bcrypt-hashed and each account stays isolated
// by row-level security.
// ---------------------------------------------------------

const SYNTH_DOMAIN = 'habitquest.app';

/** Normalise a character ID (lowercase, trimmed). */
export function normalizeId(id: string): string {
  return id.trim().toLowerCase();
}

/**
 * The synthetic email a character ID maps to. IDs are Discord-style
 * (`name#4821`) but `#` isn't safe in an email, so the discriminator separator
 * is folded to `-` for the auth address. Both the display form (`name#4821`)
 * and the canonical form (`name-4821`) map to the same email.
 */
export function characterEmail(id: string): string {
  const canon = normalizeId(id).replace(/#/g, '-');
  return `${canon}@${SYNTH_DOMAIN}`;
}

/** Slug of a character name: a–z0–9 only, capped so `name-####` fits the 24-char id limit. */
export function slugifyName(name: string): string {
  const slug = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
  return slug || 'hero';
}

/** A random 4-digit discriminator, 1000–9999 (Discord-style). */
function randomDiscriminator(): string {
  return String(1000 + Math.floor(Math.random() * 9000));
}

/**
 * Build a Discord-style ID from a character name:
 *   displayId   'shadowknight#4821'  (shown to the user, used to sign in)
 *   canonicalId 'shadowknight-4821'  (the email-safe auth id)
 */
export function generateCharacterId(name: string): { displayId: string; canonicalId: string } {
  const slug = slugifyName(name);
  const disc = randomDiscriminator();
  return { displayId: `${slug}#${disc}`, canonicalId: `${slug}-${disc}` };
}

/**
 * Render a stored id in its display form. New accounts already store the
 * `name#4821` form; this also fixes up any canonical `name-4821` row (the slug
 * never contains `-`, so the trailing group is unambiguously the discriminator).
 */
export function displayId(id: string): string {
  const s = String(id || '');
  return s.includes('#') ? s : s.replace(/-(\d{3,5})$/, '#$1');
}

/** Turn a raw error code/message into something a human can read. */
function friendly(code: string): string {
  const c = (code || '').toLowerCase();
  if (c.includes('id_taken')) return 'That Character ID is already taken — pick another.';
  if (c.includes('invalid_id')) return 'Use 3–24 letters, numbers, - or _ for the Character ID.';
  if (c.includes('weak_password')) return 'Password must be at least 6 characters.';
  if (c.includes('invalid login') || c.includes('invalid_credentials')) return 'Wrong Character ID or password.';
  return code || 'Something went wrong. Try again.';
}

/** POST one registration attempt to the edge function. */
async function postRegister(
  canonicalId: string,
  password: string,
  display: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ id: canonicalId, password, characterId: display }),
    });
    let body: any = {};
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    if (!res.ok || body?.error) return { ok: false, error: body?.error || 'register_failed' };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error.' };
  }
}

/**
 * Create a new character and sign in. The Character ID is assigned
 * automatically as `name#4821` (Discord-style) from the character's name; if
 * that exact ID is taken, a new discriminator is rolled and retried.
 * Registration goes through an edge function that admin-creates an
 * already-confirmed user, so no email is sent.
 */
export async function registerCharacter(
  name: string,
  password: string,
): Promise<{ success: boolean; session?: any; error?: string; assignedId?: string }> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const { displayId: dId, canonicalId } = generateCharacterId(name);
    const res = await postRegister(canonicalId, password, dId);
    if (res.ok) {
      const signed = await signInCharacter(canonicalId, password);
      return { ...signed, assignedId: dId };
    }
    // Only an ID clash is worth retrying with a fresh discriminator; anything
    // else (weak password, network) should surface immediately.
    if ((res.error || '').toLowerCase().includes('id_taken')) continue;
    return { success: false, error: friendly(res.error || 'register_failed') };
  }
  return { success: false, error: 'Could not find a free ID — please try again.' };
}

/** Sign in to an existing character with ID + password. */
export async function signInCharacter(
  id: string,
  password: string,
): Promise<{ success: boolean; session?: any; error?: string; assignedId?: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: characterEmail(id),
    password,
  });
  if (error) return { success: false, error: friendly(error.message) };
  return { success: true, session: data.session };
}

/** The character ID (display form) for a signed-in user, from metadata or the email. */
export function idFromUser(user: any): string {
  const raw = user?.user_metadata?.character_id || String(user?.email || '').split('@')[0] || '';
  return displayId(raw);
}


/**
 * Fetch the latest save state for a user from Supabase.
 */
export async function pullSave(
  userId: string
): Promise<{ success: boolean; saveState?: SaveStateData; error?: string }> {
  const { data, error } = await supabase
    .from('saves')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  if (data && data.data) return { success: true, saveState: data.data as SaveStateData };
  return { success: true };
}

/**
 * Push the save state to Supabase (insert or update the user's single row).
 */
export async function pushSave(
  userId: string,
  email: string,
  saveState: SaveStateData
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('saves').upsert(
    {
      user_id: userId,
      email,
      data: saveState,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Local-First Merging Logic
 * Union the ledger entries (avoiding duplicate IDs)
 * Union the quests (deactivated/archived state wins)
 * Prefer latest/remote for other properties
 */
export function mergeSaves(local: SaveStateData, remote: SaveStateData): SaveStateData {
  // 1. Merge ledger entries by ID (union)
  const ledgerMap = new Map<string, LedgerEntry>();
  
  // Add local ones
  if (Array.isArray(local.ledger)) {
    local.ledger.forEach(entry => {
      if (entry && entry.id) ledgerMap.set(entry.id, entry);
    });
  }
  
  // Add remote ones (will overwrite duplicate IDs, ensuring consistency)
  if (Array.isArray(remote.ledger)) {
    remote.ledger.forEach(entry => {
      if (entry && entry.id) ledgerMap.set(entry.id, entry);
    });
  }
  
  const mergedLedger = Array.from(ledgerMap.values());

  // 2. Merge Quests
  const questMap = new Map<string, Quest>();
  
  // Add local quests
  if (Array.isArray(local.quests)) {
    local.quests.forEach(quest => {
      if (quest && quest.id) questMap.set(quest.id, quest);
    });
  }
  
  // Add remote quests
  if (Array.isArray(remote.quests)) {
    remote.quests.forEach(remoteQuest => {
      if (remoteQuest && remoteQuest.id) {
        const localQuest = questMap.get(remoteQuest.id);
        if (localQuest) {
          // If a quest was deleted/archived in either, keep active = false
          const mergedActive = localQuest.active === false || remoteQuest.active === false ? false : true;
          questMap.set(remoteQuest.id, {
            ...remoteQuest,
            active: mergedActive
          });
        } else {
          questMap.set(remoteQuest.id, remoteQuest);
        }
      }
    });
  }
  
  const mergedQuests = Array.from(questMap.values());

  // 2b. Merge friction items by id (union), same as ledger/quests.
  const frictionMap = new Map<string, FrictionItem>();
  if (Array.isArray(local.frictionItems)) {
    local.frictionItems.forEach((f) => {
      if (f && f.id) frictionMap.set(f.id, f);
    });
  }
  if (Array.isArray(remote.frictionItems)) {
    remote.frictionItems.forEach((f) => {
      if (f && f.id) frictionMap.set(f.id, f);
    });
  }
  const mergedFrictionItems = Array.from(frictionMap.values());

  // 2c. Merge debuffs + trigger events by id (union).
  const debuffMap = new Map<string, Debuff>();
  if (Array.isArray(local.debuffs)) local.debuffs.forEach((d) => d && d.id && debuffMap.set(d.id, d));
  if (Array.isArray(remote.debuffs)) remote.debuffs.forEach((d) => d && d.id && debuffMap.set(d.id, d));
  const mergedDebuffs = Array.from(debuffMap.values());

  const triggerMap = new Map<string, TriggerEvent>();
  if (Array.isArray(local.triggerEvents)) local.triggerEvents.forEach((t) => t && t.id && triggerMap.set(t.id, t));
  if (Array.isArray(remote.triggerEvents)) remote.triggerEvents.forEach((t) => t && t.id && triggerMap.set(t.id, t));
  const mergedTriggerEvents = Array.from(triggerMap.values());

  // 2d. Merge trait goals by id (union) — remote wins on a duplicate id so
  // freshly-logged check-ins from another device are preserved.
  const traitMap = new Map<string, TraitGoal>();
  if (Array.isArray(local.traitGoals)) local.traitGoals.forEach((g) => g && g.id && traitMap.set(g.id, g));
  if (Array.isArray(remote.traitGoals)) remote.traitGoals.forEach((g) => g && g.id && traitMap.set(g.id, g));
  const mergedTraitGoals = Array.from(traitMap.values());

  // 2e. Tombstones — a record deleted on any device stays deleted. Union the
  // ids, then strip them from every union'd array so a stale copy on the other
  // side can't resurrect it. (Ledger is filtered too: friction XP entries are
  // removed alongside their friction item.)
  const deletedSet = new Set<string>([
    ...(Array.isArray(local.deletedIds) ? local.deletedIds : []),
    ...(Array.isArray(remote.deletedIds) ? remote.deletedIds : []),
  ]);
  const notDeleted = <T extends { id: string }>(arr: T[]) => arr.filter((x) => !deletedSet.has(x.id));

  // 3. Profiles and date
  // Prefer remote details unless they are defaults or empty
  const isLocalDefault = local.userName === 'Abdallah' || !local.userName;
  const isRemoteDefault = remote.userName === 'Abdallah' || !remote.userName;

  const mergedUserName = !isRemoteDefault ? remote.userName : local.userName;
  const mergedUserClass = remote.userClass || local.userClass;
  const mergedCurrentMockDate = remote.currentMockDate || local.currentMockDate;
  const mergedHasCreatedCharacter = remote.hasCreatedCharacter || local.hasCreatedCharacter;

  return {
    version: Math.max(local.version || 1, remote.version || 1),
    userName: mergedUserName || 'Abdallah',
    userClass: mergedUserClass || 'scholar',
    quests: mergedQuests,
    ledger: notDeleted(mergedLedger),
    frictionItems: notDeleted(mergedFrictionItems),
    debuffs: notDeleted(mergedDebuffs),
    triggerEvents: notDeleted(mergedTriggerEvents),
    traitGoals: notDeleted(mergedTraitGoals),
    customPaths: mergePaths(local.customPaths, remote.customPaths, deletedSet),
    deletedIds: Array.from(deletedSet),
    liveClock: Boolean(local.liveClock || remote.liveClock),
    currentMockDate: mergedCurrentMockDate,
    hasCreatedCharacter: mergedHasCreatedCharacter,
  };
}
