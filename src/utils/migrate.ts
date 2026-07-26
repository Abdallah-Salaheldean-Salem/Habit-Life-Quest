/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// The current save schema version. Bump this and add a matching `if
// (updated.version < N)` branch whenever the persisted shape changes.
export const SCHEMA_VERSION = 9;

/**
 * Forward-migrate a persisted save of any older schema version up to the
 * current one. Pure and idempotent: running it on an already-current save
 * returns it unchanged. Each branch is additive so old saves survive forever.
 */
export function migrate(save: any): any {
  const updated = { ...save };
  if (!updated.version) updated.version = 1;

  // v1 -> v2: Added active flag to quests
  if (updated.version < 2) {
    if (updated.quests) {
      updated.quests = updated.quests.map((q: any) => ({
        ...q,
        active: q.active !== undefined ? q.active : true,
      }));
    }
  }

  // v2 -> v3: Added target parameter for weekly quests
  if (updated.version < 3) {
    if (updated.quests) {
      updated.quests = updated.quests.map((q: any) => ({
        ...q,
        target: q.target || (q.type === 'weekly' ? 2 : 1),
      }));
    }
  }

  // v3 -> v4: Added currentMockDate configuration for robust testing
  if (updated.version < 4) {
    updated.currentMockDate = updated.currentMockDate || '2026-07-18';
    updated.version = 4;
  }

  // v4 -> v5: Implementation intentions on quests + never-zero completion
  // kind on ledger entries. Existing entries are full completions.
  if (updated.version < 5) {
    if (Array.isArray(updated.ledger)) {
      updated.ledger = updated.ledger.map((e: any) => ({ ...e, kind: e.kind || 'full' }));
    }
    updated.version = 5;
  }

  // v5 -> v6: friction ledger (per-quest environment changes).
  if (updated.version < 6) {
    updated.frictionItems = updated.frictionItems || [];
    updated.version = 6;
  }

  // v6 -> v7: debuff engine (addiction interruption).
  if (updated.version < 7) {
    updated.debuffs = updated.debuffs || [];
    updated.triggerEvents = updated.triggerEvents || [];
    updated.version = 7;
  }

  // v7 -> v8: trait / personality engine.
  if (updated.version < 8) {
    updated.traitGoals = updated.traitGoals || [];
    updated.version = 8;
  }

  // v8 -> v9: delete tombstones + a real (non-mock) clock for real users.
  if (updated.version < 9) {
    updated.deletedIds = updated.deletedIds || [];
    // Anyone with a character already created moves to the live clock.
    updated.liveClock = updated.liveClock ?? Boolean(updated.hasCreatedCharacter);
    updated.version = SCHEMA_VERSION;
  }

  return updated;
}
