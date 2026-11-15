/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { CLASS_HEROES, heroDetail } from './classHeroes';
import { CLASSES } from '../types';

describe('class heroes', () => {
  it('has a hero for every class', () => {
    expect(Object.keys(CLASS_HEROES).sort()).toEqual(Object.keys(CLASSES).sort());
  });

  it('each hero has a closed outline, a bust frame, alt text and a motto', () => {
    for (const [cls, h] of Object.entries(CLASS_HEROES)) {
      expect(h.outline, cls).toMatch(/^M[\d.,\sL-]+Z$/);
      expect(h.bust.split(' ').map(Number).every((n) => Number.isFinite(n)), cls).toBe(true);
      expect(h.alt.length, cls).toBeGreaterThan(10);
      expect(h.motto.length, cls).toBeGreaterThan(10);
    }
  });

  it('fills placeholders per instance and leaves no script or handlers', () => {
    for (const h of Object.values(CLASS_HEROES)) {
      const out = heroDetail(h, { glow: 'gX', sil: 'sX' });
      expect(out).not.toMatch(/LIGHT|COLOR|#GLOW|#SIL/);
      expect(out).not.toMatch(/<script|\son\w+=/i);
      if (h.detail.includes('#GLOW')) expect(out).toContain('url(#gX)');
    }
  });
});
