/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LedgerEntry, StatType } from '../types';
import { getStatRank, getDaysAgoStr, getMonday } from './logic';
import { computeShields } from './shields';

// ---------------------------------------------------------
// HERO LEGENDS
// Each default hero grows in their own way, in four chapters. A hero has three
// upgrades, and each one climbs the chapters on its own, earned by a habit
// that fits that hero (a stat's rank, a count of quests, a streak, perfect
// weeks, Campfire reflections). The hero's chapter is the one all three have
// reached. Everything is derived from the ledger, so it needs no save data,
// can't drift between devices, and counts the past.
// ---------------------------------------------------------

export type Tier = 0 | 1 | 2 | 3;
export type LegendTiers = [Tier, Tier, Tier];

/** A habit an upgrade is earned by. */
export type Metric =
  | { kind: 'rank'; stat: StatType }
  | { kind: 'quests'; stat: StatType }
  | { kind: 'streak' }
  | { kind: 'perfectWeeks' }
  | { kind: 'reflections' };

export interface Track {
  id: string;
  label: string;
  metric: Metric;
  /** Values needed for chapters II, III and IV. */
  steps: [number, number, number];
  /** The piece's name at each chapter. */
  names: [string, string, string, string];
}

export interface Legend {
  /** The hero look this legend belongs to (see data/classHeroes). */
  lookId: string;
  title: string;
  stat: StatType;
  chapters: [string, string, string, string];
  lines: [string, string, string, string];
  tracks: [Track, Track, Track];
}

const rank = (stat: StatType): Metric => ({ kind: 'rank', stat });
const quests = (stat: StatType): Metric => ({ kind: 'quests', stat });
const STREAK: Metric = { kind: 'streak' };
const WEEKS: Metric = { kind: 'perfectWeeks' };
const RANKS: [number, number, number] = [3, 6, 10];
const COUNTS: [number, number, number] = [25, 100, 300];
const DAYS: [number, number, number] = [7, 30, 100];
const PERFECT: [number, number, number] = [1, 4, 12];

