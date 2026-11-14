/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ---------------------------------------------------------
// STREAK SHIELDS + STREAK MILESTONES
// One bad day shouldn't erase a good month. A week (Mon–Sun) in which you
// were active on all seven days earns a shield (bank up to SHIELD_CAP). A
// later day with no activity uses one up automatically and counts as kept
// for the day streak. Today never consumes a shield — it's still in
// progress.
//
// Shields are derived from the activity history rather than stored, so they
// can't drift between devices, need no save migration, and a past perfect
// week counts. They protect the app-wide day streak; individual quest
// streaks are unchanged.
// ---------------------------------------------------------

import { getAppWideStreak, getDaysAgoStr, getMonday } from './logic';

export const SHIELD_CAP = 2;
/** Day-streak lengths that get a medium celebration. */
export const STREAK_MILESTONES = [7, 30, 100, 365];

export interface ShieldState {
  /** Days with no activity that a shield covered. */
  shieldedDates: Set<string>;
  /** Shields banked and ready right now. */
  bank: number;
  /** The Sundays on which a shield was earned. */
  earnedOn: string[];
  /** The days a shield was used, oldest first. */
  usedOn: string[];
}

const nextDay = (d: string) => getDaysAgoStr(d, -1);
const isSunday = (d: string) => getDaysAgoStr(getMonday(d), -6) === d;

/**
 * Walk the history day by day from the first active day through `today`,
 * earning shields on perfect weeks and spending them on missed days.
 */
export function computeShields(activeDates: Iterable<string>, today: string): ShieldState {
  const set = new Set<string>();
  for (const d of activeDates) if (d && d <= today) set.add(d);
  const state: ShieldState = { shieldedDates: new Set(), bank: 0, earnedOn: [], usedOn: [] };
  if (set.size === 0) return state;

  let d = [...set].sort()[0];
  let weekActive = 0;
  // Guard against a malformed date looping forever (~30 years of days).
  for (let guard = 0; d <= today && guard < 11000; guard++) {
    if (getMonday(d) === d) weekActive = 0;
    if (set.has(d)) {
      weekActive++;
    } else if (d !== today && state.bank > 0) {
      state.bank--;
      state.shieldedDates.add(d);
      state.usedOn.push(d);
    }
    if (isSunday(d) && weekActive === 7 && state.bank < SHIELD_CAP) {
      state.bank++;
      state.earnedOn.push(d);
    }
    d = nextDay(d);
  }
  return state;
}

/** The day streak with shielded days counted as kept. */
export function shieldedStreak(activeDates: Iterable<string>, shielded: Set<string>, today: string): number {
  return getAppWideStreak([...activeDates, ...shielded], today);
}

/** The milestone a streak just reached (before → after), or null. */
export function streakMilestoneReached(before: number, after: number): number | null {
  if (after <= before) return null;
  return STREAK_MILESTONES.find((m) => before < m && after >= m) ?? null;
}

/** Copy for each milestone banner. */
export function streakMilestoneLine(m: number): string {
  if (m >= 365) return 'A full year of fire. Legendary.';
  if (m >= 100) return 'One hundred days. This is who you are now.';
  if (m >= 30) return 'A month without going cold.';
  return 'Seven days. The fire holds.';
}
