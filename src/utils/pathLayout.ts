/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ---------------------------------------------------------
// PATH TREE LAYOUT
// Lays a custom path out as a skill tree that grows upward from a root:
//
//            [ locked tease ]            ← first sealed tier (dashed)
//                   ●  hub
//        [ II-a ]       [ II-b ]          ← tier II, branches meet at its hub
//                   ●  hub
//   [ I-a ]     [ I-b ]     [ I-c ]       ← tier I, branches meet at the root
//                  (ROOT)
//
// A trunk runs from the root up through every hub; each tier's nodes branch
// off its hub. Rows wrap to fit the width, so the same tree works on a phone
// and a desktop. Pure geometry — the view just draws it.
// ---------------------------------------------------------

import { CustomPath, PathNode } from '../types';
import { MAX_TIERS, pathFrontier } from './paths';

export interface LaidCard {
  x: number; // left
  y: number; // top
  w: number;
  h: number;
  /** A revealed node, or the dashed "N locked" tease for the first sealed tier. */
  kind: 'node' | 'locked';
  node?: PathNode;
  tier: number;
  /** For the tease: how many nodes the sealed tier holds. */
  count?: number;
  /** The junction this card's branch runs to (a hub, or the root for tier I). */
  anchor: { x: number; y: number };
}

export interface PathTreeLayout {
  width: number;
  height: number;
  cards: LaidCard[];
  /** Junction dots between tiers (not including the root). */
  hubs: { x: number; y: number; locked: boolean }[];
  root: { x: number; y: number; r: number };
  /** Trunk segments, root upward; `locked` ones lead to the sealed tease. */
  trunk: { x1: number; y1: number; x2: number; y2: number; locked: boolean }[];
  /** The tier whose nodes must be mastered to break the seal (for the tease text). */
  frontier: number;
}

export function layoutPathTree(path: CustomPath, mastered: Set<string>, width: number): PathTreeLayout {
  const W = Math.max(260, Math.floor(width));
  const phone = W < 520;
  const PADX = phone ? 4 : 12;
  const PADY = 18;
  const GX = phone ? 10 : 16;
  const GY = 14;
  const BAND_GAP = phone ? 40 : 48;
  const CH = phone ? 70 : 76;
  const R = phone ? 40 : 46;
  const cols = W >= 820 ? 4 : W >= 600 ? 3 : 2;
  const CW = Math.min(200, Math.floor((W - 2 * PADX - (cols - 1) * GX) / cols));
  const cx = W / 2;

  const frontier = pathFrontier(path, mastered);
  const tiersWithNodes = Array.from({ length: MAX_TIERS }, (_, i) => i + 1).filter((t) => path.nodes.some((n) => n.tier === t));
  const revealed = tiersWithNodes.filter((t) => t <= frontier);
  const sealed = tiersWithNodes.find((t) => t > frontier);

  // Bands top → bottom: the sealed tease (if any), then revealed tiers high → low.
  type Band = { tier: number; locked: boolean; items: (PathNode | null)[] };
  const bands: Band[] = [];
  if (sealed) bands.push({ tier: sealed, locked: true, items: [null] });
  [...revealed].reverse().forEach((t) => bands.push({ tier: t, locked: false, items: path.nodes.filter((n) => n.tier === t) }));

  const cards: LaidCard[] = [];
  const hubs: PathTreeLayout['hubs'] = [];
  const bandBottoms: number[] = [];
  let y = PADY;
  bands.forEach((band, bi) => {
    const rows: (PathNode | null)[][] = [];
    for (let i = 0; i < band.items.length; i += cols) rows.push(band.items.slice(i, i + cols));
    const placed: LaidCard[] = [];
    rows.forEach((row, ri) => {
      const rowW = row.length * CW + (row.length - 1) * GX;
      const startX = cx - rowW / 2;
      const top = y + ri * (CH + GY);
      row.forEach((item, ci) => {
        placed.push({
          x: Math.round(startX + ci * (CW + GX)),
          y: Math.round(top),
          w: CW,
          h: CH,
          kind: item ? 'node' : 'locked',
          node: item ?? undefined,
          tier: band.tier,
          count: item ? undefined : path.nodes.filter((n) => n.tier === band.tier).length,
          anchor: { x: cx, y: 0 }, // set below
        });
      });
    });
    y += rows.length * CH + (rows.length - 1) * GY;
    bandBottoms.push(y);
    const isLast = bi === bands.length - 1;
    if (!isLast) {
      const hub = { x: cx, y: y + BAND_GAP / 2, locked: band.locked };
      hubs.push(hub);
      placed.forEach((c) => (c.anchor = { x: hub.x, y: hub.y }));
      y += BAND_GAP;
    }
    cards.push(...placed);
  });

  // Root below the last (lowest) band; tier I branches meet at the root.
  const rootY = (bands.length ? y + BAND_GAP * 0.75 : PADY) + R;
  const root = { x: cx, y: rootY, r: R };
  const lowest = bands[bands.length - 1];
  if (lowest) cards.filter((c) => c.tier === lowest.tier && c.kind === (lowest.locked ? 'locked' : 'node')).forEach((c) => (c.anchor = { x: cx, y: rootY }));

  // Trunk: root → lowest hub → … → highest hub. Hubs are listed top → bottom.
  const trunk: PathTreeLayout['trunk'] = [];
  const points = [{ x: cx, y: rootY, locked: false }, ...[...hubs].reverse()];
  for (let i = 0; i < points.length - 1; i++) {
    trunk.push({ x1: points[i].x, y1: points[i].y, x2: points[i + 1].x, y2: points[i + 1].y, locked: points[i + 1].locked });
  }

  return { width: W, height: Math.round(rootY + R + PADY), cards, hubs, root, trunk, frontier };
}
