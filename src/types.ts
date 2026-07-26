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
    covers: 'movement · sleep · food',
  },
  mind: {
    name: 'Mind',
    color: '#3b82f6',
    textClass: 'text-blue-400',
    covers: 'study · reading · focus',
  },
  career: {
    name: 'Career',
    color: '#f59e0b',
    textClass: 'text-amber-400',
    covers: 'work · craft · ambition',
  },
  spirit: {
    name: 'Spirit',
    color: '#a855f7',
    textClass: 'text-purple-400',
    covers: 'calm · connection · rest',
  },
  hobby: {
    name: 'Hobby',
    color: '#ec4899',
    textClass: 'text-pink-400',
    covers: 'play · making · joy',
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
  /** Optional guidance / unlock criteria for the quest (from the Life Skill Tree playbook). */
  description?: string;
  /** Skill-tree tier: 1 (foundational) → 3 (advanced). */
  tier?: number;
  /**
   * Implementation intention — roughly doubles follow-through. Required for
   * daily quests: a vague quest is a quest that fails.
   */
  intention?: QuestIntention;
}

export interface QuestIntention {
  /** The cue that triggers it, e.g. "after I finish dinner". */
  cue: string;
  /** Where it happens, e.g. "the living-room chair". */
  location: string;
  /** The never-zero fallback done on a bad day, e.g. "one page". */
  minVersion: string;
  /** Another quest this one stacks onto (optional). */
  anchorId?: string;
}

/** The shape used when drafting a new quest (before it is persisted). */
export type QuestDraft = Omit<Quest, 'id' | 'createdAt' | 'active'>;

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
  /**
   * How the XP was earned. 'full' is a normal completion; 'minimum' is the
   * never-zero fallback (40% XP) that still preserves the streak; 'friction'
   * is a one-time environment change (not a quest completion). Legacy entries
   * with no kind are treated as 'full'. 'debuff' and 'trait' are XP from the
   * behavior-change modules, not quest completions.
   */
  kind?: 'full' | 'minimum' | 'friction' | 'debuff' | 'trait';
}

/**
 * One environment-design change tied to a quest. Reducing friction beats
 * willpower; adding friction helps break a behavior. Completing one is worth
 * XP because a one-time change beats a day of resisting.
 */
export interface FrictionItem {
  id: string;
  questId: string;
  text: string;
  done: boolean;
  kind: 'reduce' | 'add';
}

// ---------------------------------------------------------
// ADDICTION / DEBUFF ENGINE
// A Debuff is a behavior you're removing (not a habit you're building). It
// moves through mapping → active → maintenance. Its most sensitive data —
// trigger logs and the lapse plan — can be kept on-device only.
// ---------------------------------------------------------
export interface CueRemoval {
  id: string;
  text: string;
  done: boolean;
}

export interface Debuff {
  id: string;
  name: string;
  stage: 'mapping' | 'active' | 'maintenance';
  /** The need it serves — filled after mapping. (`function` is intentional per the spec.) */
  function?: string;
  /** What fills that need instead — required to leave mapping. */
  replacement?: string;
  cueRemovals: CueRemoval[];
  mode: 'abstinence' | 'moderation';
  /** ISO date the current clean streak began. */
  cleanSince: string;
  /** Cumulative clean days across all streaks — never resets on a lapse. */
  totalCleanDays: number;
  /** The user's own pre-committed lapse plan, written during mapping. */
  lapsePlan: string;
  /** True when the name matched a substance with dangerous withdrawal. */
  needsMedicalNotice?: boolean;
  createdAt: string;
}

export interface TriggerEvent {
  id: string;
  debuffId: string;
  /** ISO date the event was logged. */
  at: string;
  place: string;
  mood: string;
  precededBy: string;
  /** Did the urge win? */
  acted: boolean;
  intensity: 1 | 2 | 3 | 4 | 5;
  /** For a surfed urge: intensity after the timer, to chart the decay. */
  intensityAfter?: 1 | 2 | 3 | 4 | 5;
}

// ---------------------------------------------------------
// TRAIT / PERSONALITY ENGINE
// Personality changes through sustained behavior, not intention. A TraitGoal
// picks one Big-Five facet to strengthen, binds it to at least two quests
// (the "role" you rehearse daily), and re-measures on a six-week cadence —
// long enough for a real slope to show.
// ---------------------------------------------------------
export type TraitId =
  | 'conscientiousness'
  | 'openness'
  | 'extraversion'
  | 'agreeableness'
  | 'stability';

export interface TraitConfig {
  name: string;
  /** The facets a user can choose to strengthen. */
  facets: string[];
  /** One-line description of what moving this trait feels like. */
  blurb: string;
}

export const TRAITS: Record<TraitId, TraitConfig> = {
  conscientiousness: {
    name: 'Conscientiousness',
    facets: ['Industriousness', 'Orderliness', 'Self-Discipline'],
    blurb: 'Showing up, finishing, keeping order — the trait that most predicts a life going well.',
  },
  openness: {
    name: 'Openness',
    facets: ['Curiosity', 'Creativity', 'Depth'],
    blurb: 'Seeking the new idea, the harder book, the unfamiliar path.',
  },
  extraversion: {
    name: 'Extraversion',
    facets: ['Assertiveness', 'Enthusiasm', 'Sociability'],
    blurb: 'Speaking up, reaching out, bringing energy into a room.',
  },
  agreeableness: {
    name: 'Agreeableness',
    facets: ['Compassion', 'Politeness', 'Trust'],
    blurb: 'Warmth and good faith — being someone others can lean on.',
  },
  stability: {
    name: 'Emotional Stability',
    facets: ['Even Temper', 'Resilience', 'Contentment'],
    blurb: 'Riding out the storm without being swept away by it.',
  },
};

/** A single six-week self-rating of how strongly a facet is felt (1–5). */
export interface TraitCheckin {
  id: string;
  /** ISO date the check-in was logged. */
  at: string;
  score: 1 | 2 | 3 | 4 | 5;
}

export interface TraitGoal {
  id: string;
  trait: TraitId;
  /** The specific facet being strengthened, e.g. "Industriousness". */
  facet: string;
  /** The identity the user is rehearsing — "I am someone who…". */
  role: string;
  /** The quests that enact this trait — at least two are required. */
  questIds: string[];
  /** Six-week slope measurements, oldest first. */
  checkins: TraitCheckin[];
  createdAt: string;
}

/** Shape used by the local JSON export/import. */
export interface SaveState {
  version: number;
  userName: string;
  userClass: UserClass;
  quests: Quest[];
  ledger: LedgerEntry[];
  createdAt: string;
  frictionItems?: FrictionItem[];
  debuffs?: Debuff[];
  triggerEvents?: TriggerEvent[];
  traitGoals?: TraitGoal[];
  /** Soft-delete tombstones: ids removed on this device so a sync can't resurrect them. */
  deletedIds?: string[];
  /** True once a real character exists — "today" tracks the real date instead of the demo's frozen clock. */
  liveClock?: boolean;
}
