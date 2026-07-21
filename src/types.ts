/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ---------------------------------------------------------
// CORE ENUMS
// ---------------------------------------------------------
export type StatType = 'body' | 'mind' | 'career' | 'spirit' | 'hobby';
export type QuestType = 'daily' | 'weekly' | 'milestone';
export type QuestDifficulty = 'easy' | 'normal' | 'hard';
export type UserClass = 'warrior' | 'scholar' | 'monk' | 'guildmaster' | 'bard';

// ---------------------------------------------------------
// STAT CONFIGURATION
// The five life stats a hero cultivates. Each carries a colour used
// throughout the sigil, radar, progress bars and quest accents.
// ---------------------------------------------------------
export interface StatConfig {
  name: string;
  color: string;
  /** Tailwind text-colour utility matching `color`. */
  textClass: string;
  /** Short description of what this stat covers. */
  covers: string;
}

export const STATS: Record<StatType, StatConfig> = {
  body: {
    name: 'Body',
    color: '#10b981',
    textClass: 'text-emerald-400',
    covers: 'health · fitness · energy',
  },
  mind: {
    name: 'Mind',
    color: '#3b82f6',
    textClass: 'text-blue-400',
    covers: 'learning · focus · study',
  },
  career: {
    name: 'Career',
    color: '#f59e0b',
    textClass: 'text-amber-400',
    covers: 'work · money · growth',
  },
  spirit: {
    name: 'Spirit',
    color: '#a855f7',
    textClass: 'text-purple-400',
    covers: 'calm · gratitude · soul',
  },
  hobby: {
    name: 'Hobby',
    color: '#ec4899',
    textClass: 'text-pink-400',
    covers: 'craft · play · passion',
  },
};

// ---------------------------------------------------------
// CLASS CONFIGURATION
// Each class grants bonus XP on a single stat's quests.
// ---------------------------------------------------------
export interface ClassConfig {
  name: string;
  bonusStat: StatType;
  description: string;
}

export const CLASSES: Record<UserClass, ClassConfig> = {
  warrior: { name: 'Warrior', bonusStat: 'body', description: 'Bonus XP on Body quests' },
  scholar: { name: 'Scholar', bonusStat: 'mind', description: 'Bonus XP on Mind quests' },
  monk: { name: 'Monk', bonusStat: 'spirit', description: 'Bonus XP on Spirit quests' },
  guildmaster: { name: 'Guildmaster', bonusStat: 'career', description: 'Bonus XP on Career quests' },
  bard: { name: 'Bard', bonusStat: 'hobby', description: 'Bonus XP on Hobby quests' },
};

// ---------------------------------------------------------
// DATA MODELS
// ---------------------------------------------------------
export interface Quest {
  id: string;
  title: string;
  stat: StatType;
  difficulty: QuestDifficulty;
  type: QuestType;
  /** Weekly completion target. Dailies/milestones use 1. */
  target: number;
  /** Archived quests set this to false but keep their ledger history. */
  active: boolean;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  /** ISO date string, YYYY-MM-DD. */
  date: string;
  questId: string;
  questTitle: string;
  xp: number;
  stat: StatType;
  difficulty: QuestDifficulty;
  type: QuestType;
}

/** Shape used by the local JSON export/import. */
export interface SaveState {
  version: number;
  userName: string;
  userClass: UserClass;
  quests: Quest[];
  ledger: LedgerEntry[];
  createdAt: string;
}
