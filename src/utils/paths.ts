/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ---------------------------------------------------------
// CUSTOM PATHS — the engine.
// A Path is a user-forged branch that plays by the built-in tree's rules:
// tiers I–VI (★), a tier reveals once a node in the tier before it is
// mastered, and a mastered node is history — it can be reworded but never
// deleted or moved, so the reward can't be gamed. Pure; App wires it to state.
// ---------------------------------------------------------

import { CustomPath, PathNode, Quest, QuestDraft, StatType } from '../types';
import { NODES } from '../data/lifeTree';
import { uid } from './id';

export const MAX_TIERS = 6;
export const MAX_NODES_PER_TIER = 4;
export const MAX_PATHS = 8;
export const NAME_MAX = 40;
export const TITLE_MAX = 60;

export type PathNodeStatus = 'mastered' | 'active' | 'available' | 'locked';

/** Stable id for a built-in Life Skill Tree node. */
export function lifeNodeId(n: { stat: StatType; title: string }): string {
  const slug = n.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `life:${n.stat}:${slug}`;
}

/**
 * Which node ids are on the board (active quest) and which are mastered,
 * from the quests that carry a nodeId. `isUnlocked` is the unlock rule
 * (getUnlockProgress in the app) so this stays pure.
 */
export function nodeSetsFromQuests(
  quests: Quest[],
  isUnlocked: (q: Quest) => boolean,
): { masteredNodeIds: Set<string>; activeNodeIds: Set<string> } {
  const masteredNodeIds = new Set<string>();
  const activeNodeIds = new Set<string>();
  for (const q of quests) {
    if (!q.nodeId) continue;
    if (q.active) activeNodeIds.add(q.nodeId);
    if (isUnlocked(q)) masteredNodeIds.add(q.nodeId);
  }
  return { masteredNodeIds, activeNodeIds };
}

/**
 * The first tier not yet cleared. A tier is cleared once any of its nodes is
 * mastered; tier I is always open. Empty tiers are skipped, so a path with
 * nodes only in I and III treats III as the next tier after I.
 */
export function pathFrontier(path: CustomPath, mastered: Set<string>): number {
  let cleared = 0;
  for (let tier = 1; tier <= MAX_TIERS; tier++) {
    const tierNodes = path.nodes.filter((n) => n.tier === tier);
    if (tierNodes.length === 0) continue;
    if (tierNodes.some((n) => mastered.has(n.id))) cleared = tier;
    else break;
  }
  // The frontier is the next tier that actually has nodes after `cleared`.
  for (let tier = cleared + 1; tier <= MAX_TIERS; tier++) {
    if (path.nodes.some((n) => n.tier === tier)) return tier;
  }
  return MAX_TIERS + 1; // everything cleared
}

export function nodeStatus(
  node: PathNode,
  path: CustomPath,
  mastered: Set<string>,
  active: Set<string>,
): PathNodeStatus {
  if (mastered.has(node.id)) return 'mastered';
  if (node.tier > pathFrontier(path, mastered)) return 'locked';
  if (active.has(node.id)) return 'active';
  return 'available';
}

/** Share of a path's nodes that are mastered, 0–100. */
export function pathPercent(path: CustomPath, mastered: Set<string>): number {
  if (path.nodes.length === 0) return 0;
  const done = path.nodes.filter((n) => mastered.has(n.id)).length;
  return Math.round((done / path.nodes.length) * 100);
}

/** The quest draft a node becomes when it's added to the board. */
export function pathNodeToDraft(node: PathNode, path: CustomPath): QuestDraft {
  return {
    title: node.title,
    stat: path.stat,
    difficulty: node.difficulty,
    type: node.type,
    target: node.type === 'weekly' ? Math.max(1, node.target) : 1,
    tier: node.tier,
    ...(node.description ? { description: node.description } : {}),
    nodeId: node.id,
  };
}

