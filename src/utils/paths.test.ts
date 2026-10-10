/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  lifeNodeId,
  nodeSetsFromQuests,
  pathFrontier,
  nodeStatus,
  pathPercent,
  pathNodeToDraft,
  validatePath,
  protectMastered,
  forkBranch,
  pathFromTemplate,
  PATH_TEMPLATES,
  mergePaths,
  MAX_NODES_PER_TIER,
} from './paths';
import { CustomPath, PathNode, Quest } from '../types';
import { NODES } from '../data/lifeTree';
import { migrate, SCHEMA_VERSION } from './migrate';
import { mergeSaves, SaveStateData } from './syncService';

const node = (id: string, tier: number, over: Partial<PathNode> = {}): PathNode => ({
  id,
  tier,
  title: id,
  type: 'daily',
  difficulty: 'normal',
  target: 1,
  ...over,
});

const path = (nodes: PathNode[], over: Partial<CustomPath> = {}): CustomPath => ({
  id: 'p1',
  name: 'My Path',
  stat: 'mind',
  nodes,
  createdAt: '2026-10-01',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...over,
});

const quest = (id: string, over: Partial<Quest> = {}): Quest => ({
  id,
  title: id,
  stat: 'mind',
  difficulty: 'normal',
  type: 'daily',
  target: 1,
  active: true,
  createdAt: '2026-10-01',
  ...over,
});

describe('progressive reveal', () => {
  const p = path([node('a', 1), node('b', 1), node('c', 2), node('d', 3), node('cap', 6)]);

  it('opens only tier I until a tier I node is mastered', () => {
    expect(pathFrontier(p, new Set())).toBe(1);
    expect(nodeStatus(p.nodes[2], p, new Set(), new Set())).toBe('locked');
  });

  it('mastering any one node clears the tier and reveals the next', () => {
    const m = new Set(['b']);
    expect(pathFrontier(p, m)).toBe(2);
    expect(nodeStatus(p.nodes[2], p, m, new Set())).toBe('available');
    expect(nodeStatus(p.nodes[3], p, m, new Set())).toBe('locked');
  });

  it('skips empty tiers (III cleared → ★ next, not IV)', () => {
    expect(pathFrontier(p, new Set(['a', 'c', 'd']))).toBe(6);
  });

  it('reports mastered / on-board status', () => {
    expect(nodeStatus(p.nodes[0], p, new Set(['a']), new Set())).toBe('mastered');
    expect(nodeStatus(p.nodes[1], p, new Set(), new Set(['b']))).toBe('active');
  });

  it('computes completion percent', () => {
    expect(pathPercent(p, new Set(['a', 'c']))).toBe(40);
    expect(pathPercent(path([]), new Set())).toBe(0);
  });
});

describe('node ↔ quest linking', () => {
  it('builds node-id sets from quests, ignoring quests without a node', () => {
    const qs = [quest('q1', { nodeId: 'n1' }), quest('q2', { nodeId: 'n2', active: false }), quest('q3')];
    const { masteredNodeIds, activeNodeIds } = nodeSetsFromQuests(qs, (q) => q.id === 'q2');
    expect([...activeNodeIds]).toEqual(['n1']);
    expect([...masteredNodeIds]).toEqual(['n2']); // archived but mastered still counts
  });

  it('a path node becomes a quest draft carrying its node id and the path stat', () => {
    const p = path([node('n1', 2, { type: 'weekly', target: 3, description: 'why' })], { stat: 'body' });
    const d = pathNodeToDraft(p.nodes[0], p);
    expect(d).toMatchObject({ title: 'n1', stat: 'body', type: 'weekly', target: 3, tier: 2, nodeId: 'n1', description: 'why' });
  });

  it('gives built-in tree nodes a stable, unique id', () => {
    const ids = NODES.map(lifeNodeId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lifeNodeId({ stat: 'mind', title: 'Read 10 pages' })).toBe('life:mind:read-10-pages');
  });
});

