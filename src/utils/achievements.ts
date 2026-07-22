/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LedgerEntry, Quest, StatType } from '../types';

export interface AchievementContext {
  ledger: LedgerEntry[];
  quests: Quest[];
  level: number;
  statRanks: Record<StatType, number>;
  getQuestStreak: (q: Quest) => number;
}

export interface Achievement {
  id: string;
  /** Short glyph shown in the achievement circle (roman numeral by default). */
  numIcon: string;
  title: string;
  description: string;
  check: (ctx: AchievementContext) => boolean;
}

const totalXp = (ledger: LedgerEntry[]): number =>
  ledger.reduce((sum, e) => sum + e.xp, 0);

const bestQuestStreak = (ctx: AchievementContext): number =>
  ctx.quests.reduce((best, q) => Math.max(best, ctx.getQuestStreak(q)), 0);

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_steps',
    numIcon: 'I',
    title: 'First Steps',
    description: 'Clear your very first quest.',
    check: (ctx) => ctx.ledger.length >= 1,
  },
  {
    id: 'getting_consistent',
    numIcon: 'II',
    title: 'Getting Consistent',
    description: 'Reach a 3-day streak on any quest.',
    check: (ctx) => bestQuestStreak(ctx) >= 3,
  },
  {
    id: 'unbroken',
    numIcon: 'III',
    title: 'Unbroken',
    description: 'Reach a 7-day streak on any quest.',
    check: (ctx) => bestQuestStreak(ctx) >= 7,
  },
  {
    id: 'apprentice',
    numIcon: 'IV',
    title: 'Apprentice',
    description: 'Reach character level 5.',
    check: (ctx) => ctx.level >= 5,
  },
  {
    id: 'veteran',
    numIcon: 'V',
    title: 'Veteran',
    description: 'Reach character level 10.',
    check: (ctx) => ctx.level >= 10,
  },
  {
    id: 'dedicated',
    numIcon: 'VI',
    title: 'Dedicated',
    description: 'Log 50 quest completions.',
    check: (ctx) => ctx.ledger.length >= 50,
  },
  {
    id: 'millennial_xp',
    numIcon: 'VII',
    title: 'Thousand Trials',
    description: 'Accumulate 1,000 total XP.',
    check: (ctx) => totalXp(ctx.ledger) >= 1000,
  },
  {
    id: 'balanced_soul',
    numIcon: 'VIII',
    title: 'Balanced Soul',
    description: 'Reach rank 1 or higher in every stat.',
    check: (ctx) => (Object.values(ctx.statRanks) as number[]).every((r) => r >= 1),
  },
  {
    id: 'body_master',
    numIcon: 'IX',
    title: 'Ironbound',
    description: 'Reach Body rank 3.',
    check: (ctx) => ctx.statRanks.body >= 3,
  },
  {
    id: 'mind_master',
    numIcon: 'X',
    title: 'Enlightened',
    description: 'Reach Mind rank 3.',
    check: (ctx) => ctx.statRanks.mind >= 3,
  },
  {
    id: 'completionist',
    numIcon: 'XI',
    title: 'Completionist',
    description: 'Log 100 quest completions.',
    check: (ctx) => ctx.ledger.length >= 100,
  },
  {
    id: 'iron_will',
    numIcon: 'XII',
    title: 'Iron Will',
    description: 'Reach a 30-day streak on any quest — a node unlocked.',
    check: (ctx) => bestQuestStreak(ctx) >= 30,
  },
];
