/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { buildLocalSave, buildCloudSave, SaveFields } from './saveState';
import { SCHEMA_VERSION } from './migrate';

const fields = (over: Partial<SaveFields> = {}): SaveFields => ({
  userName: 'Layla',
  userClass: 'scholar',
  quests: [],
  ledger: [],
  frictionItems: [],
  debuffs: [{ id: 'db1' } as any],
  triggerEvents: [{ id: 'te1' } as any],
  traitGoals: [],
  deletedIds: ['x'],
  liveClock: true,
  debuffLocalOnly: true,
  currentMockDate: '2026-07-26',
  hasCreatedCharacter: true,
  syncEmail: 'a@b.com',
  ...over,
});

describe('buildLocalSave', () => {
  it('stamps the current schema version and keeps device-only settings', () => {
    const out = buildLocalSave(fields());
    expect(out.version).toBe(SCHEMA_VERSION);
    expect(out.debuffLocalOnly).toBe(true);
    expect(out.syncEmail).toBe('a@b.com');
  });

  it('keeps the full debuff module data regardless of the privacy switch', () => {
    const out = buildLocalSave(fields({ debuffLocalOnly: true }));
    expect(out.debuffs).toHaveLength(1);
    expect(out.triggerEvents).toHaveLength(1);
  });

  it('defaults a missing syncEmail to null', () => {
    expect(buildLocalSave(fields({ syncEmail: undefined })).syncEmail).toBeNull();
  });
});

describe('buildCloudSave', () => {
  it('withholds debuff data while on-device-only', () => {
    const out = buildCloudSave(fields({ debuffLocalOnly: true }));
    expect(out.debuffs).toEqual([]);
    expect(out.triggerEvents).toEqual([]);
  });

  it('includes debuff data once syncing is enabled', () => {
    const out = buildCloudSave(fields({ debuffLocalOnly: false }));
    expect(out.debuffs).toHaveLength(1);
    expect(out.triggerEvents).toHaveLength(1);
  });

  it('never leaks device-only settings to the cloud', () => {
    const out = buildCloudSave(fields()) as unknown as Record<string, unknown>;
    expect(out.debuffLocalOnly).toBeUndefined();
    expect(out.syncEmail).toBeUndefined();
  });

  it('carries the synced fields through unchanged', () => {
    const out = buildCloudSave(fields({ debuffLocalOnly: false }));
    expect(out.deletedIds).toEqual(['x']);
    expect(out.liveClock).toBe(true);
    expect(out.version).toBe(SCHEMA_VERSION);
  });
});