describe('validatePath', () => {
  it('requires a name and a tier I node', () => {
    expect(validatePath(path([node('a', 1)], { name: ' ' }))).toMatch(/name/);
    expect(validatePath(path([node('a', 2)]))).toMatch(/Tier I/);
    expect(validatePath(path([node('a', 1)]))).toBeNull();
  });

  it('caps nodes per tier and needs titles', () => {
    const crowded = Array.from({ length: MAX_NODES_PER_TIER + 1 }, (_, i) => node(`n${i}`, 1));
    expect(validatePath(path(crowded))).toMatch(/at most/);
    expect(validatePath(path([node('a', 1, { title: '  ' })]))).toMatch(/title/);
  });
});

describe('protectMastered', () => {
  const prev = path([node('m', 1), node('x', 1), node('y', 2)]);
  const mastered = new Set(['m']);

  it('restores a mastered node that the edit deleted', () => {
    const next = protectMastered(prev, { ...prev, nodes: [node('x', 1)] }, mastered);
    expect(next.nodes.map((n) => n.id).sort()).toEqual(['m', 'x']);
  });

  it('keeps a mastered node in its tier but accepts its new wording', () => {
    const next = protectMastered(prev, { ...prev, nodes: [node('m', 3, { title: 'Renamed' }), node('x', 1)] }, mastered);
    const m = next.nodes.find((n) => n.id === 'm')!;
    expect(m.tier).toBe(1);
    expect(m.title).toBe('Renamed');
  });

  it('lets unmastered nodes be removed or moved freely', () => {
    const next = protectMastered(prev, { ...prev, nodes: [node('m', 1), node('y', 4)] }, mastered);
    expect(next.nodes.find((n) => n.id === 'x')).toBeUndefined();
    expect(next.nodes.find((n) => n.id === 'y')!.tier).toBe(4);
  });
});

describe('starting points', () => {
  it('forks a built-in branch into a valid path with fresh ids', () => {
    const p = forkBranch('body', 'My Body Path', '2026-10-10T00:00:00.000Z');
    expect(p.stat).toBe('body');
    expect(p.nodes.length).toBeGreaterThan(5);
    expect(validatePath(p)).toBeNull();
    expect(p.nodes.every((n) => n.id.startsWith('node_'))).toBe(true);
  });

  it('every template produces a valid path', () => {
    for (const tpl of PATH_TEMPLATES) {
      expect(validatePath(pathFromTemplate(tpl, '2026-10-10T00:00:00.000Z'))).toBeNull();
    }
  });
});

describe('sync + migration', () => {
  it('merges paths by id: newer edit wins, tombstones stay deleted', () => {
    const old = path([node('a', 1)], { name: 'Old', updatedAt: '2026-10-01T00:00:00.000Z' });
    const fresh = path([node('a', 1)], { name: 'New', updatedAt: '2026-10-05T00:00:00.000Z' });
    const other = path([node('b', 1)], { id: 'p2' });
    expect(mergePaths([fresh], [old]).find((p) => p.id === 'p1')!.name).toBe('New');
    expect(mergePaths([old], [fresh, other]).length).toBe(2);
    expect(mergePaths([old], [other], new Set(['p1'])).map((p) => p.id)).toEqual(['p2']);
  });

  it('mergeSaves carries custom paths across devices', () => {
    const base = (over: Partial<SaveStateData>): SaveStateData => ({
      version: SCHEMA_VERSION, userName: 'Layla', userClass: 'scholar', quests: [], ledger: [],
      currentMockDate: '2026-10-10', hasCreatedCharacter: true, ...over,
    });
    const merged = mergeSaves(base({ customPaths: [path([node('a', 1)])] }), base({ customPaths: [path([node('b', 1)], { id: 'p2' })] }));
    expect(merged.customPaths!.map((p) => p.id).sort()).toEqual(['p1', 'p2']);
  });

  it('migrates an older save to have an empty path list', () => {
    const m = migrate({ version: 9, quests: [], ledger: [] });
    expect(m.version).toBe(SCHEMA_VERSION);
    expect(m.customPaths).toEqual([]);
  });
});
