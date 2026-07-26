/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, AchievementContext } from './achievements';
import { LedgerEntry } from '../types';

const find = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)!;

const ctx = (over: Partial<AchievementContext> = {}): AchievementContext => ({
  ledger: [],
  quests: [],
  level: 1,
  statRanks: { body: 0, mind: 0, career: 0, spirit: 0, hobby: 0 },
  getQuestStreak: () => 0,
  frictionItems: [],
  debuffs: [],
  triggerEvents: [],
  traitGoals: [],
  ...over,
});

const led = (kind: LedgerEntry['kind']): LedgerEntry => ({
  id: Math.random().toString(36).slice(2),
  date: '2026-07-20',
  questId: 'q',
  questTitle: 'q',
  xp: 10,
  stat: 'mind',
  difficulty: 'easy',
  type: 'daily',
  kind,
});

describe('achievement completion counting', () => {
  it('First Steps ignores module XP (friction/debuff/trait)', () => {
    const moduleOnly = ctx({ ledger: [led('friction'), led('debuff'), led('trait')] });
    expect(find('first_steps').check(moduleOnly)).toBe(false);
    const withRealCompletion = ctx({ ledger: [led('full')] });
    expect(find('first_steps').check(withRealCompletion)).toBe(true);
  });
});

describe('module achievements', () => {
  it('Cartographer requires a debuff past the mapping stage', () => {
    expect(find('cartographer').check(ctx({ debuffs: [{ stage: 'mapping' } as any] }))).toBe(false);
    expect(find('cartographer').check(ctx({ debuffs: [{ stage: 'active' } as any] }))).toBe(true);
  });

  it('Tide Walker requires 25 surfed (not-acted) urges', () => {
    const surfs = Array.from({ length: 25 }, () => ({ precededBy: 'urge', acted: false } as any));
    expect(find('tide_walker').check(ctx({ triggerEvents: surfs }))).toBe(true);
    expect(find('tide_walker').check(ctx({ triggerEvents: surfs.slice(0, 24) }))).toBe(false);
  });

  it('Becoming requires a trait bound to two habits', () => {
    expect(find('becoming').check(ctx({ traitGoals: [{ questIds: ['a'], checkins: [] } as any] }))).toBe(false);
    expect(find('becoming').check(ctx({ traitGoals: [{ questIds: ['a', 'b'], checkins: [] } as any] }))).toBe(true);
  });
});
