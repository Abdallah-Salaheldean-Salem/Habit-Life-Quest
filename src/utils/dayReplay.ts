/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LedgerEntry, StatType } from '../types';

export interface DayReplay {
  date: string;
  totalXp: number;
  /** Quest completions that day (full or minimum), in the order logged. */
  quests: { title: string; stat: StatType; xp: number; minimum: boolean }[];
  /** Other XP that day (environment changes, debuffs, traits). */
  other: { title: string; stat: StatType; xp: number }[];
  /** That night's Campfire win, if the day was banked. */
  win: { text: string; stat: StatType } | null;
}

/** Everything that happened on one day, for the Chronicle's day replay. */
export function dayReplay(ledger: LedgerEntry[], date: string): DayReplay {
  const day = ledger.filter((e) => e.date === date);
  const out: DayReplay = { date, totalXp: 0, quests: [], other: [], win: null };
  for (const e of day) {
    out.totalXp += e.xp;
    const kind = e.kind ?? 'full';
    if (kind === 'reflection') out.win = { text: e.questTitle.replace(/^Campfire:\s*/, ''), stat: e.stat };
    else if (kind === 'full' || kind === 'minimum') out.quests.push({ title: e.questTitle, stat: e.stat, xp: e.xp, minimum: kind === 'minimum' });
    else out.other.push({ title: e.questTitle, stat: e.stat, xp: e.xp });
  }
  return out;
}
