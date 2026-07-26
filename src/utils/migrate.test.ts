/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { migrate, SCHEMA_VERSION } from './migrate';

describe('migrate', () => {
  it('brings a bare v1 save all the way to the current schema', () => {
    const out = migrate({ userName: 'A', quests: [], ledger: [] });
    expect(out.version).toBe(SCHEMA_VERSION);
    expect(out.frictionItems).toEqual([]);
    expect(out.debuffs).toEqual([]);
    expect(out.triggerEvents).toEqual([]);
    expect(out.traitGoals).toEqual([]);
    expect(out.deletedIds).toEqual([]);
  });

  it('defaults active/target on legacy quests', () => {
    const out = migrate({ quests: [{ id: 'q', type: 'weekly' }, { id: 'r', type: 'daily' }] });
    expect(out.quests[0].active).toBe(true);
    expect(out.quests[0].target).toBe(2); // weekly default
    expect(out.quests[1].target).toBe(1); // daily default
  });

  it('tags pre-v5 ledger entries as full completions', () => {
    const out = migrate({ version: 4, ledger: [{ id: 'e', xp: 10 }] });
    expect(out.ledger[0].kind).toBe('full');
  });

  it('moves an existing character onto the live clock (v8 -> v9)', () => {
    const withChar = migrate({ version: 8, hasCreatedCharacter: true });
    expect(withChar.liveClock).toBe(true);
    const noChar = migrate({ version: 8, hasCreatedCharacter: false });
    expect(noChar.liveClock).toBe(false);
  });

  it('does not clobber an explicit liveClock already set', () => {
    const out = migrate({ version: 8, hasCreatedCharacter: true, liveClock: false });
    expect(out.liveClock).toBe(false);
  });

  it('is idempotent on an already-current save', () => {
    const once = migrate({ userName: 'A', quests: [], ledger: [] });
    const twice = migrate(once);
    expect(twice).toEqual(once);
  });

  it('does not mutate the input object', () => {
    const input = { version: 3, quests: [] as any[] };
    const snapshot = JSON.stringify(input);
    migrate(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
