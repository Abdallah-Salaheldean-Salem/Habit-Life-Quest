/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { CLASS_SPRITES, SPRITE_SIZE, BASE_PALETTE, spriteColor } from './classSprites';
import { CLASSES } from '../types';

describe('class sprites', () => {
  it('has a sprite for every class', () => {
    expect(Object.keys(CLASS_SPRITES).sort()).toEqual(Object.keys(CLASSES).sort());
  });

  it('every sprite is 16×16 and uses only known colours', () => {
    const keys = new Set(['.', 'P', 'p', 'L', ...Object.keys(BASE_PALETTE)]);
    for (const [cls, def] of Object.entries(CLASS_SPRITES)) {
      expect(def.rows.length, cls).toBe(SPRITE_SIZE);
      for (const row of def.rows) {
        expect(row.length, `${cls}: ${row}`).toBe(SPRITE_SIZE);
        for (const ch of row) expect(keys.has(ch), `${cls}: '${ch}'`).toBe(true);
      }
      expect(def.motto.length).toBeGreaterThan(0);
    }
  });

  it('resolves class tones and transparency', () => {
    const w = CLASS_SPRITES.warrior;
    expect(spriteColor(w, '.')).toBeNull();
    expect(spriteColor(w, 'P')).toBe(w.tones.P);
    expect(spriteColor(w, 'K')).toBe(BASE_PALETTE.K);
  });
});
