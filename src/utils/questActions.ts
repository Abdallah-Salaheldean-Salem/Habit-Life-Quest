/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ---------------------------------------------------------
// QUEST ACTIONS
// The pure core of the completion / XP-award path, lifted out of App.tsx so it
// can be tested directly and reused without duplicating the three near-identical
// daily/weekly/milestone branches. App wires these to state + toasts.
// ---------------------------------------------------------

import { Quest, LedgerEntry, UserClass } from '../types';
import { calculateQuestXp, applyDawnBuff } from './logic';

/** The never-zero fallback earns this fraction of a quest's base XP. */
export const MIN_XP_FACTOR = 0.4;

export interface CompletionInput {
  quest: Quest;
  quests: Quest[];
  ledger: LedgerEntry[];
  userClass: UserClass;
  date: string;
  id: string;
  /** 'full' applies the Dawn buff; 'minimum' is the never-zero fallback. */
  kind?: 'full' | 'minimum';
}

/**
 * Build the ledger entry for completing a quest. A 'full' completion applies
 * the Dawn Ritual buff (and flags it); a 'minimum' completion earns 40% of the
 * base XP and never carries the buff. Pure.
 */
export function buildCompletionEntry(input: CompletionInput): LedgerEntry {
  const { quest, quests, ledger, userClass, date, id, kind = 'full' } = input;
  const base = calculateQuestXp(quest.difficulty, quest.type, quest.stat, userClass);
  const common = {
    id,
    date,
    questId: quest.id,
    questTitle: quest.title,
    stat: quest.stat,
    difficulty: quest.difficulty,
    type: quest.type,
  };

  if (kind === 'minimum') {
    return { ...common, xp: Math.max(1, Math.round(base * MIN_XP_FACTOR)), kind: 'minimum' };
  }

  const { xp, buffed } = applyDawnBuff(base, quest, quests, ledger, date);
  return { ...common, xp, kind: 'full', ...(buffed ? { buffed: true } : {}) };
}

/** Remove all of a quest's completions on `date` (daily undo). */
export function removeDayCompletions(
  ledger: LedgerEntry[],
  questId: string,
  date: string,
): LedgerEntry[] {
  return ledger.filter((e) => !(e.questId === questId && e.date === date));
}

/** Remove a single completion of a quest on `date` (weekly undo). */
export function removeOneCompletion(
  ledger: LedgerEntry[],
  questId: string,
  date: string,
): LedgerEntry[] {
  const idx = ledger.findIndex((e) => e.questId === questId && e.date === date);
  if (idx === -1) return ledger;
  const next = [...ledger];
  next.splice(idx, 1);
  return next;
}

/** Remove every completion of a quest (milestone undo). */
export function removeAllCompletions(ledger: LedgerEntry[], questId: string): LedgerEntry[] {
  return ledger.filter((e) => e.questId !== questId);
}

/**
 * Update a quest in place, preserving the fields that anchor its history —
 * id, createdAt and active — so streaks and progress survive an edit.
 */
export function updateQuestInList(
  quests: Quest[],
  id: string,
  data: Omit<Quest, 'id' | 'createdAt' | 'active'>,
): Quest[] {
  return quests.map((q) =>
    q.id === id ? { ...q, ...data, id: q.id, createdAt: q.createdAt, active: q.active } : q,
  );
}
