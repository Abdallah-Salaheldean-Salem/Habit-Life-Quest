/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  calculateQuestXp,
  getLevelAndProgress,
  getCharacterTitle,
  getStatRank,
  getDaysAgoStr,
  getNextDateStr,
  getPreviousDateStr,
  getMonday,
  daysBetween,
  getAutomaticity,
  getAutomaticityState,
  getAppWideStreak,
  getWeeklyQuestStreak,
  getUnlockProgress,
} from './logic';
import { LedgerEntry, Quest } from '../types';

// --- helpers -------------------------------------------------------------
const dailyQuest = (over: Partial<Quest> = {}): Quest => ({
  id: 'q1',
  title: 'Read 10 pages',
  stat: 'mind',
  difficulty: 'easy',
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
  difficulty: 'easy',
  type: 'daily',
  ...over,
});

// --- XP ------------------------------------------------------------------
describe('calculateQuestXp', () => {
  it('applies difficulty base and type multiplier', () => {
    expect(calculateQuestXp('easy', 'daily', 'mind', 'warrior')).toBe(10);
    expect(calculateQuestXp('normal', 'daily', 'mind', 'warrior')).toBe(25);
    expect(calculateQuestXp('hard', 'daily', 'mind', 'warrior')).toBe(50);
    expect(calculateQuestXp('normal', 'weekly', 'mind', 'warrior')).toBe(38); // 25*1.5=37.5 -> 38
    expect(calculateQuestXp('easy', 'milestone', 'mind', 'warrior')).toBe(30); // 10*3
  });

  it('adds the 20% class-affinity bonus only on the matching stat', () => {
    // scholar's bonus stat is mind
    expect(calculateQuestXp('normal', 'daily', 'mind', 'scholar')).toBe(30); // 25*1.2
    expect(calculateQuestXp('normal', 'daily', 'body', 'scholar')).toBe(25); // no bonus
  });
});

// --- levels & titles -----------------------------------------------------
describe('getLevelAndProgress', () => {
  it('is level 1 with zero xp', () => {
    expect(getLevelAndProgress(0)).toEqual({ level: 1, currentXp: 0, nextLevelCost: 100 });
  });
  it('advances a level exactly at the cost boundary', () => {
    expect(getLevelAndProgress(100).level).toBe(2); // L1 costs 100
    expect(getLevelAndProgress(99).level).toBe(1);
  });
  it('carries remaining xp into the next level', () => {
    const p = getLevelAndProgress(120);
    expect(p.level).toBe(2);
    expect(p.currentXp).toBe(20);
    expect(p.nextLevelCost).toBe(125); // round(100*1.25)
  });
  it('never goes below level 1 for negative xp', () => {
    expect(getLevelAndProgress(-50).level).toBe(1);
  });
});

describe('getCharacterTitle', () => {
  it('maps the level ladder', () => {
    expect(getCharacterTitle(1)).toBe('Novice');
    expect(getCharacterTitle(3)).toBe('Initiate');
    expect(getCharacterTitle(6)).toBe('Seasoned');
    expect(getCharacterTitle(10)).toBe('Hardened');
    expect(getCharacterTitle(15)).toBe('Veteran');
    expect(getCharacterTitle(19)).toBe('Champion');
    expect(getCharacterTitle(24)).toBe('Hero');
  });
});

describe('getStatRank', () => {
  it('costs 100 then +50 per rank', () => {
    expect(getStatRank(0)).toBe(0);
    expect(getStatRank(99)).toBe(0);
    expect(getStatRank(100)).toBe(1); // 100
    expect(getStatRank(249)).toBe(1);
    expect(getStatRank(250)).toBe(2); // 100 + 150
    expect(getStatRank(450)).toBe(3); // + 200
  });
});

// --- date helpers --------------------------------------------------------
describe('date helpers', () => {
  it('shifts days without timezone drift', () => {
    expect(getDaysAgoStr('2026-03-10', 5)).toBe('2026-03-05');
    expect(getDaysAgoStr('2026-03-01', 1)).toBe('2026-02-28');
    expect(getNextDateStr('2026-12-31')).toBe('2027-01-01');
    expect(getPreviousDateStr('2026-01-01')).toBe('2025-12-31');
  });
  it('finds the Monday of a week', () => {
    // 2026-07-26 is a Sunday
    expect(getMonday('2026-07-26')).toBe('2026-07-20');
    // 2026-07-20 is a Monday -> itself
    expect(getMonday('2026-07-20')).toBe('2026-07-20');
  });
  it('daysBetween is signed and symmetric', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
    expect(daysBetween('2026-01-31', '2026-01-01')).toBe(-30);
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0);
  });
});

