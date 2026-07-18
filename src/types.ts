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

export const STATS: Record<StatType, StatConfig> = {
  body: {
    name: 'Body',
    covers: 'movement, sleep, food',
    color: '#34d399', // Emerald/Green
    textClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30'
  },
  mind: {
    name: 'Mind',
    covers: 'study, reading, focus',
    color: '#60a5fa', // Blue
    textClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30'
  },
  spirit: {
    name: 'Spirit',
    covers: 'calm, connection, rest',
    color: '#c084fc', // Purple
    textClass: 'text-purple-400',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/30'
  },
  career: {
    name: 'Career',
    covers: 'work, craft, ambition',
    color: '#fb923c', // Orange
    textClass: 'text-orange-400',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/30'
  },
  hobby: {
    name: 'Hobby',
    covers: 'play, making, joy',
    color: '#f472b6', // Pink
    textClass: 'text-pink-400',
    bgClass: 'bg-pink-500/10',
    borderClass: 'border-pink-500/30'
  }
};

export const CLASSES: Record<UserClass, { name: string; affinity: StatType; description: string }> = {
  warrior: { name: 'Warrior', affinity: 'body', description: 'Gently focused on bodily movement, sleep, and nourishment.' },
  scholar: { name: 'Scholar', affinity: 'mind', description: 'Gently focused on studying, reading, and deep concentration.' },
  monk: { name: 'Monk', affinity: 'spirit', description: 'Gently focused on mindfulness, connection, and restorative calm.' },
  guildmaster: { name: 'Guildmaster', affinity: 'career', description: 'Gently focused on productive work, professional crafts, and ambitions.' },
  bard: { name: 'Bard', affinity: 'hobby', description: 'Gently focused on playful hobbies, creative making, and joyful arts.' }
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
