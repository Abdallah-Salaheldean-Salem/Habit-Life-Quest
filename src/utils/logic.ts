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
// XP values per the Life Skill Tree v2 tables.
const DIFFICULTY_XP: Record<QuestDifficulty, number> = {
  easy: 10,
  normal: 25,
  hard: 50,
};

const TYPE_MULTIPLIER: Record<QuestType, number> = {
  daily: 1,
  weekly: 1.5,
  milestone: 3,
};

// Class affinity: +20% on the class's stat.
const CLASS_BONUS = 1.2;

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
// Levelling curve per v2: each level costs 100 × 1.25^(level-1) XP, so the
// grind compounds the way the campaign's progression table assumes.
// ---------------------------------------------------------
function levelCost(level: number): number {
  return Math.round(100 * Math.pow(1.25, level - 1));
}

export function getLevelAndProgress(totalXp: number): {
  level: number;
  currentXp: number;
  nextLevelCost: number;
} {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  let cost = levelCost(level);

  while (remaining >= cost) {
    remaining -= cost;
    level++;
    cost = levelCost(level);
  }

  return { level, currentXp: remaining, nextLevelCost: cost };
}

// Title ladder aligned to the v2 progression checkpoints
// (~L8–10 by month 3, ~L13–15 by month 6, ~L18–19 by month 12, ~L22–24 by month 24).
export function getCharacterTitle(level: number): string {
  if (level >= 24) return 'Hero';
  if (level >= 19) return 'Champion';
  if (level >= 15) return 'Veteran';
  if (level >= 10) return 'Hardened';
  if (level >= 6) return 'Seasoned';
  if (level >= 3) return 'Initiate';
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
  const createdAt = getDaysAgoStr(dateStr, 45);

  // Titles match the skill-tree nodes exactly so the tree's progressive reveal
  // and per-node status ("mastered" / "on board") line up with the save.
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

  const quests: Quest[] = [
    // Season 1 opening build — seeded as already mastered (31 days), so their
    // branches have revealed Tier II.
    mk('mock_sleep', 'Sleep 7–8h, fixed wake', 'body', 'normal', 'daily', 1, 1, 'Fixed wake time first — it anchors everything. Daylight within 30 min of waking, no caffeine after 2 PM. Unlock: 30 days within ±30 min.'),
    mk('mock_read', 'Read 10 pages', 'mind', 'easy', 'daily', 1, 1, 'Start the Reading Ladder (Atomic Habits first). ~15 min. Never zero — one page on a bad day. Unlock: 30 days.'),
    mk('mock_expenses', 'Track every expense', 'career', 'easy', 'daily', 1, 1, 'Log everything for 30 days — no judgment, just data. The leaks become obvious. Unlock: 30 days, nothing untracked.'),
    // Tier II node newly revealed and being built.
    mk('mock_strength', 'Strength train', 'body', 'normal', 'weekly', 3, 2, 'Full-body, 3 non-consecutive days. Compound lifts, 3×5–8 reps, progress a little each time. Unlock: 12 sessions.'),
    // Branches still at Tier I (not yet mastered) — Tier II stays locked.
    mk('mock_journal', '5-minute journal', 'spirit', 'easy', 'daily', 1, 1, 'Three lines: what happened, how you feel, what matters today. Unlock: 30 days.'),
    mk('mock_craft', 'Pick ONE creative outlet', 'hobby', 'easy', 'milestone', 1, 1, 'One creative outlet chosen because it pulls you, not because it’s useful. Unlock: committed 30 days.'),
  ];

  const ledger: LedgerEntry[] = [];
  const log = (q: Quest, date: string) =>
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

  const byId = (id: string) => quests.find((q) => q.id === id)!;

  // Opening three dailies: 31 straight days → mastered (reveals their Tier II).
  const opening = ['mock_sleep', 'mock_read', 'mock_expenses'].map(byId);
  for (let i = 30; i >= 0; i--) {
    const date = getDaysAgoStr(dateStr, i);
    opening.forEach((q) => log(q, date));
  }

  // Journal: ~12 recent days (in progress, not mastered).
  const journal = byId('mock_journal');
  for (let i = 13; i >= 0; i--) {
    if (i % 6 === 0) continue;
    log(journal, getDaysAgoStr(dateStr, i));
  }

  // Strength: a few sessions across two weeks (in progress, not mastered).
  const strength = byId('mock_strength');
  [1, 3, 5, 8, 10].forEach((offset) => log(strength, getDaysAgoStr(dateStr, offset)));

  return { userName: 'Abdallah', userClass, quests, ledger };
}
