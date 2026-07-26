/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A collision-proof id with a readable prefix, e.g. `quest_9f2c…`.
 * Uses crypto.randomUUID() where available (all secure contexts), falling
 * back to time+random for old/insecure environments. Replaces the previous
 * `prefix_${Date.now()}` scheme, where two records created in the same
 * millisecond could share an id.
 */
export function uid(prefix: string): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  const rand =
    g.crypto && typeof g.crypto.randomUUID === 'function'
      ? g.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`;
}
