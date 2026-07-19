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
 * Request a passwordless OTP code for an email address
 */
export async function requestOtp(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // In the app, they can enter the token they receive directly in the UI
        shouldCreateUser: true,
      }
    });

    if (error) {
      console.error('Supabase OTP Request Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected OTP error:', err);
    return { success: false, error: err.message || 'An unexpected error occurred' };
  }
}

/**
 * Verify the OTP token entered by the user
 */
export async function verifyOtp(email: string, token: string): Promise<{ success: boolean; session?: any; error?: string }> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email', // standard email verification / magic link OTP
    });

    if (error) {
      console.error('Supabase OTP Verification Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, session: data.session };
  } catch (err: any) {
    console.error('Unexpected OTP verification error:', err);
    return { success: false, error: err.message || 'An unexpected error occurred' };
  }
}

/**
 * Fetch the latest save state from Supabase
 */
export async function pullSave(userId: string): Promise<{ success: boolean; saveState?: SaveStateData; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('habitquest_saves')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Supabase Pull Error:', error);
      return { success: false, error: error.message };
    }

    if (data && data.data) {
      return { success: true, saveState: data.data as SaveStateData };
    }

    return { success: true }; // No previous save found (new user)
  } catch (err: any) {
    console.error('Unexpected pull error:', err);
    return { success: false, error: err.message || 'An unexpected error occurred' };
  }
}

/**
 * Push the save state to Supabase
 */
export async function pushSave(userId: string, email: string, saveState: SaveStateData): Promise<{ success: boolean; error?: string }> {
  try {
    // Exclude the email from the nested state since we store it in a column, but keep it for completeness
    const { error } = await supabase
      .from('habitquest_saves')
      .upsert({
        user_id: userId,
        email,
        data: saveState,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Supabase Push Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected push error:', err);
    return { success: false, error: err.message || 'An unexpected error occurred' };
  }
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
