/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { LEGENDS, legendFor, legendStats, legendProgress, legendEvents, tierFor, LegendTiers } from './legends';
import { CLASS_LOOKS } from '../data/classHeroes';
import { getDaysAgoStr } from './logic';
import { LedgerEntry, StatType } from '../types';

const TODAY = '2026-11-24'; // a Tuesday
const e = (date: string, over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id: `${date}-${Math.random()}`, date, questId: 'q', questTitle: 'q', xp: 10, stat: 'mind' as StatType, difficulty: 'normal', type: 'daily', kind: 'full', ...over,
});
const days = (n: number, from = 1, over: Partial<LedgerEntry> = {}) => Array.from({ length: n }, (_, i) => e(getDaysAgoStr(TODAY, from + i), over));

describe('legends data', () => {
  it('covers the five default looks, each with three distinct upgrades', () => {
    const defaults = Object.values(CLASS_LOOKS).map((looks) => looks[0].id).sort();
    expect(LEGENDS.map((l) => l.lookId).sort()).toEqual(defaults);
    for (const l of LEGENDS) {
      expect(new Set(l.tracks.map((t) => t.id)).size).toBe(3);
      for (const t of l.tracks) expect(t.steps[0] < t.steps[1] && t.steps[1] < t.steps[2]).toBe(true);
    }
    expect(legendFor('ronin')).toBeNull();
  });
});

describe('legend stats', () => {
  it('counts quests by stat, reflections, and ignores the future', () => {
    const s = legendStats([e(TODAY), e(TODAY, { stat: 'body' }), e(TODAY, { kind: 'reflection', stat: 'spirit' }), e('2026-12-01')], TODAY);
    expect(s.statQuests.mind).toBe(1);
    expect(s.statQuests.body).toBe(1);
    expect(s.statQuests.spirit).toBe(0);
    expect(s.reflections).toBe(1);
  });

  it('finds the longest streak, anywhere in history', () => {
    const ledger = [...days(5, 1), ...days(9, 20)];
    expect(legendStats(ledger, TODAY).longestStreak).toBe(9);
  });

  it('counts only finished perfect weeks', () => {
    // Mon 2026-11-16 .. Sun 2026-11-22 is a finished perfect week; this week has 2 days so far.
    const ledger = Array.from({ length: 9 }, (_, i) => e(getDaysAgoStr(TODAY, i)));
    expect(legendStats(ledger, TODAY).perfectWeeks).toBe(1);
  });
});

describe('legend progress', () => {
  it('maps values to chapters', () => {
    expect([0, 2, 3, 5, 6, 9, 10, 40].map((v) => tierFor(v, [3, 6, 10]))).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it('each upgrade climbs on its own; the chapter is the one all three reached', () => {
    const sage = legendFor('floating-sage')!;
    // 12 reflections (markings → II), a 31-day streak (rising → III), little Spirit XP (beads → I).
    const ledger = [...days(31, 1, { stat: 'mind' }), ...days(12, 1, { kind: 'reflection', stat: 'spirit', xp: 1 })];
    const p = legendProgress(sage, legendStats(ledger, TODAY));
    expect(p.tiers).toEqual([0, 1, 2]);
    expect(p.chapter).toBe(0);
    expect(p.tracks[0].next).toBe(3);
    expect(p.tracks[1]).toMatchObject({ value: 12, next: 50 });
  });

  it('celebrates a new chapter and climbing pieces, but not history on first sight', () => {
    const sage = legendFor('floating-sage')!;
    const p = legendProgress(sage, legendStats([], TODAY));
    const fake = { ...p, tiers: [1, 1, 2] as LegendTiers, chapter: 1 as const, tracks: p.tracks.map((t, i) => ({ ...t, tier: ([1, 1, 2] as const)[i] })) as typeof p.tracks };
    expect(legendEvents(null, fake)).toEqual([]);
    const ev = legendEvents([0, 1, 1], fake);
    expect(ev[0]).toEqual({ type: 'chapter', chapter: 1 });
    expect(ev.filter((x) => x.type === 'piece').map((x) => (x.type === 'piece' ? x.track.id : ''))).toEqual(['beads', 'rising']);
  });
});
