/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { mergeSaves, SaveStateData } from './syncService';
import { Quest, LedgerEntry } from '../types';

const base = (over: Partial<SaveStateData> = {}): SaveStateData => ({
  version: 9,
  userName: 'Abdallah',
  userClass: 'scholar',
  quests: [],
  ledger: [],
  currentMockDate: '2026-07-20',
  hasCreatedCharacter: true,
  frictionItems: [],
  debuffs: [],
  triggerEvents: [],
  traitGoals: [],
  deletedIds: [],
  liveClock: true,
  ...over,
});

const quest = (id: string, over: Partial<Quest> = {}): Quest => ({
  id,
  title: id,
  stat: 'mind',
  difficulty: 'easy',
  type: 'daily',
  target: 1,
  active: true,
  createdAt: '2026-01-01',
  ...over,
});

const led = (id: string, over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id,
  date: '2026-07-20',
  questId: 'q',
  questTitle: 'q',
  xp: 10,
  stat: 'mind',
  difficulty: 'easy',
  type: 'daily',
  ...over,
});

describe('mergeSaves', () => {
  it('unions ledger entries by id across devices', () => {
    const local = base({ ledger: [led('a'), led('b')] });
    const remote = base({ ledger: [led('b'), led('c')] });
    const ids = mergeSaves(local, remote).ledger.map((e) => e.id).sort();
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('keeps a quest archived if either side archived it', () => {
    const local = base({ quests: [quest('q1', { active: true })] });
    const remote = base({ quests: [quest('q1', { active: false })] });
    const merged = mergeSaves(local, remote);
    expect(merged.quests.find((q) => q.id === 'q1')!.active).toBe(false);
  });

  it('does NOT resurrect a record deleted on the other device (tombstone wins)', () => {
    // local deleted trait goal tg1; remote still has its stale copy
    const local = base({ traitGoals: [], deletedIds: ['tg1'] });
    const remote = base({
      traitGoals: [
        { id: 'tg1', trait: 'conscientiousness', facet: 'Industriousness', role: 'x', questIds: ['a', 'b'], checkins: [], createdAt: '2026-06-01' },
      ],
      deletedIds: [],
    });
    const merged = mergeSaves(local, remote);
    expect(merged.traitGoals!.find((g) => g.id === 'tg1')).toBeUndefined();
    expect(merged.deletedIds).toContain('tg1');
  });

  it('strips a tombstoned friction item and its ledger XP entry', () => {
    const local = base({
      frictionItems: [],
      ledger: [],
      deletedIds: ['fr1', 'friction_fr1'],
    });
    const remote = base({
      frictionItems: [{ id: 'fr1', questId: 'q', text: 'x', done: true, kind: 'reduce' }],
      ledger: [led('friction_fr1', { kind: 'friction' })],
    });
    const merged = mergeSaves(local, remote);
    expect(merged.frictionItems!.length).toBe(0);
    expect(merged.ledger.find((e) => e.id === 'friction_fr1')).toBeUndefined();
  });

  it('unions tombstones from both sides', () => {
    const merged = mergeSaves(base({ deletedIds: ['x'] }), base({ deletedIds: ['y'] }));
    expect(merged.deletedIds!.sort()).toEqual(['x', 'y']);
  });

  it('turns the live clock on if either side has it', () => {
    expect(mergeSaves(base({ liveClock: false }), base({ liveClock: true })).liveClock).toBe(true);
    expect(mergeSaves(base({ liveClock: false }), base({ liveClock: false })).liveClock).toBe(false);
  });

  it('prefers a real (non-default) remote profile name over the local default', () => {
    const merged = mergeSaves(base({ userName: 'Abdallah' }), base({ userName: 'Layla' }));
    expect(merged.userName).toBe('Layla');
  });
});
