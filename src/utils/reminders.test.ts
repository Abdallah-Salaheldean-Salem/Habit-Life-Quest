/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { dueReminders, DEFAULT_REMINDERS, ReminderSettings, FIRE_WINDOW_MIN } from './reminders';

const at = (h: number, m = 0) => new Date(2026, 8, 29, h, m); // Sep 29 2026, local
const TODAY = '2026-09-29';

const settings = (over: Partial<ReminderSettings> = {}): ReminderSettings => ({
  ...DEFAULT_REMINDERS,
  enabled: true,
  ...over,
});

describe('dueReminders', () => {
  it('returns nothing when the master switch is off', () => {
    const s = settings({ enabled: false });
    expect(dueReminders(s, at(7, 30), {}, TODAY)).toEqual([]);
  });

  it('fires a reminder at its scheduled time', () => {
    const s = settings();
    expect(dueReminders(s, at(7, 30), {}, TODAY)).toContain('dawn');
  });

  it('does not fire before the scheduled time', () => {
    const s = settings();
    expect(dueReminders(s, at(7, 0), {}, TODAY)).not.toContain('dawn');
  });

  it('fires within the window but not after it', () => {
    const s = settings({ dawn: { on: true, time: '07:30' } });
    // 07:30 + 119 min = 09:29 → still in window
    expect(dueReminders(s, at(9, 29), {}, TODAY)).toContain('dawn');
    // 07:30 + 120 min = 09:30 → window closed
    expect(dueReminders(s, at(9, 30), {}, TODAY)).not.toContain('dawn');
  });

  it('does not re-fire once it has fired today', () => {
    const s = settings();
    expect(dueReminders(s, at(7, 45), { dawn: TODAY }, TODAY)).not.toContain('dawn');
    // but a stale fired-date from yesterday does not block today
    expect(dueReminders(s, at(7, 45), { dawn: '2026-09-28' }, TODAY)).toContain('dawn');
  });

  it('respects each reminder on/off switch', () => {
    const s = settings({
      dawn: { on: false, time: '07:30' },
      campfire: { on: true, time: '20:30' },
    });
    const due = dueReminders(s, at(20, 30), {}, TODAY);
    expect(due).toContain('campfire');
    expect(due).not.toContain('dawn');
  });

  it('ignores a malformed time', () => {
    const s = settings({ dawn: { on: true, time: '99:99' } });
    expect(dueReminders(s, at(7, 30), {}, TODAY)).not.toContain('dawn');
  });

  it('exposes a two-hour firing window', () => {
    expect(FIRE_WINDOW_MIN).toBe(120);
  });
});
