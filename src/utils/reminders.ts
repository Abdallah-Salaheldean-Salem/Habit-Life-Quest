/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ---------------------------------------------------------
// REMINDERS
// Local, no-backend notifications. They fire while the app is open or running
// in the background (via the service worker's showNotification). Alerts when
// the app is fully closed would need a push server — out of scope here.
// ---------------------------------------------------------

export type ReminderKey = 'dawn' | 'campfire' | 'daily';

export interface ReminderConfig {
  on: boolean;
  /** "HH:MM", 24h. */
  time: string;
}

export interface ReminderSettings {
  /** Master switch — off until the user turns reminders on. */
  enabled: boolean;
  dawn: ReminderConfig;
  campfire: ReminderConfig;
  daily: ReminderConfig;
}

export const REMINDER_KEYS: ReminderKey[] = ['dawn', 'campfire', 'daily'];

export const REMINDER_META: Record<ReminderKey, { label: string; hint: string; title: string; body: string }> = {
  dawn: {
    label: 'Dawn Ritual',
    hint: 'A morning nudge to start your loadout.',
    title: '☀ Dawn Ritual',
    body: 'Start your day — finish the ritual for a +10% XP buff.',
  },
  campfire: {
    label: 'Campfire',
    hint: 'An evening nudge to wind down and bank the day.',
    title: '🔥 The Campfire',
    body: 'Wind down and bank your day with one win.',
  },
  daily: {
    label: 'Daily check-in',
    hint: 'A general reminder to clear your quests.',
    title: 'Habit Quest',
    body: 'Your quests are waiting. Keep the streak alive.',
  },
};

export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: false,
  dawn: { on: true, time: '07:30' },
  campfire: { on: true, time: '20:30' },
  daily: { on: false, time: '12:00' },
};

const KEY = 'habitquest:reminders';
const FIRED_KEY = 'habitquest:reminders:fired';

/** Only fire within this many minutes after the scheduled time, so opening the
 *  app hours later doesn't trigger a stale nag. */
export const FIRE_WINDOW_MIN = 120;

export function loadReminders(): ReminderSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_REMINDERS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_REMINDERS };
}

export function saveReminders(s: ReminderSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function loadFired(): Record<string, string> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {};
}

export function markFired(key: ReminderKey, dateStr: string): void {
  try {
    const fired = loadFired();
    fired[key] = dateStr;
    localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
  } catch {
    /* ignore */
  }
}

/** Minutes since midnight for a "HH:MM" string, or null if malformed. */
function timeToMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Which reminders are due to fire right now: enabled, switched on, the current
 * time is within [scheduled, scheduled + FIRE_WINDOW_MIN), and it hasn't
 * already fired today. Pure — the caller supplies the clock and fired-state.
 */
export function dueReminders(
  s: ReminderSettings,
  now: Date,
  firedToday: Record<string, string>,
  todayStr: string,
): ReminderKey[] {
  if (!s.enabled) return [];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return REMINDER_KEYS.filter((k) => {
    const cfg = s[k];
    if (!cfg.on) return false;
    const due = timeToMinutes(cfg.time);
    if (due === null) return false;
    if (nowMin < due || nowMin >= due + FIRE_WINDOW_MIN) return false;
    return firedToday[k] !== todayStr;
  });
}
