/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { legendArt, legendGround } from './legendArt';
import { LEGENDS, LegendTiers, Tier } from '../utils/legends';

const T: Tier[] = [0, 1, 2, 3];
const all: LegendTiers[] = T.flatMap((a) => T.flatMap((b) => T.map((c) => [a, b, c] as LegendTiers)));

describe('legend art', () => {
  it('draws every legend hero at all 64 tier combinations', () => {
    for (const l of LEGENDS) {
      const seen = new Set<string>();
      for (const t of all) {
        const svg = legendArt(l.lookId, t)!;
        expect(svg, `${l.lookId} ${t}`).toBeTruthy();
        expect(svg).toContain('url(#SIL)'); // outline included
        expect(svg).not.toMatch(/undefined|\bNaN\b/);
        expect(svg).not.toMatch(/<script|\son\w+=|javascript:/i);
        seen.add(svg);
      }
      expect(seen.size, `${l.lookId}: every combination looks different`).toBe(64);
    }
  });

  it('each upgrade changes the art on its own', () => {
    for (const l of LEGENDS) {
      for (const i of [0, 1, 2]) {
        const base: LegendTiers = [0, 0, 0];
        const up = [...base] as LegendTiers;
        up[i] = 3;
        expect(legendArt(l.lookId, up), `${l.lookId} track ${i}`).not.toBe(legendArt(l.lookId, base));
      }
    }
  });

  it('has no art for looks without a legend, and moves the sage’s shadow as he rises', () => {
    expect(legendArt('ronin', [1, 1, 1])).toBeNull();
    expect(legendGround('floating-sage', [0, 0, 3])!.cy).toBeGreaterThan(legendGround('floating-sage', [0, 0, 0])!.cy);
    expect(legendGround('coin-baron', [0, 0, 0])).toBeNull();
  });
});
