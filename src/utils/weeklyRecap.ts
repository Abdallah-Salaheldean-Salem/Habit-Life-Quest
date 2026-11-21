/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LedgerEntry, StatType } from '../types';
import { getDaysAgoStr, getMonday } from './logic';

// ---------------------------------------------------------
// WEEKLY RECAP
// One Monday–Sunday week of the ledger, summarised for the recap card (and,
// in the same shape, for the Sunday push in supabase/functions/hq-push).
// Days after `today` are ignored, so "this week" is the week so far.
// ---------------------------------------------------------

const STAT_KEYS: StatType[] = ['body', 'mind', 'career', 'spirit', 'hobby'];

export interface WeekRecap {
  /** Monday and Sunday of the week (YYYY-MM-DD). */
  start: string;
  end: string;
  /** The seven dates, Monday first. */
  days: string[];
  /** XP per day, Monday first (0 for days with nothing, or still to come). */
  dayXp: number[];
  totalXp: number;
  /** Same measure for the week before, to compare against. */
  prevTotalXp: number;
  activeDays: number;
  /** Quest completions (full or minimum). */
  questsDone: number;
  bounties: number;
  byStat: Record<StatType, number>;
  topStat: StatType | null;
  best: { date: string; xp: number } | null;
  /** That week's Campfire wins, oldest first. */
  wins: { date: string; text: string; stat: StatType }[];
  /** Active on all seven days (earns a streak shield). */
  perfect: boolean;
  /** The week is still in progress. */
  ongoing: boolean;
}

/** The week the recap opens on: this week on a Sunday (the recap's day), otherwise last week. */
export function defaultRecapStart(today: string): string {
  const monday = getMonday(today);
  return getDaysAgoStr(monday, -6) === today ? monday : getDaysAgoStr(monday, 7);
}

export function weekRecap(ledger: LedgerEntry[], weekStart: string, today: string): WeekRecap {
  const start = getMonday(weekStart);
  const days = Array.from({ length: 7 }, (_, i) => getDaysAgoStr(start, -i));
  const end = days[6];
  const prevStart = getDaysAgoStr(start, 7);
  const index = new Map(days.map((d, i) => [d, i]));

  const dayXp = Array(7).fill(0) as number[];
  const active = new Set<string>();
  const byStat = Object.fromEntries(STAT_KEYS.map((s) => [s, 0])) as Record<StatType, number>;
  const wins: WeekRecap['wins'] = [];
  let prevTotalXp = 0;
  let questsDone = 0;
  let bounties = 0;

  for (const e of ledger) {
    if (e.date > today) continue;
    if (e.date >= prevStart && e.date < start) {
      prevTotalXp += e.xp;
      continue;
    }
    const i = index.get(e.date);
    if (i === undefined) continue;
    dayXp[i] += e.xp;
    active.add(e.date);
    if (byStat[e.stat] !== undefined) byStat[e.stat] += e.xp;
    const kind = e.kind ?? 'full';
    if (kind === 'full' || kind === 'minimum') questsDone++;
    if (e.bounty) bounties++;
    if (kind === 'reflection') wins.push({ date: e.date, text: e.questTitle.replace(/^Campfire:\s*/, ''), stat: e.stat });
  }

  const totalXp = dayXp.reduce((a, b) => a + b, 0);
  const topStat = totalXp > 0 ? STAT_KEYS.reduce((a, b) => (byStat[b] > byStat[a] ? b : a)) : null;
  const bestI = dayXp.reduce((bi, x, i) => (x > dayXp[bi] ? i : bi), 0);
  wins.sort((a, b) => a.date.localeCompare(b.date));

  return {
    start,
    end,
    days,
    dayXp,
    totalXp,
    prevTotalXp,
    activeDays: active.size,
    questsDone,
    bounties,
    byStat,
    topStat,
    best: totalXp > 0 ? { date: days[bestI], xp: dayXp[bestI] } : null,
    wins,
    perfect: active.size === 7,
    ongoing: today < end,
  };
}

/** Week-over-week change in XP as a whole percent, or null when there's nothing to compare. */
export function weekDelta(r: WeekRecap): number | null {
  if (r.prevTotalXp <= 0) return null;
  return Math.round(((r.totalXp - r.prevTotalXp) / r.prevTotalXp) * 100);
}
