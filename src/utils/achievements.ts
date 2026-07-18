/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Achievement, StatType, Quest } from '../types';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_step',
    title: 'First Step',
    description: 'Clear your first quest',
    numIcon: 'I',
    check: ({ ledger }) => ledger.length >= 1,
  },
  {
    id: 'weeklong',
    title: 'Weeklong',
    description: 'Hold a 7-day streak',
    numIcon: 'VII',
    check: ({ ledger, quests, getQuestStreak }) => {
      // Check if any active daily quest has a streak of 7+ or if the app-wide daily streak is 7+
      const dailyQuests = quests.filter((q) => q.active && q.type === 'daily');
      const hasQuestStreak = dailyQuests.some((q) => getQuestStreak(q) >= 7);
      return hasQuestStreak;
    },
  },
  {
    id: 'fortnight',
    title: 'Fortnight',
    description: 'Hold a 14-day streak',
    numIcon: 'XIV',
    check: ({ ledger, quests, getQuestStreak }) => {
      const dailyQuests = quests.filter((q) => q.active && q.type === 'daily');
      const hasQuestStreak = dailyQuests.some((q) => getQuestStreak(q) >= 14);
      return hasQuestStreak;
    },
  },
  {
    id: 'iron_will',
    title: 'Iron Will',
    description: 'Hold a 30-day streak',
    numIcon: 'XXX',
    check: ({ ledger, quests, getQuestStreak }) => {
      const dailyQuests = quests.filter((q) => q.active && q.type === 'daily');
      const hasQuestStreak = dailyQuests.some((q) => getQuestStreak(q) >= 30);
      return hasQuestStreak;
    },
  },
  {
    id: 'four_moons',
    title: 'Four Moons',
    description: 'Hit a weekly target 4 weeks running',
    numIcon: '☾',
    check: ({ quests, getQuestStreak }) => {
      const weeklyQuests = quests.filter((q) => q.active && q.type === 'weekly');
      return weeklyQuests.some((q) => getQuestStreak(q) >= 4);
    },
  },
  {
    id: 'landmark',
    title: 'Landmark',
    description: 'Clear your first milestone',
    numIcon: '◆',
    check: ({ ledger }) => ledger.some((entry) => entry.type === 'milestone'),
  },
  {
    id: 'adept',
    title: 'Adept',
    description: 'Reach level 5',
    numIcon: 'V',
    check: ({ level }) => level >= 5,
  },
  {
    id: 'hardened',
    title: 'Hardened',
    description: 'Reach level 10',
    numIcon: 'X',
    check: ({ level }) => level >= 10,
  },
  {
    id: 'perfect_day',
    title: 'Perfect Day',
    description: 'Clear every daily in one day',
    numIcon: '★',
    check: ({ ledger, quests }) => {
      // Group ledger daily entries by date
      const dailyCompletionsByDate: Record<string, Set<string>> = {};
      for (const entry of ledger) {
        if (entry.type === 'daily') {
          if (!dailyCompletionsByDate[entry.date]) {
            dailyCompletionsByDate[entry.date] = new Set();
          }
          dailyCompletionsByDate[entry.date].add(entry.questId);
        }
      }

      // We need at least one daily quest to have existed
      const activeDailies = quests.filter((q) => q.active && q.type === 'daily');
      if (activeDailies.length === 0) return false;

      // Check if for any date, the user cleared all daily quests that were active then
      // To keep it clean, we check if the user cleared all currently active daily quests on any single date
      for (const date in dailyCompletionsByDate) {
        const completedIdsForDate = dailyCompletionsByDate[date];
        const allCleared = activeDailies.every((q) => completedIdsForDate.has(q.id));
        if (allCleared) return true;
      }

      return false;
    },
  },
  {
    id: 'centurion',
    title: 'Centurion',
    description: 'Clear 100 quests total',
    numIcon: 'C',
    check: ({ ledger }) => ledger.length >= 100,
  },
  {
    id: 'polymath',
    title: 'Polymath',
    description: 'Rank 3 in all five stats',
    numIcon: '✦',
    check: ({ statRanks }) => {
      const stats: StatType[] = ['body', 'mind', 'spirit', 'career', 'hobby'];
      return stats.every((s) => (statRanks[s] || 0) >= 3);
    },
  },
];