/** Problems that block saving a path, or null if it's valid. */
export function validatePath(p: CustomPath): string | null {
  const name = p.name.trim();
  if (!name) return 'Give your path a name.';
  if (name.length > NAME_MAX) return `Keep the name under ${NAME_MAX} characters.`;
  if (!p.nodes.some((n) => n.tier === 1)) return 'Inscribe at least one Tier I node — the place you start.';
  for (let tier = 1; tier <= MAX_TIERS; tier++) {
    if (p.nodes.filter((n) => n.tier === tier).length > MAX_NODES_PER_TIER) {
      return `A tier holds at most ${MAX_NODES_PER_TIER} nodes — a path, not a to-do list.`;
    }
  }
  for (const n of p.nodes) {
    if (!n.title.trim()) return 'Every node needs a title.';
    if (n.title.trim().length > TITLE_MAX) return `Keep node titles under ${TITLE_MAX} characters.`;
    if (n.tier < 1 || n.tier > MAX_TIERS) return 'Nodes must sit in tiers I–VI.';
  }
  return null;
}

/**
 * Apply an edit while protecting mastered nodes: a mastered node that the edit
 * removed is restored, and one moved to another tier goes back to its tier.
 * Wording changes are kept. Returns the path to save.
 */
export function protectMastered(
  prev: CustomPath | undefined,
  next: CustomPath,
  mastered: Set<string>,
): CustomPath {
  if (!prev) return next;
  let nodes = next.nodes.map((n) => {
    const old = prev.nodes.find((o) => o.id === n.id);
    return old && mastered.has(n.id) && old.tier !== n.tier ? { ...n, tier: old.tier } : n;
  });
  for (const old of prev.nodes) {
    if (mastered.has(old.id) && !nodes.some((n) => n.id === old.id)) nodes = [...nodes, old];
  }
  return { ...next, nodes };
}

export function newPathNode(tier: number, over: Partial<Omit<PathNode, 'id' | 'tier'>> = {}): PathNode {
  return {
    id: uid('node'),
    tier,
    title: '',
    type: 'daily',
    difficulty: 'normal',
    target: 1,
    ...over,
  };
}