export const LEGENDS: Legend[] = [
  {
    lookId: 'shield-guardian',
    title: 'The Oath of the Wall',
    stat: 'body',
    chapters: ['Recruit', 'Sentinel', 'Warden', 'Bulwark of Dawn'],
    lines: [
      'A wooden shield and a plain helm. Holds the line, barely.',
      'Iron-rimmed shield, a painted crest. Small wings on the helm.',
      'The crest lights up. A ward hums behind the shield.',
      'Great gilded wings. The ward becomes a wall, and allies stand with you.',
    ],
    tracks: [
      { id: 'shield', label: 'Shield', metric: rank('body'), steps: RANKS, names: ['Wooden Shield', 'Iron-rimmed Shield', "Warden's Crest", 'Radiant Aegis'] },
      { id: 'helm', label: 'Helm', metric: STREAK, steps: DAYS, names: ['Plain Helm', 'Sentinel Wings', 'Warden Wings', 'Gilded Wings of Dawn'] },
      { id: 'ward', label: 'Ward', metric: WEEKS, steps: PERFECT, names: ['No Ward Yet', 'Pennant of the Oath', 'Humming Ward', 'The Wall & Allies'] },
    ],
  },
  {
    lookId: 'tome-keeper',
    title: 'The Rune Ledger',
    stat: 'mind',
    chapters: ['Scribe', 'Lorekeeper', 'Runebinder', 'Keeper of the Ledger'],
    lines: [
      'A plain notebook. One rune, barely glowing.',
      'A leather tome. Runes start to rise from its pages.',
      'The runes form words. The hood begins to fray into starlight.',
      'A circle of runes turns around you. The pages fly free.',
    ],
    tracks: [
      { id: 'tome', label: 'Tome', metric: rank('mind'), steps: RANKS, names: ['Plain Notebook', 'Leather Tome', 'Gilded Grimoire', 'The Living Ledger'] },
      { id: 'runes', label: 'Runes', metric: quests('mind'), steps: COUNTS, names: ['One Rune', 'Rising Runes', 'Rune Words', 'The Rune Circle'] },
      { id: 'hood', label: 'Hood', metric: STREAK, steps: DAYS, names: ['Wool Hood', 'Starlit Hem', 'Fraying into Starlight', 'Hood of the Night Sky'] },
    ],
  },
  {
    lookId: 'floating-sage',
    title: 'The Stillness Path',
    stat: 'spirit',
    chapters: ['Novice', 'Disciple', 'Master', 'Ascended'],
    lines: [
      'Sits on a bare mat. Wooden beads, a restless mind.',
      'Rises a hand above the ground. The beads turn to jade.',
      'A lotus opens beneath. Markings wake on the skin.',
      'Free of the ground. The mandala turns. The eyes open.',
    ],
    tracks: [
      { id: 'beads', label: 'Beads', metric: rank('spirit'), steps: RANKS, names: ['Wooden Beads', 'Jade Beads', 'Golden Beads', 'Beads of Light'] },
      { id: 'markings', label: 'Markings', metric: { kind: 'reflections' }, steps: [10, 50, 150], names: ['Bare Skin', 'The Third Eye', 'Waking Markings', 'The Golden Sigil'] },
      { id: 'rising', label: 'Rising', metric: STREAK, steps: DAYS, names: ['On the Mat', 'A Hand Above', 'The Lotus', 'The Mandala'] },
    ],
  },
  {
    lookId: 'coin-baron',
    title: 'The Vault',
    stat: 'career',
    chapters: ['Peddler', 'Trader', 'Baron', 'Magnate'],
    lines: [
      'A walking stick and two coins to his name.',
      'A silver-topped cane. The coins start to stack.',
      'The gold-orbed cane. A chest at his feet; coins circle him.',
      'The chest spills over. A ledger and his seal float at hand.',
    ],
    tracks: [
      { id: 'cane', label: 'Cane', metric: rank('career'), steps: RANKS, names: ['Walking Stick', 'Silver-topped Cane', 'Gold-orbed Cane', 'Gilded Staff'] },
      { id: 'hoard', label: 'Hoard', metric: quests('career'), steps: COUNTS, names: ['Two Coins', 'Coin Stacks', 'The Chest', 'The Hoard'] },
      { id: 'ledger', label: 'Ledger & seal', metric: WEEKS, steps: PERFECT, names: ['No Office Yet', 'Chain of Office', 'Signet Ring', 'Ledger & Seal'] },
    ],
  },
  {
    lookId: 'lyre-minstrel',
    title: 'The Golden Strings',
    stat: 'hobby',
    chapters: ['Bard', 'Troubadour', 'Minstrel of Renown', 'The Golden Strings'],
    lines: [
      'A wooden lyre with three strings. A sparrow feather in the cap.',
      'Brass and five strings. A hawk feather.',
      'Gold and seven strings. A peacock feather; the cape is stitched with gold.',
      'The lyre plays itself. The feather burns like a phoenix.',
    ],
    tracks: [
      { id: 'lyre', label: 'Lyre', metric: rank('hobby'), steps: RANKS, names: ['Wooden Lyre', 'Brass Lyre', 'Golden Lyre', 'The Singing Lyre'] },
      { id: 'feather', label: 'Feather', metric: STREAK, steps: DAYS, names: ['Sparrow Feather', 'Hawk Feather', 'Peacock Feather', 'Phoenix Feather'] },
      { id: 'songs', label: 'Songs', metric: quests('hobby'), steps: COUNTS, names: ['A First Song', 'Notes in the Air', 'Gold-stitched Cape', 'A Sky of Song'] },
    ],
  },
];

export function legendFor(lookId: string | null | undefined): Legend | null {
  return LEGENDS.find((l) => l.lookId === lookId) ?? null;
}

// ---- Metrics ------------------------------------------------------------------

export interface LegendStats {
  statXp: Record<StatType, number>;
  statQuests: Record<StatType, number>;
  /** Longest run of kept days (shield-covered days count). */
  longestStreak: number;
  /** Completed Mon–Sun weeks with all seven days active. */
  perfectWeeks: number;
  reflections: number;
}

const STATS: StatType[] = ['body', 'mind', 'career', 'spirit', 'hobby'];

