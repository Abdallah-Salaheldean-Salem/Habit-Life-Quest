/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { computeShields, shieldedStreak, streakMilestoneReached, SHIELD_CAP } from './shields';
import { getDaysAgoStr } from './logic';

// 2026-11-02 is a Monday.
const MON = '2026-11-02';
const day = (offset: number) => getDaysAgoStr(MON, -offset);
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => day(from + i));

describe('computeShields', () => {
  it('earns a shield for a week active all seven days (credited on Sunday)', () => {
    const s = computeShields(range(0, 6), day(6));
    expect(s.bank).toBe(1);
    expect(s.earnedOn).toEqual([day(6)]);
  });

  it('earns nothing for a week with a gap', () => {
    const dates = range(0, 6).filter((d) => d !== day(3));
    expect(computeShields(dates, day(6)).bank).toBe(0);
  });

  it('a missed day after a perfect week uses the shield and keeps the streak', () => {
    // perfect week, then Mon active, Tue missed, Wed–Thu active
    const dates = [...range(0, 6), day(7), day(9), day(10)];
    const s = computeShields(dates, day(10));
    expect(s.usedOn).toEqual([day(8)]);
    expect(s.bank).toBe(0);
    expect(shieldedStreak(dates, s.shieldedDates, day(10))).toBe(11);
  });

  it('without a shield the same gap breaks the streak', () => {
    const dates = [day(7), day(9), day(10)];
    const s = computeShields(dates, day(10));
    expect(s.usedOn).toEqual([]);
    expect(shieldedStreak(dates, s.shieldedDates, day(10))).toBe(2);
  });

  it('never spends a shield on today (still in progress)', () => {
    const s = computeShields(range(0, 6), day(7));
    expect(s.bank).toBe(1);
    expect(s.usedOn).toEqual([]);
  });

  it('banks at most SHIELD_CAP shields', () => {
    const s = computeShields(range(0, 27), day(27)); // four perfect weeks
    expect(s.bank).toBe(SHIELD_CAP);
    expect(s.earnedOn.length).toBe(SHIELD_CAP);
  });

  it('a long break spends every banked shield and then the streak ends', () => {
    const dates = [...range(0, 13), day(20)];
    const s = computeShields(dates, day(20));
    expect(s.usedOn).toEqual([day(14), day(15)]);
    expect(shieldedStreak(dates, s.shieldedDates, day(20))).toBe(1);
  });

  it('is empty for no history', () => {
    expect(computeShields([], day(0))).toMatchObject({ bank: 0, usedOn: [], earnedOn: [] });
  });
});

describe('streakMilestoneReached', () => {
  it('fires once when a milestone is crossed', () => {
    expect(streakMilestoneReached(6, 7)).toBe(7);
    expect(streakMilestoneReached(29, 30)).toBe(30);
    expect(streakMilestoneReached(99, 100)).toBe(100);
  });
  it('stays quiet otherwise', () => {
    expect(streakMilestoneReached(7, 7)).toBeNull();
    expect(streakMilestoneReached(7, 8)).toBeNull();
    expect(streakMilestoneReached(8, 7)).toBeNull();
  });
});
