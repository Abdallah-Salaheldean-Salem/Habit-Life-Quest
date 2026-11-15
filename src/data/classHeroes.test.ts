/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { CLASS_LOOKS, CLASS_MOTTOS, resolveLook, heroMarkup } from './classHeroes';
import { CLASSES, UserClass } from '../types';
import { mergeSaves, SaveStateData } from '../utils/syncService';
import { buildCloudSave, buildLocalSave, SaveFields } from '../utils/saveState';
import { SCHEMA_VERSION } from '../utils/migrate';

const all = Object.values(CLASS_LOOKS).flat();

describe('class heroes', () => {
  it('every class has at least one look and a motto', () => {
    expect(Object.keys(CLASS_LOOKS).sort()).toEqual(Object.keys(CLASSES).sort());
    for (const cls of Object.keys(CLASSES) as UserClass[]) {
      expect(CLASS_LOOKS[cls].length, cls).toBeGreaterThan(0);
      expect(CLASS_MOTTOS[cls].length, cls).toBeGreaterThan(10);
    }
  });

  it('look ids are unique and each look is complete', () => {
    expect(new Set(all.map((l) => l.id)).size).toBe(all.length);
    for (const l of all) {
      expect(l.outline, l.id).toMatch(/^M[\d.,\sL-]+Z$/);
      expect(l.bust.split(' ').map(Number).every(Number.isFinite), l.id).toBe(true);
      expect(l.alt.length, l.id).toBeGreaterThan(10);
      expect(l.name.length, l.id).toBeGreaterThan(2);
    }
  });

  it('fills placeholders per instance and contains no script or handlers', () => {
    for (const l of all) {
      for (const markup of [l.detail, l.back]) {
        const out = heroMarkup(markup, l, { glow: 'gX', sil: 'sX' });
        expect(out, l.id).not.toMatch(/LIGHT|COLOR|#GLOW|#SIL/);
        expect(out, l.id).not.toMatch(/<script|\son\w+=|javascript:/i);
      }
    }
  });

  it('resolveLook falls back to the class default for missing or foreign looks', () => {
    expect(resolveLook('warrior', 'ronin').id).toBe('ronin');
    expect(resolveLook('warrior', '').id).toBe(CLASS_LOOKS.warrior[0].id);
    expect(resolveLook('warrior', 'archmage').id).toBe(CLASS_LOOKS.warrior[0].id); // a scholar look
    expect(resolveLook('monk', undefined).id).toBe(CLASS_LOOKS.monk[0].id);
  });
});

describe('hero look persistence', () => {
  const fields = (over: Partial<SaveFields> = {}): SaveFields => ({
    userName: 'Layla', userClass: 'warrior', heroLook: 'ronin', quests: [], ledger: [], frictionItems: [], debuffs: [],
    triggerEvents: [], traitGoals: [], customPaths: [], deletedIds: [], liveClock: true, debuffLocalOnly: false,
    currentMockDate: '2026-11-15', hasCreatedCharacter: true, ...over,
  });

  it('is written to both the local and the cloud save', () => {
    expect(buildLocalSave(fields()).heroLook).toBe('ronin');
    expect(buildCloudSave(fields()).heroLook).toBe('ronin');
  });

  it('travels with the class when saves merge', () => {
    const base = (over: Partial<SaveStateData>): SaveStateData => ({
      version: SCHEMA_VERSION, userName: 'Layla', userClass: 'warrior', quests: [], ledger: [],
      currentMockDate: '2026-11-15', hasCreatedCharacter: true, ...over,
    });
    expect(mergeSaves(base({ heroLook: 'ronin' }), base({ userClass: 'scholar', heroLook: 'archmage' })).heroLook).toBe('archmage');
    expect(mergeSaves(base({ heroLook: 'ronin' }), base({ userClass: '', heroLook: '' })).heroLook).toBe('ronin');
  });
});
