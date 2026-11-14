/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { dayReplay } from './dayReplay';
import { LedgerEntry } from '../types';

const e = (id: string, date: string, over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id, date, questId: id, questTitle: id, xp: 10, stat: 'mind', difficulty: 'easy', type: 'daily', ...over,
});

describe('dayReplay', () => {
  const ledger = [
    e('Read 10 pages', '2026-11-12', { xp: 12 }),
    e('Walk', '2026-11-12', { stat: 'body', kind: 'minimum', xp: 5 }),
    e('Phone out of bedroom', '2026-11-12', { kind: 'friction', xp: 15, stat: 'spirit' }),
    e('Campfire: Shipped the driver', '2026-11-12', { kind: 'reflection', stat: 'career', xp: 15 }),
    e('Legacy entry', '2026-11-12', { kind: undefined, xp: 20 }),
    e('Other day', '2026-11-11'),
  ];

  it('groups one day into quests, other XP and the Campfire win', () => {
    const r = dayReplay(ledger, '2026-11-12');
    expect(r.totalXp).toBe(67);
    expect(r.quests.map((q) => q.title)).toEqual(['Read 10 pages', 'Walk', 'Legacy entry']);
    expect(r.quests[1].minimum).toBe(true);
    expect(r.other).toEqual([{ title: 'Phone out of bedroom', stat: 'spirit', xp: 15 }]);
    expect(r.win).toEqual({ text: 'Shipped the driver', stat: 'career' });
  });

  it('is empty for a day with nothing logged', () => {
    expect(dayReplay(ledger, '2026-11-01')).toMatchObject({ totalXp: 0, quests: [], other: [], win: null });
  });
});
