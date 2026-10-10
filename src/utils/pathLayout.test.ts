/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { layoutPathTree, LaidCard } from './pathLayout';
import { CustomPath, PathNode } from '../types';

const node = (id: string, tier: number): PathNode => ({ id, tier, title: id, type: 'daily', difficulty: 'normal', target: 1 });
const path = (nodes: PathNode[]): CustomPath => ({
  id: 'p', name: 'Test Path', stat: 'mind', nodes, createdAt: '2026-10-10', updatedAt: '2026-10-10T00:00:00Z',
});

const overlaps = (a: LaidCard, b: LaidCard) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const p = path([node('a', 1), node('b', 1), node('c', 1), node('d', 2), node('e', 2), node('f', 3), node('cap', 6)]);

describe('layoutPathTree', () => {
  it('shows only revealed tiers plus one dashed tease for the first sealed tier', () => {
    const l = layoutPathTree(p, new Set(), 900);
    expect(l.cards.filter((c) => c.kind === 'node').map((c) => c.node!.id).sort()).toEqual(['a', 'b', 'c']);
    const locked = l.cards.filter((c) => c.kind === 'locked');
    expect(locked).toHaveLength(1);
    expect(locked[0]).toMatchObject({ tier: 2, count: 2 });
    expect(l.frontier).toBe(1);
  });

  it('reveals the next tier once a node below is mastered', () => {
    const l = layoutPathTree(p, new Set(['a']), 900);
    expect(l.cards.filter((c) => c.kind === 'node').map((c) => c.node!.id).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(l.cards.find((c) => c.kind === 'locked')!.tier).toBe(3);
  });

  it('grows upward: higher tiers sit above lower ones, the root at the bottom', () => {
    const l = layoutPathTree(p, new Set(['a']), 900);
    const y = (id: string) => l.cards.find((c) => c.node?.id === id)!.y;
    const lockedY = l.cards.find((c) => c.kind === 'locked')!.y;
    expect(lockedY).toBeLessThan(y('d'));
    expect(y('d')).toBeLessThan(y('a'));
    expect(l.root.y).toBeGreaterThan(y('a'));
  });

  it('branches tier I into the root and every other tier into a hub on the trunk', () => {
    const l = layoutPathTree(p, new Set(['a']), 900);
    for (const c of l.cards) {
      if (c.tier === 1) expect(c.anchor).toEqual({ x: l.root.x, y: l.root.y });
      else expect(l.hubs.some((h) => h.x === c.anchor.x && h.y === c.anchor.y)).toBe(true);
    }
    // trunk links root → each hub, the last segment (to the sealed tease) dashed
    expect(l.trunk).toHaveLength(l.hubs.length);
    expect(l.trunk[l.trunk.length - 1].locked).toBe(true);
    expect(l.trunk[0].locked).toBe(false);
  });

  it('fits the width and never overlaps cards — desktop and phone', () => {
    const wide = path([1, 1, 1, 1, 2, 2, 2, 2].map((t, i) => node(`n${i}`, t)));
    for (const width of [1100, 700, 343, 288]) {
      const l = layoutPathTree(wide, new Set(['n0']), width);
      for (const c of l.cards) {
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.x + c.w).toBeLessThanOrEqual(l.width);
      }
      for (let i = 0; i < l.cards.length; i++)
        for (let j = i + 1; j < l.cards.length; j++) expect(overlaps(l.cards[i], l.cards[j])).toBe(false);
    }
  });

  it('wraps a full tier into two rows on a phone', () => {
    const four = path([1, 1, 1, 1].map((t, i) => node(`n${i}`, t)));
    const rows = new Set(layoutPathTree(four, new Set(), 343).cards.map((c) => c.y));
    expect(rows.size).toBe(2);
    expect(new Set(layoutPathTree(four, new Set(), 1100).cards.map((c) => c.y)).size).toBe(1);
  });

  it('shows no tease once every tier is cleared', () => {
    const l = layoutPathTree(path([node('a', 1), node('cap', 6)]), new Set(['a', 'cap']), 900);
    expect(l.cards.some((c) => c.kind === 'locked')).toBe(false);
  });
});