// --- automaticity --------------------------------------------------------
describe('automaticity', () => {
  it('is zero for milestones and for brand-new quests', () => {
    expect(getAutomaticity(dailyQuest({ type: 'milestone' }), [], '2026-02-01')).toBe(0);
    expect(getAutomaticity(dailyQuest({ createdAt: '2026-02-01' }), [], '2026-02-01')).toBe(0);
  });
  it('rises with sustained daily completion', () => {
    const q = dailyQuest({ createdAt: '2026-01-01' });
    // complete every day for 100 days -> at/after the easy target (40d) rate=1, progress=1
    const led: LedgerEntry[] = [];
    for (let i = 0; i < 100; i++) led.push(entry('q1', getDaysAgoStr('2026-04-10', i)));
    const score = getAutomaticity(q, led, '2026-04-10');
    expect(score).toBe(100);
    expect(getAutomaticityState(score)).toBe('automatic');
  });
  it('classifies the state bands', () => {
    expect(getAutomaticityState(0)).toBe('forming');
    expect(getAutomaticityState(39)).toBe('forming');
    expect(getAutomaticityState(40)).toBe('sticking');
    expect(getAutomaticityState(79)).toBe('sticking');
    expect(getAutomaticityState(80)).toBe('automatic');
  });
});

// --- streaks -------------------------------------------------------------
describe('getAppWideStreak', () => {
  it('counts consecutive days ending today', () => {
    const dates = ['2026-07-24', '2026-07-25', '2026-07-26'];
    expect(getAppWideStreak(dates, '2026-07-26')).toBe(3);
  });
  it('does not break when today has no completion yet', () => {
    const dates = ['2026-07-24', '2026-07-25']; // nothing today
    expect(getAppWideStreak(dates, '2026-07-26')).toBe(2);
  });
  it('breaks on a gap', () => {
    const dates = ['2026-07-22', '2026-07-25', '2026-07-26'];
    expect(getAppWideStreak(dates, '2026-07-26')).toBe(2);
  });
});

describe('getWeeklyQuestStreak', () => {
  it('counts weeks that hit the target', () => {
    // target 2/week; two full weeks + current week met
    const dates = [
      '2026-07-06', '2026-07-08', // week of Jul 6
      '2026-07-13', '2026-07-15', // week of Jul 13
      '2026-07-20', '2026-07-22', // week of Jul 20 (current)
    ];
    expect(getWeeklyQuestStreak(dates, 2, '2026-07-26')).toBe(3);
  });
  it('does not break when the current week is still short', () => {
    const dates = [
      '2026-07-06', '2026-07-08',
      '2026-07-13', '2026-07-15',
      '2026-07-20', // current week only 1 so far
    ];
    expect(getWeeklyQuestStreak(dates, 2, '2026-07-26')).toBe(2);
  });
});

// --- unlock / mastery ----------------------------------------------------
describe('getUnlockProgress', () => {
  it('daily unlocks at 30 distinct days', () => {
    const q = dailyQuest();
    const led: LedgerEntry[] = [];
    for (let i = 0; i < 30; i++) led.push(entry('q1', getDaysAgoStr('2026-03-01', i)));
    const p = getUnlockProgress(q, led, '2026-03-01');
    expect(p.unlocked).toBe(true);
    expect(p.current).toBe(30);
    expect(p.percent).toBe(100);
  });
  it('daily counts distinct days, not duplicate logs', () => {
    const q = dailyQuest();
    const led = [entry('q1', '2026-03-01'), entry('q1', '2026-03-01', { id: 'dup' })];
    expect(getUnlockProgress(q, led, '2026-03-01').current).toBe(1);
  });
  it('milestone unlocks on a single completion', () => {
    const q = dailyQuest({ type: 'milestone' });
    expect(getUnlockProgress(q, [], '2026-03-01').unlocked).toBe(false);
    expect(getUnlockProgress(q, [entry('q1', '2026-03-01')], '2026-03-01').unlocked).toBe(true);
  });
  it('weekly unlocks after 4 on-target weeks', () => {
    const q = dailyQuest({ type: 'weekly', target: 2 });
    const led: LedgerEntry[] = [];
    // 4 weeks, 2 completions each
    for (let w = 0; w < 4; w++) {
      const monday = getDaysAgoStr('2026-07-20', w * 7);
      led.push(entry('q1', monday), entry('q1', getNextDateStr(monday)));
    }
    const p = getUnlockProgress(q, led, '2026-07-26');
    expect(p.unlocked).toBe(true);
    expect(p.unit).toBe('weeks');
  });
});
