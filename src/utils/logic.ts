/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CLASSES,
  LedgerEntry,
  Quest,
  QuestDifficulty,
  QuestType,
  StatType,
  UserClass,
} from '../types';

// ---------------------------------------------------------
// DATE HELPERS
// All dates are handled as `YYYY-MM-DD` strings. We parse at local
// noon to avoid DST / timezone rollovers shifting the calendar day.
// ---------------------------------------------------------
function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00');
}

export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Returns `dateStr` shifted back by `days` (negative moves forward). */
export function getDaysAgoStr(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() - days);
  return toDateStr(d);
}

export function getNextDateStr(dateStr: string): string {
  return getDaysAgoStr(dateStr, -1);
}

export function getPreviousDateStr(dateStr: string): string {
  return getDaysAgoStr(dateStr, 1);
}

/** Monday (start of week) for the week containing `dateStr`. */
export function getMonday(dateStr: string): string {
  const d = parseDate(dateStr);
  const day = d.getDay(); // 0 = Sunday … 6 = Saturday
  const diff = (day + 6) % 7; // days since Monday
  d.setDate(d.getDate() - diff);
  return toDateStr(d);
}

export function getPreviousWeekMonday(dateStr: string): string {
  return getDaysAgoStr(getMonday(dateStr), 7);
}

// ---------------------------------------------------------
// XP CALCULATION
// ---------------------------------------------------------
const DIFFICULTY_XP: Record<QuestDifficulty, number> = {
  easy: 10,
  normal: 20,
  hard: 35,
};

const TYPE_MULTIPLIER: Record<QuestType, number> = {
  daily: 1,
  weekly: 1.5,
  milestone: 4,
};

const CLASS_BONUS = 1.25;

export function calculateQuestXp(
  difficulty: QuestDifficulty,
  type: QuestType,
  stat: StatType,
  userClass: UserClass,
): number {
  const base = DIFFICULTY_XP[difficulty] ?? 20;
  const typeMult = TYPE_MULTIPLIER[type] ?? 1;
  const classMatches = CLASSES[userClass]?.bonusStat === stat;
  const bonus = classMatches ? CLASS_BONUS : 1;
  return Math.round(base * typeMult * bonus);
}

// ---------------------------------------------------------
// LEVELS & TITLES
// Levelling curve: 100 XP for the first level-up, then +25 XP each level.
// ---------------------------------------------------------
export function getLevelAndProgress(totalXp: number): {
  level: number;
  currentXp: number;
  nextLevelCost: number;
} {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  let cost = 100;

  while (remaining >= cost) {
    remaining -= cost;
    level++;
    cost = 100 + (level - 1) * 25;
  }

  return { level, currentXp: remaining, nextLevelCost: cost };
}

export function getCharacterTitle(level: number): string {
  if (level >= 30) return 'Ascended Legend';
  if (level >= 20) return 'Grandmaster';
  if (level >= 15) return 'Champion';
  if (level >= 10) return 'Veteran';
  if (level >= 5) return 'Adventurer';
  if (level >= 2) return 'Apprentice';
  return 'Novice';
}

// ---------------------------------------------------------
// STAT RANKS
// Rank 0 -> 1 costs 100 XP, each subsequent rank costs +50 more.
// Mirrors getStatRankProgress() in App.tsx.
// ---------------------------------------------------------
export function getStatRank(xp: number): number {
  let rank = 0;
  let cost = 100;
  let accumulated = 0;

  while (xp >= accumulated + cost) {
    accumulated += cost;
    rank++;
    cost += 50;
  }

  return rank;
}

// ---------------------------------------------------------
// STREAKS
// A day/week that is still "in progress" (today / this week) does not
// break a streak: if it has no qualifying completion yet we simply start
// counting from the previous period.
// ---------------------------------------------------------
export function getAppWideStreak(dates: string[], currentDate: string): number {
  const set = new Set(dates);
  let cursor = currentDate;
  if (!set.has(cursor)) {
    cursor = getPreviousDateStr(cursor);
  }
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = getPreviousDateStr(cursor);
  }
  return streak;
}

export function getDailyQuestStreak(dates: string[], currentDate: string): number {
  // Same rule as the app-wide streak, scoped to one quest's completions.
  return getAppWideStreak(dates, currentDate);
}

export function getWeeklyQuestStreak(
  dates: string[],
  target: number,
  currentDate: string,
): number {
  const countInWeek = (monday: string): number => {
    const sunday = getDaysAgoStr(monday, -6);
    return dates.filter((d) => d >= monday && d <= sunday).length;
  };

  let monday = getMonday(currentDate);
  if (countInWeek(monday) < target) {
    monday = getPreviousWeekMonday(currentDate);
  }

  let streak = 0;
  while (countInWeek(monday) >= target) {
    streak++;
    monday = getDaysAgoStr(monday, 7);
  }
  return streak;
}

// ---------------------------------------------------------
// UNLOCK / MASTERY PROGRESS
// The playbook's core rule: a node "unlocks" only after 30 consistent days
// (4 weeks for weekly quests; a single completion for milestones). We measure
// cumulative consistency (distinct qualifying days/weeks), which is forgiving
// of the occasional miss — the streak still lives separately.
// ---------------------------------------------------------
export interface UnlockProgress {
  current: number;
  target: number;
  percent: number;
  unlocked: boolean;
  unit: string;
}

