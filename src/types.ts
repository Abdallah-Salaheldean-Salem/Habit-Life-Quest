/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StatType = 'body' | 'mind' | 'spirit' | 'career' | 'hobby';

export type QuestDifficulty = 'easy' | 'normal' | 'hard';

export type QuestType = 'daily' | 'weekly' | 'milestone';

export type UserClass = 'warrior' | 'scholar' | 'monk' | 'guildmaster' | 'bard';

export interface Quest {
  id: string;
  title: string;
  stat: StatType;
  difficulty: QuestDifficulty;
  type: QuestType;
  target: number; // For weekly: 1 to 7. For daily/milestone: 1.
  createdAt: string; // yyyy-mm-dd
  active: boolean; // False if archived/deleted
}

export interface LedgerEntry {
  id: string;
  date: string; // yyyy-mm-dd
  questId: string;
  questTitle: string;
  xp: number;
  stat: StatType;
  difficulty: QuestDifficulty;
  type: QuestType;
}

export interface SaveState {
  version: number;
  userName: string;
  userClass: UserClass;
  quests: Quest[];
  ledger: LedgerEntry[];
  createdAt: string;
}

export interface StatConfig {
  name: string;
  covers: string;
  color: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
}

// Muted dark-fantasy palette, matching the canonical Habit Quest stat colours.
export const STATS: Record<StatType, StatConfig> = {
  body: {
    name: 'Body',
    covers: 'movement, sleep, food',
    color: '#6FA88A', // muted green
    textClass: 'text-[#6FA88A]',
    bgClass: 'bg-[#6FA88A]/10',
    borderClass: 'border-[#6FA88A]/30'
  },
  mind: {
    name: 'Mind',
    covers: 'study, reading, focus',
    color: '#5B8FD6', // muted blue
    textClass: 'text-[#5B8FD6]',
    bgClass: 'bg-[#5B8FD6]/10',
    borderClass: 'border-[#5B8FD6]/30'
  },
  spirit: {
    name: 'Spirit',
    covers: 'calm, connection, rest',
    color: '#9B6FD0', // muted purple
    textClass: 'text-[#9B6FD0]',
    bgClass: 'bg-[#9B6FD0]/10',
    borderClass: 'border-[#9B6FD0]/30'
  },
  career: {
    name: 'Career',
    covers: 'work, craft, ambition',
    color: '#C2705A', // muted ember/orange
    textClass: 'text-[#C2705A]',
    bgClass: 'bg-[#C2705A]/10',
    borderClass: 'border-[#C2705A]/30'
  },
  hobby: {
    name: 'Hobby',
    covers: 'play, making, joy',
    color: '#D0708F', // muted rose/pink
    textClass: 'text-[#D0708F]',
    bgClass: 'bg-[#D0708F]/10',
    borderClass: 'border-[#D0708F]/30'
  }
};

export const CLASSES: Record<UserClass, { name: string; affinity: StatType; description: string }> = {
  warrior: { name: 'Warrior', affinity: 'body', description: 'Bonus XP on Body quests' },
  scholar: { name: 'Scholar', affinity: 'mind', description: 'Bonus XP on Mind quests' },
  monk: { name: 'Monk', affinity: 'spirit', description: 'Bonus XP on Spirit quests' },
  guildmaster: { name: 'Guildmaster', affinity: 'career', description: 'Bonus XP on Career quests' },
  bard: { name: 'Bard', affinity: 'hobby', description: 'Bonus XP on Hobby quests' }
};

export interface Achievement {
  id: string;
  title: string;
  description: string;
  numIcon?: string;
  check: (state: {
    ledger: LedgerEntry[];
    quests: Quest[];
    level: number;
    statRanks: Record<StatType, number>;
    getQuestStreak: (quest: Quest) => number;
  }) => boolean;
}
