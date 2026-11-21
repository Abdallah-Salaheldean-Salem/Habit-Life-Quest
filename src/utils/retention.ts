/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Quest, LedgerEntry } from '../types';

// ---------------------------------------------------------
// DAILY BOUNTY + WELCOME BACK
// Bounty: each day one of your repeatable quests is marked as the bounty and
// pays +50% XP when completed in full. Quests take turns, so the pick is the
// same on every device and reload, and changes every day.
// Welcome back: after COMEBACK_DAYS or more away, the app opens on a warm
// screen with one easy way back in — no penalties, no wall of misses.
// ---------------------------------------------------------

export const BOUNTY_FACTOR = 1.5;
export const COMEBACK_DAYS = 3;

/** Small stable string hash (FNV-1a). */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Quests that can be today's bounty: active, repeatable (daily or weekly), not ritual steps. */
export function bountyCandidates(quests: Quest[]): Quest[] {
  // Dawn/Campfire ritual steps stay out: they're tiny by design.
  return quests.filter((q) => q.active && !q.phase && (q.type === 'daily' || q.type === 'weekly')).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Today's bounty quest, or null when there are no candidates. Quests take turns
 * in a fixed order shuffled by `seed` (the character's name), one per day, so
 * every quest gets its turn and none repeats on consecutive days.
 */
export function pickBounty(quests: Quest[], date: string, seed = ''): Quest | null {
  const pool = bountyCandidates(quests).sort((x, y) => hash(`${seed}|${x.id}`) - hash(`${seed}|${y.id}`) || x.id.localeCompare(y.id));
  if (!pool.length) return null;
  const day = Math.floor(Date.parse(date + 'T00:00:00Z') / 86400000);
  return pool[((day % pool.length) + pool.length) % pool.length];
}

/** Whether today's bounty has been claimed already. */
export function bountyClaimed(ledger: LedgerEntry[], date: string): boolean {
  return ledger.some((e) => e.date === date && e.bounty);
}

/** Days since the last active day before today, or 0 if active today / no history. */
export function daysAway(ledger: LedgerEntry[], today: string): number {
  let last: string | null = null;
  for (const e of ledger) {
    if (e.date === today) return 0;
    if (e.date < today && (!last || e.date > last)) last = e.date;
  }
  if (!last) return 0;
  return Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(last + 'T00:00:00Z')) / 86400000);
}

/** The one quest to suggest on the welcome-back screen: the bounty, else the easiest repeatable quest. */
export function comebackQuest(quests: Quest[], bounty: Quest | null): Quest | null {
  if (bounty) return bounty;
  const rank = { easy: 0, normal: 1, hard: 2 } as Record<string, number>;
  return bountyCandidates(quests).sort((a, b) => (rank[a.difficulty] ?? 1) - (rank[b.difficulty] ?? 1))[0] ?? null;
}
