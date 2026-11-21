/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { pickBounty, bountyCandidates, bountyClaimed, daysAway, comebackQuest, BOUNTY_FACTOR } from './retention';
import { buildCompletionEntry } from './questActions';
import { calculateQuestXp, getDaysAgoStr } from './logic';
import { Quest, LedgerEntry } from '../types';

const q = (id: string, over: Partial<Quest> = {}): Quest => ({
  id, title: id, stat: 'mind', difficulty: 'normal', type: 'daily', target: 1, active: true, createdAt: '2026-10-01', ...over,
});
const e = (date: string, over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id: `e-${date}-${Math.random()}`, date, questId: 'x', questTitle: 'x', xp: 10, stat: 'mind', difficulty: 'normal', type: 'daily', ...over,
});
const TODAY = '2026-11-21';
const quests = [q('a'), q('b'), q('c', { type: 'weekly' }), q('m', { type: 'milestone' }), q('off', { active: false })];

describe('daily bounty', () => {
  it('only repeatable, active quests can be the bounty', () => {
    expect(bountyCandidates(quests).map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(pickBounty([q('m', { type: 'milestone' })], TODAY)).toBeNull();
  });

  it('is the same all day and does not depend on quest order', () => {
    const one = pickBounty(quests, TODAY, 'Layla')!.id;
    expect(pickBounty([...quests].reverse(), TODAY, 'Layla')!.id).toBe(one);
  });

  it('rotates: never the same quest two days running when there is a choice', () => {
    for (let i = 0; i < 60; i++) {
      const d = getDaysAgoStr(TODAY, i);
      expect(pickBounty(quests, d, 'Layla')!.id).not.toBe(pickBounty(quests, getDaysAgoStr(d, 1), 'Layla')!.id);
    }
  });

  it('pays +50% on a full completion, once a day, and never on the minimum', () => {
    const bounty = q('a', { difficulty: 'hard' });
    const base = calculateQuestXp('hard', 'daily', 'mind', 'scholar');
    const full = buildCompletionEntry({ quest: bounty, quests: [bounty], ledger: [], userClass: 'scholar', date: TODAY, id: '1', bountyQuestId: 'a' });
    expect(full).toMatchObject({ xp: Math.round(base * BOUNTY_FACTOR), bounty: true });
    const again = buildCompletionEntry({ quest: bounty, quests: [bounty], ledger: [full], userClass: 'scholar', date: TODAY, id: '2', bountyQuestId: 'a' });
    expect(again.bounty).toBeUndefined();
    const min = buildCompletionEntry({ quest: bounty, quests: [bounty], ledger: [], userClass: 'scholar', date: TODAY, id: '3', bountyQuestId: 'a', kind: 'minimum' });
    expect(min.bounty).toBeUndefined();
    const other = buildCompletionEntry({ quest: q('b'), quests: [bounty], ledger: [], userClass: 'scholar', date: TODAY, id: '4', bountyQuestId: 'a' });
    expect(other.bounty).toBeUndefined();
    expect(bountyClaimed([full], TODAY)).toBe(true);
  });
});

describe('welcome back', () => {
  it('counts days since the last active day', () => {
    expect(daysAway([], TODAY)).toBe(0);
    expect(daysAway([e(TODAY)], TODAY)).toBe(0);
    expect(daysAway([e('2026-11-20')], TODAY)).toBe(1);
    expect(daysAway([e('2026-11-10'), e('2026-11-16')], TODAY)).toBe(5);
  });

  it('suggests the bounty, else the easiest repeatable quest', () => {
    expect(comebackQuest(quests, quests[1])!.id).toBe('b');
    expect(comebackQuest([q('h', { difficulty: 'hard' }), q('z', { difficulty: 'easy' })], null)!.id).toBe('z');
    expect(comebackQuest([], null)).toBeNull();
  });
});
