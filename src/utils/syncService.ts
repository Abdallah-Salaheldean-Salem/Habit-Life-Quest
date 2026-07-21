import { supabase } from './supabase';
import { Quest, LedgerEntry } from '../types';

export interface SaveStateData {
  version: number;
  userName: string;
  userClass: string;
  quests: Quest[];
  ledger: LedgerEntry[];
  currentMockDate: string;
  hasCreatedCharacter: boolean;
  syncEmail?: string | null;
}

/**
 * Request a passwordless one-time code for an email address.
 * Creates the user on first login.
 */
export async function requestOtp(email: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Verify the emailed one-time code and open a session.
 */
export async function verifyOtp(
  email: string,
  token: string
): Promise<{ success: boolean; session?: any; error?: string }> {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) return { success: false, error: error.message };
  return { success: true, session: data.session };
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
    ledger: mergedLedger,
    currentMockDate: mergedCurrentMockDate,
    hasCreatedCharacter: mergedHasCreatedCharacter,
  };
}