export function getUnlockProgress(
  quest: Quest,
  ledger: LedgerEntry[],
  currentDate: string,
): UnlockProgress {
  const completions = ledger.filter((e) => e.questId === quest.id && e.date <= currentDate);

  if (quest.type === 'milestone') {
    const unlocked = completions.length > 0;
    return { current: unlocked ? 1 : 0, target: 1, percent: unlocked ? 100 : 0, unlocked, unit: 'done' };
  }

  if (quest.type === 'weekly') {
    const target = 4; // 4 weeks on target, per the playbook
    const weekCounts = new Map<string, number>();
    completions.forEach((e) => {
      const monday = getMonday(e.date);
      weekCounts.set(monday, (weekCounts.get(monday) || 0) + 1);
    });
    let metWeeks = 0;
    weekCounts.forEach((count) => {
      if (count >= quest.target) metWeeks++;
    });
    const current = Math.min(metWeeks, target);
    return {
      current,
      target,
      percent: Math.round((current / target) * 100),
      unlocked: current >= target,
      unit: 'weeks',
    };
  }

  // daily: distinct days completed, toward 30
  const target = 30;
  const days = new Set(completions.map((e) => e.date));
  const current = Math.min(days.size, target);
  return {
    current,
    target,
    percent: Math.round((current / target) * 100),
    unlocked: current >= target,
    unit: 'days',
  };
}

// ---------------------------------------------------------
// MOCK / SEED DATA
// A small, deterministic starter save so a fresh visitor sees a living
// character rather than an empty page.
// ---------------------------------------------------------
export function getMockSaveData(dateStr: string): {
  userName: string;
  userClass: UserClass;
  quests: Quest[];
  ledger: LedgerEntry[];
} {
  const userClass: UserClass = 'scholar';
  const createdAt = getDaysAgoStr(dateStr, 30);

  const mk = (
    id: string,
    title: string,
    stat: StatType,
    difficulty: QuestDifficulty,
    type: QuestType,
    target: number,
    tier: number,
    description: string,
  ): Quest => ({ id, title, stat, difficulty, type, target, active: true, createdAt, tier, description });

  // The playbook's opening build (sleep + body + mind + money), plus a couple
  // of Tier I nodes from Soul and Hobbies to round out the character.
  const quests: Quest[] = [
    mk(
      'mock_sleep',
      'Fix sleep (7–8h)',
      'body',
      'normal',
      'daily',
      1,
      0,
      'The root node. Fixed wake time daily (±30 min), bed alarm 8h before, no screens 30 min prior, no caffeine after 2 PM, morning daylight. Unlock: 30 days.',
    ),
    mk(
      'mock_read',
      'Read 10 pages',
      'mind',
      'easy',
      'daily',
      1,
      1,
      'Start the Reading Ladder (Atomic Habits first). ~15 min. Never zero — one page on a bad day. Unlock: 30 days.',
    ),
    mk(
      'mock_expenses',
      'Track every expense',
      'career',
      'easy',
      'daily',
      1,
      1,
      'Log everything for 30 days — no judgment, just data. The leaks become obvious. Unlock: 30 days, nothing untracked.',
    ),
    mk(
      'mock_strength',
      'Strength train',
      'body',
      'normal',
      'weekly',
      3,
      2,
      'Full-body, 3 non-consecutive days. Compound lifts, 3×5–8 reps, progress a little each time. Unlock: ~12 sessions.',
    ),
    mk(
      'mock_journal',
      '5-min journal',
      'spirit',
      'easy',
      'daily',
      1,
      1,
      'Morning or night. Three lines: what happened, how you feel, what matters today. Unlock: 30 days.',
    ),
    mk(
      'mock_craft',
      'Pick a craft',
      'hobby',
      'easy',
      'milestone',
      1,
      1,
      'One creative outlet chosen because it pulls you, not because it’s useful. Commit for 30 days.',
    ),
  ];

  const ledger: LedgerEntry[] = [];

  // Deterministic completion pattern over the last 14 days for the dailies,
  // plus a couple of weekly logs, so streaks and charts have something to show.
  const dailyQuests = quests.filter((q) => q.type === 'daily');
  for (let i = 13; i >= 0; i--) {
    const date = getDaysAgoStr(dateStr, i);
    dailyQuests.forEach((q, qi) => {
      // Skip a few days per quest to create realistic (imperfect) streaks.
      const skip = (i + qi) % 5 === 0;
      if (skip) return;
      ledger.push({
        id: `mock_${q.id}_${date}`,
        date,
        questId: q.id,
        questTitle: q.title,
        xp: calculateQuestXp(q.difficulty, q.type, q.stat, userClass),
        stat: q.stat,
        difficulty: q.difficulty,
        type: q.type,
      });
    });
  }

  // Weekly quest completions across the current week.
  const strength = quests.find((q) => q.id === 'mock_strength')!;
  [1, 3, 5].forEach((offset) => {
    const date = getDaysAgoStr(dateStr, offset);
    ledger.push({
      id: `mock_${strength.id}_${date}`,
      date,
      questId: strength.id,
      questTitle: strength.title,
      xp: calculateQuestXp(strength.difficulty, strength.type, strength.stat, userClass),
      stat: strength.stat,
      difficulty: strength.difficulty,
      type: strength.type,
    });
  });

  return { userName: 'Abdallah', userClass, quests, ledger };
}
