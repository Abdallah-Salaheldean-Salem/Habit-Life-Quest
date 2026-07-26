/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SCHEMA_VERSION } from './migrate';
import { SaveStateData } from './syncService';
import { Quest, LedgerEntry, FrictionItem, Debuff, TriggerEvent, TraitGoal } from '../types';

/**
 * Every field the app persists, before it's shaped for a particular target.
 * Centralising this is the point: the payload used to be hand-written in half
 * a dozen places, and a field added to state but forgotten in one copy was a
 * real source of sync bugs.
 */
export interface SaveFields {
  userName: string;
  userClass: string;
  quests: Quest[];
  ledger: LedgerEntry[];
  frictionItems: FrictionItem[];
  debuffs: Debuff[];
  triggerEvents: TriggerEvent[];
  traitGoals: TraitGoal[];
  deletedIds: string[];
  liveClock: boolean;
  debuffLocalOnly: boolean;
  currentMockDate: string;
  hasCreatedCharacter: boolean;
  syncEmail?: string | null;
}

/**
 * The localStorage payload — the full picture, including device-only settings
 * (the on-device privacy switch, the synced email) and the unmasked debuff
 * module data.
 */
export function buildLocalSave(s: SaveFields) {
  return {
    version: SCHEMA_VERSION,
    userName: s.userName,
    userClass: s.userClass,
    quests: s.quests,
    ledger: s.ledger,
    frictionItems: s.frictionItems,
    debuffs: s.debuffs,
    triggerEvents: s.triggerEvents,
    traitGoals: s.traitGoals,
    deletedIds: s.deletedIds,
    liveClock: s.liveClock,
    debuffLocalOnly: s.debuffLocalOnly,
    currentMockDate: s.currentMockDate,
    hasCreatedCharacter: s.hasCreatedCharacter,
    syncEmail: s.syncEmail ?? null,
  };
}

/**
 * The Supabase payload — omits device-only settings, and honours the on-device
 * privacy switch by withholding the debuff module's data while it's local-only.
 */
export function buildCloudSave(s: SaveFields): SaveStateData {
  return {
    version: SCHEMA_VERSION,
    userName: s.userName,
    userClass: s.userClass,
    quests: s.quests,
    ledger: s.ledger,
    frictionItems: s.frictionItems,
    debuffs: s.debuffLocalOnly ? [] : s.debuffs,
    triggerEvents: s.debuffLocalOnly ? [] : s.triggerEvents,
    traitGoals: s.traitGoals,
    deletedIds: s.deletedIds,
    liveClock: s.liveClock,
    currentMockDate: s.currentMockDate,
    hasCreatedCharacter: s.hasCreatedCharacter,
  };
}