export function blankPath(now: string, over: Partial<CustomPath> = {}): CustomPath {
  return {
    id: uid('path'),
    name: '',
    stat: 'mind',
    nodes: [newPathNode(1)],
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

/** Copy a built-in branch into a new, editable path. */
export function forkBranch(stat: StatType, name: string, now: string): CustomPath {
  const nodes: PathNode[] = [];
  for (let tier = 1; tier <= MAX_TIERS; tier++) {
    NODES.filter((n) => n.stat === stat && n.tier === tier)
      .slice(0, MAX_NODES_PER_TIER)
      .forEach((n) =>
        nodes.push(
          newPathNode(tier, {
            title: n.title,
            type: n.type,
            difficulty: n.difficulty,
            target: n.target,
            description: n.description,
          }),
        ),
      );
  }
  return blankPath(now, { name, stat, nodes });
}

type TemplateNode = Omit<PathNode, 'id'>;
export interface PathTemplate {
  key: string;
  name: string;
  stat: StatType;
  purpose: string;
  nodes: TemplateNode[];
}

const t = (
  tier: number,
  title: string,
  type: PathNode['type'],
  difficulty: PathNode['difficulty'],
  description: string,
  target = 1,
): TemplateNode => ({ tier, title, type, difficulty, target, description });

export const PATH_TEMPLATES: PathTemplate[] = [
  {
    key: 'degree',
    name: 'The Scholar’s Degree',
    stat: 'mind',
    purpose: 'Finish the degree with real understanding, not just grades.',
    nodes: [
      t(1, 'Attend every lecture', 'daily', 'easy', 'Show up, sit near the front, take your own notes. Unlock: 30 days.'),
      t(1, 'Review notes same day', 'daily', 'easy', '15 minutes rewriting today’s notes in your own words. Unlock: 30 days.'),
      t(2, 'Weekly problem set, early', 'weekly', 'normal', 'Start problem sets the day they’re released. Unlock: 12 weeks.'),
      t(2, 'Office hours once a week', 'weekly', 'normal', 'Bring one real question. Unlock: 8 visits.'),
      t(3, 'Ace one hard module', 'milestone', 'hard', 'Pick the course you fear most and earn top marks. Unlock: grade in hand.'),
      t(4, 'Research or project work', 'milestone', 'hard', 'Join a lab or build a substantial project. Unlock: something shipped.'),
      t(6, 'Graduate with mastery', 'milestone', 'hard', 'Capstone. The degree, and you can teach its core to a beginner.'),
    ],
  },
  {
    key: 'memorisation',
    name: 'The Keeper’s Memory',
    stat: 'spirit',
    purpose: 'Memorise a body of text and keep it — Quran, poetry, scripture, a language.',
    nodes: [
      t(1, 'New lines daily', 'daily', 'normal', 'A small fixed portion every day, after the same prayer or meal. Unlock: 30 days.'),
      t(1, 'Revise yesterday’s portion', 'daily', 'easy', 'Never add without revising. Unlock: 30 days.'),
      t(2, 'Weekly full revision', 'weekly', 'normal', 'Recite everything memorised so far once a week. Unlock: 8 weeks.'),
      t(2, 'Recite to a teacher', 'weekly', 'normal', 'Someone listens and corrects. Unlock: 8 sessions.'),
      t(3, 'Complete the first section', 'milestone', 'hard', 'A juz’, a chapter, a book — a defined block, fully held. Unlock: recited flawlessly.'),
      t(4, 'Hold it for 90 days', 'milestone', 'hard', 'Nothing slips for three months. Unlock: tested.'),
      t(6, 'The whole text, kept', 'milestone', 'hard', 'Capstone. Memorised, revised, and kept for life.'),
    ],
  },
  {
    key: 'comeback',
    name: 'The Comeback',
    stat: 'body',
    purpose: 'Return to training after a long break or injury — safely, then strongly.',
    nodes: [
      t(1, 'Walk 20 minutes', 'daily', 'easy', 'Rebuild the base before anything else. Unlock: 30 days.'),
      t(1, 'Mobility 10 minutes', 'daily', 'easy', 'Joints first. Unlock: 30 days.'),
      t(2, 'Light strength sessions', 'weekly', 'normal', 'Full-body, well below your old numbers. Unlock: 12 sessions.', 3),
      t(3, 'Pain-free for 8 weeks', 'milestone', 'normal', 'No flare-ups, no skipped weeks. Unlock: 8 clean weeks.'),
      t(4, 'Back to your old baseline', 'milestone', 'hard', 'Your pre-break numbers or pace. Unlock: matched.'),
      t(6, 'Stronger than before', 'milestone', 'hard', 'Capstone. Past your old best, without the old injury.'),
    ],
  },
  {
    key: 'business',
    name: 'The Merchant’s Venture',
    stat: 'career',
    purpose: 'Build a side business from first customer to steady income.',
    nodes: [
      t(1, 'One hour on the venture', 'daily', 'normal', 'Protected, every day, before the inbox. Unlock: 30 days.'),
      t(1, 'Talk to one potential customer', 'weekly', 'normal', 'Ask about their problem, not your idea. Unlock: 8 conversations.'),
      t(2, 'Ship a smallest version', 'milestone', 'hard', 'Something a stranger could pay for. Unlock: live.'),
      t(3, 'First paying customer', 'milestone', 'hard', 'Money from someone not obligated to pay. Unlock: received.'),
      t(4, '10 paying customers', 'milestone', 'hard', 'Unlock: ten.'),
      t(5, '3 months of steady revenue', 'milestone', 'hard', 'Unlock: three consecutive months.'),
      t(6, 'A business that runs without you daily', 'milestone', 'hard', 'Capstone. Systems, not heroics.'),
    ],
  },
];

export function pathFromTemplate(tpl: PathTemplate, now: string): CustomPath {
  return blankPath(now, {
    name: tpl.name,
    stat: tpl.stat,
    purpose: tpl.purpose,
    nodes: tpl.nodes.map(({ tier, ...rest }) => newPathNode(tier, rest)),
  });
}

/**
 * Merge two devices' paths: union by id, the newer `updatedAt` wins on a
 * clash, and tombstoned paths stay deleted.
 */
export function mergePaths(
  local: CustomPath[] = [],
  remote: CustomPath[] = [],
  deleted: Set<string> = new Set(),
): CustomPath[] {
  const map = new Map<string, CustomPath>();
  for (const p of [...local, ...remote]) {
    if (!p || !p.id || deleted.has(p.id)) continue;
    const cur = map.get(p.id);
    if (!cur || (p.updatedAt || '') >= (cur.updatedAt || '')) map.set(p.id, p);
  }
  return Array.from(map.values());
}
