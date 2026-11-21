/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { weekRecap, defaultRecapStart, weekDelta } from './weeklyRecap';
import { LedgerEntry, StatType } from '../types';

const e = (date: string, xp: number, over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id: `${date}-${xp}-${Math.random()}`, date, questId: 'q', questTitle: 'Quest', xp, stat: 'mind' as StatType, difficulty: 'normal', type: 'daily', kind: 'full', ...over,
});

// Week of Mon 2026-11-09 .. Sun 2026-11-15; the week before starts Mon 2026-11-02.
const ledger: LedgerEntry[] = [
  e('2026-11-03', 50), e('2026-11-05', 50), // previous week: 100
  e('2026-11-09', 20), e('2026-11-09', 10, { stat: 'body' }),
  e('2026-11-11', 60, { bounty: true }),
  e('2026-11-11', 5, { kind: 'reflection', questTitle: 'Campfire: Finished the chapter', stat: 'spirit' }),
  e('2026-11-14', 15, { kind: 'minimum' }),
  e('2026-11-16', 999), // next week — ignored
];

describe('weekly recap', () => {
  it('summarises one Monday–Sunday week', () => {
    const r = weekRecap(ledger, '2026-11-12', '2026-11-20');
    expect(r.start).toBe('2026-11-09');
    expect(r.end).toBe('2026-11-15');
    expect(r.dayXp).toEqual([30, 0, 65, 0, 0, 15, 0]);
    expect(r.totalXp).toBe(110);
    expect(r.prevTotalXp).toBe(100);
    expect(weekDelta(r)).toBe(10);
    expect(r.activeDays).toBe(3);
    expect(r.questsDone).toBe(4); // reflection isn't a quest
    expect(r.bounties).toBe(1);
    expect(r.topStat).toBe('mind');
    expect(r.best).toEqual({ date: '2026-11-11', xp: 65 });
    expect(r.wins).toEqual([{ date: '2026-11-11', text: 'Finished the chapter', stat: 'spirit' }]);
    expect(r.perfect).toBe(false);
    expect(r.ongoing).toBe(false);
  });

  it('this week so far ignores days after today', () => {
    const r = weekRecap(ledger, '2026-11-09', '2026-11-11');
    expect(r.totalXp).toBe(95);
    expect(r.ongoing).toBe(true);
  });

  it('a perfect week is seven active days', () => {
    const full = Array.from({ length: 7 }, (_, i) => e(`2026-11-${String(9 + i).padStart(2, '0')}`, 10));
    expect(weekRecap(full, '2026-11-09', '2026-11-15').perfect).toBe(true);
  });

  it('an empty week has no best day, no top stat and no comparison', () => {
    const r = weekRecap([], '2026-11-09', '2026-11-20');
    expect(r).toMatchObject({ totalXp: 0, best: null, topStat: null, activeDays: 0 });
    expect(weekDelta(r)).toBeNull();
  });

  it('opens on this week on Sunday, last week otherwise', () => {
    expect(defaultRecapStart('2026-11-15')).toBe('2026-11-09'); // Sunday
    expect(defaultRecapStart('2026-11-16')).toBe('2026-11-09'); // Monday → last week
    expect(defaultRecapStart('2026-11-21')).toBe('2026-11-09'); // Saturday → last week
  });
});
