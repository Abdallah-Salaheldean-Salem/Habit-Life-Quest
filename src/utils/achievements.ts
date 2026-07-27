/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Debuff, FrictionItem, LedgerEntry, Quest, StatType, TraitGoal, TriggerEvent } from '../types';

export interface AchievementContext {
  ledger: LedgerEntry[];
  quests: Quest[];
  level: number;
  statRanks: Record<StatType, number>;
  getQuestStreak: (q: Quest) => number;
  frictionItems: FrictionItem[];
  debuffs: Debuff[];
  triggerEvents: TriggerEvent[];
  traitGoals: TraitGoal[];
  /** Current consecutive-day streak of resisting at least one cue. */
  resistStreak: number;
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

/** Ledger entries that are actual quest completions (not module XP). */
const questCompletions = (ledger: LedgerEntry[]): number =>
  ledger.filter((e) => e.kind !== 'friction' && e.kind !== 'debuff' && e.kind !== 'trait').length;

const bestQuestStreak = (ctx: AchievementContext): number =>
  ctx.quests.reduce((best, q) => Math.max(best, ctx.getQuestStreak(q)), 0);

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_steps',
    numIcon: 'I',
    title: 'First Steps',
    description: 'Clear your very first quest.',
    check: (ctx) => questCompletions(ctx.ledger) >= 1,
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
    check: (ctx) => questCompletions(ctx.ledger) >= 50,
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
    check: (ctx) => questCompletions(ctx.ledger) >= 100,
  },
  {
    id: 'iron_will',
    numIcon: 'XII',
    title: 'Iron Will',
    description: 'Reach a 30-day streak on any quest — a node unlocked.',
    check: (ctx) => bestQuestStreak(ctx) >= 30,
  },
  {
    id: 'architect',
    numIcon: 'XIII',
    title: 'Architect',
    description: 'Complete 10 environment changes — design beats willpower.',
    check: (ctx) => ctx.frictionItems.filter((f) => f.done).length >= 10,
  },
  {
    id: 'cartographer',
    numIcon: 'XIV',
    title: 'Cartographer',
    description: 'Map a debuff to the point of naming its job — then start quitting.',
    check: (ctx) => ctx.debuffs.some((d) => d.stage !== 'mapping'),
  },
  {
    id: 'tide_walker',
    numIcon: 'XV',
    title: 'Tide Walker',
    description: 'Surf 25 urges without acting — every wave peaks and passes.',
    check: (ctx) =>
      ctx.triggerEvents.filter((t) => t.precededBy === 'urge' && !t.acted).length >= 25,
  },
  {
    id: 'honest_ledger',
    numIcon: 'XVI',
    title: 'Honest Ledger',
    description: 'Debrief a lapse instead of hiding it — the total never resets.',
    check: (ctx) => ctx.triggerEvents.some((t) => t.precededBy === 'lapse'),
  },
  {
    id: 'becoming',
    numIcon: 'XVII',
    title: 'Becoming',
    description: 'Bind a trait to two habits — rehearse the person you want to be.',
    check: (ctx) => ctx.traitGoals.some((g) => g.questIds.length >= 2),
  },
  {
    id: 'self_author',
    numIcon: 'XVIII',
    title: 'Self-Author',
    description: 'Log three six-week trait check-ins — proof a personality can move.',
    check: (ctx) => ctx.traitGoals.reduce((n, g) => n + g.checkins.length, 0) >= 3,
  },
  {
    id: 'unshaken',
    numIcon: 'XIX',
    title: 'Unshaken',
    description: 'Reach a 7-day cue-resisting streak — the wave keeps breaking, you keep standing.',
    check: (ctx) => ctx.resistStreak >= 7,
  },
  {
    id: 'cue_breaker',
    numIcon: 'XX',
    title: 'Cue Breaker',
    description: 'Resist 50 cues in all — each a rep that rewires the habit.',
    check: (ctx) => ctx.triggerEvents.filter((t) => t.acted === false).length >= 50,
  },
];
