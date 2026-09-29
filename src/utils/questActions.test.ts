/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  buildCompletionEntry,
  removeDayCompletions,
  removeOneCompletion,
  removeAllCompletions,
  updateQuestInList,
  MIN_XP_FACTOR,
} from './questActions';
import { LedgerEntry, Quest } from '../types';

const quest = (over: Partial<Quest> = {}): Quest => ({
  id: 'q1',
  title: 'Read 10 pages',
  stat: 'mind',
  difficulty: 'normal',
  type: 'daily',
  target: 1,
  active: true,
  createdAt: '2026-01-01',
  ...over,
});

const entry = (questId: string, date: string, over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id: `${questId}_${date}`,
  date,
  questId,
  questTitle: 't',
  xp: 10,
  stat: 'mind',
  difficulty: 'normal',
  type: 'daily',
  kind: 'full',
  ...over,
});

const DATE = '2026-07-18';

describe('buildCompletionEntry', () => {
  it('awards base XP for a full completion with no dawn ritual', () => {
    const q = quest(); // scholar's affinity is mind → 25 * 1.2 = 30
    const e = buildCompletionEntry({ quest: q, quests: [q], ledger: [], userClass: 'scholar', date: DATE, id: 'log1' });
    expect(e.xp).toBe(30);
    expect(e.kind).toBe('full');
    expect(e.buffed).toBeUndefined();
    expect(e.questId).toBe('q1');
    expect(e.date).toBe(DATE);
  });

  it('applies the +10% dawn buff once the ritual is complete', () => {
    const dawn = quest({ id: 'dawn', phase: 'dawn', stat: 'body', difficulty: 'easy' });
    const q = quest();
    const ledger = [entry('dawn', DATE)]; // dawn ritual done today
    const e = buildCompletionEntry({ quest: q, quests: [dawn, q], ledger, userClass: 'scholar', date: DATE, id: 'log2' });
    expect(e.buffed).toBe(true);
    expect(e.xp).toBe(Math.round(30 * 1.1)); // 33
  });

  it('never buffs a minimum completion, and pays 40% of base', () => {
    const dawn = quest({ id: 'dawn', phase: 'dawn' });
    const q = quest();
    const ledger = [entry('dawn', DATE)];
    const e = buildCompletionEntry({ quest: q, quests: [dawn, q], ledger, userClass: 'scholar', date: DATE, id: 'log3', kind: 'minimum' });
    expect(e.kind).toBe('minimum');
    expect(e.buffed).toBeUndefined();
    expect(e.xp).toBe(Math.max(1, Math.round(30 * MIN_XP_FACTOR))); // 12
  });

  it('minimum XP is never below 1', () => {
    const q = quest({ difficulty: 'easy', stat: 'body' }); // base 10, *0.4 = 4
    const e = buildCompletionEntry({ quest: q, quests: [q], ledger: [], userClass: 'scholar', date: DATE, id: 'log4', kind: 'minimum' });
    expect(e.xp).toBeGreaterThanOrEqual(1);
  });
});

describe('ledger undo helpers', () => {
  const ledger = [
    entry('q1', DATE),
    entry('q1', DATE, { id: 'q1_b' }), // a second same-day completion (weekly)
    entry('q1', '2026-07-17'),
    entry('q2', DATE),
  ];

  it('removeDayCompletions drops every same-day entry for the quest only', () => {
    const out = removeDayCompletions(ledger, 'q1', DATE);
    expect(out.some((e) => e.questId === 'q1' && e.date === DATE)).toBe(false);
    expect(out.some((e) => e.questId === 'q1' && e.date === '2026-07-17')).toBe(true); // other days kept
    expect(out.some((e) => e.questId === 'q2')).toBe(true); // other quests kept
  });

  it('removeOneCompletion drops exactly one same-day entry', () => {
    const out = removeOneCompletion(ledger, 'q1', DATE);
    expect(out.filter((e) => e.questId === 'q1' && e.date === DATE).length).toBe(1);
    expect(out.length).toBe(ledger.length - 1);
  });

  it('removeOneCompletion is a no-op when there is nothing to remove', () => {
    const out = removeOneCompletion(ledger, 'nope', DATE);
    expect(out.length).toBe(ledger.length);
  });

  it('removeAllCompletions drops every entry for the quest', () => {
    const out = removeAllCompletions(ledger, 'q1');
    expect(out.some((e) => e.questId === 'q1')).toBe(false);
    expect(out.length).toBe(1); // only q2 remains
  });
});

describe('updateQuestInList', () => {
  it('updates fields while preserving id, createdAt and active', () => {
    const q = quest({ id: 'keep', createdAt: '2025-12-01', active: true });
    const out = updateQuestInList([q], 'keep', {
      title: 'Read 25 pages',
      stat: 'mind',
      difficulty: 'hard',
      type: 'daily',
      target: 1,
    });
    const updated = out[0];
    expect(updated.title).toBe('Read 25 pages');
    expect(updated.difficulty).toBe('hard');
    expect(updated.id).toBe('keep');
    expect(updated.createdAt).toBe('2025-12-01'); // history anchor preserved
    expect(updated.active).toBe(true);
  });

  it('leaves other quests untouched', () => {
    const a = quest({ id: 'a' });
    const b = quest({ id: 'b', title: 'B' });
    const out = updateQuestInList([a, b], 'a', { title: 'A2', stat: 'body', difficulty: 'easy', type: 'daily', target: 1 });
    expect(out.find((q) => q.id === 'b')!.title).toBe('B');
  });
});