export function legendStats(ledger: LedgerEntry[], today: string): LegendStats {
  const statXp = Object.fromEntries(STATS.map((s) => [s, 0])) as Record<StatType, number>;
  const statQuests = Object.fromEntries(STATS.map((s) => [s, 0])) as Record<StatType, number>;
  const active = new Set<string>();
  let reflections = 0;
  for (const e of ledger) {
    if (e.date > today) continue;
    active.add(e.date);
    if (statXp[e.stat] !== undefined) statXp[e.stat] += e.xp;
    const kind = e.kind ?? 'full';
    if ((kind === 'full' || kind === 'minimum') && statQuests[e.stat] !== undefined) statQuests[e.stat]++;
    if (kind === 'reflection') reflections++;
  }

  // Longest streak, counting shield-covered days as kept.
  const kept = new Set([...active, ...computeShields(active, today).shieldedDates]);
  let longestStreak = 0;
  for (const d of kept) {
    if (kept.has(getDaysAgoStr(d, 1))) continue; // not the start of a run
    let n = 0;
    let cur = d;
    while (kept.has(cur)) {
      n++;
      cur = getDaysAgoStr(cur, -1);
    }
    longestStreak = Math.max(longestStreak, n);
  }

  // Perfect weeks: only finished weeks (the current week can't be judged yet).
  const thisMonday = getMonday(today);
  const weeks = new Map<string, number>();
  for (const d of active) {
    const m = getMonday(d);
    if (m < thisMonday) weeks.set(m, (weeks.get(m) ?? 0) + 1);
  }
  const perfectWeeks = [...weeks.values()].filter((n) => n === 7).length;

  return { statXp, statQuests, longestStreak, perfectWeeks, reflections };
}

export function metricValue(m: Metric, s: LegendStats): number {
  switch (m.kind) {
    case 'rank':
      return getStatRank(s.statXp[m.stat]);
    case 'quests':
      return s.statQuests[m.stat];
    case 'streak':
      return s.longestStreak;
    case 'perfectWeeks':
      return s.perfectWeeks;
    case 'reflections':
      return s.reflections;
  }
}

export function metricLabel(m: Metric): string {
  switch (m.kind) {
    case 'rank':
      return `${m.stat[0].toUpperCase()}${m.stat.slice(1)} rank`;
    case 'quests':
      return `${m.stat[0].toUpperCase()}${m.stat.slice(1)} quests`;
    case 'streak':
      return 'longest streak (days)';
    case 'perfectWeeks':
      return 'perfect weeks';
    case 'reflections':
      return 'Campfire reflections';
  }
}

export function tierFor(value: number, steps: [number, number, number]): Tier {
  return (steps.filter((s) => value >= s).length as Tier);
}

export interface TrackProgress {
  track: Track;
  tier: Tier;
  value: number;
  /** Value needed for the next chapter, or null at chapter IV. */
  next: number | null;
}

export interface LegendProgress {
  legend: Legend;
  tracks: [TrackProgress, TrackProgress, TrackProgress];
  tiers: LegendTiers;
  /** The chapter all three upgrades have reached (0–3). */
  chapter: Tier;
}

export function legendProgress(legend: Legend, stats: LegendStats): LegendProgress {
  const tracks = legend.tracks.map((track) => {
    const value = metricValue(track.metric, stats);
    const tier = tierFor(value, track.steps);
    return { track, tier, value, next: tier < 3 ? track.steps[tier as 0 | 1 | 2] : null };
  }) as [TrackProgress, TrackProgress, TrackProgress];
  const tiers = tracks.map((t) => t.tier) as LegendTiers;
  return { legend, tracks, tiers, chapter: Math.min(...tiers) as Tier };
}

export type LegendEvent =
  | { type: 'chapter'; chapter: Tier }
  | { type: 'piece'; track: Track; tier: Tier };

/** What changed since the tiers last seen: a new chapter, or pieces that climbed. */
export function legendEvents(prev: LegendTiers | null, next: LegendProgress): LegendEvent[] {
  if (!prev) return []; // first time seen: no fanfare for history
  const out: LegendEvent[] = [];
  const prevChapter = Math.min(...prev);
  if (next.chapter > prevChapter) out.push({ type: 'chapter', chapter: next.chapter });
  next.tracks.forEach((t, i) => {
    if (t.tier > prev[i]) out.push({ type: 'piece', track: t.track, tier: t.tier });
  });
  return out;
}
