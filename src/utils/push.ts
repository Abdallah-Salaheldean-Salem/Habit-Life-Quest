/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabase';
import { ReminderSettings, REMINDER_KEYS } from './reminders';

// ---------------------------------------------------------
// CLOSED-APP PUSH REMINDERS
// The device subscribes with the browser's PushManager and registers with the
// hq-push edge function under the signed-in character. The server then sends
// each reminder at its time, in the device's timezone, worded from the cloud
// save — and skips it when the day's work is already done. While push is on
// for this device, the in-app local reminders stand down to avoid doubles.
// ---------------------------------------------------------

const FLAG = 'habitquest:push-on';

export type PushPrefs = Record<'dawn' | 'daily' | 'campfire' | 'weekly', string | null>;

/** Reminder times to send to the server: only switched-on reminders, and none when reminders are off. */
export function pushPrefsFrom(settings: ReminderSettings): PushPrefs {
  const out: PushPrefs = { dawn: null, daily: null, campfire: null, weekly: null };
  if (!settings.enabled) return out;
  for (const k of REMINDER_KEYS) if (settings[k].on) out[k] = settings[k].time;
  return out;
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined';
}

/** Whether this device has push switched on (cheap, synchronous). */
export function pushActiveHere(): boolean {
  try {
    return localStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
}

function setFlag(on: boolean) {
  try {
    if (on) localStorage.setItem(FLAG, '1');
    else localStorage.removeItem(FLAG);
  } catch {
    /* ignore */
  }
}

const tz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

async function call<T = { ok?: boolean; error?: string }>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('hq-push', { body });
  if (error) {
    // Surface the function's own message ("sign in to sync first") when there is one.
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) msg = (await ctx.json()).error || msg;
    } catch {
      /* keep the generic message */
    }
    throw new Error(msg);
  }
  return data as T;
}

function keyBytes(base64url: string): Uint8Array {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/** Ask permission, subscribe this device and register it with its reminder times. */
export async function enablePush(settings: ReminderSettings): Promise<void> {
  if (!pushSupported()) throw new Error("This browser can't receive closed-app reminders.");
  if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') {
    throw new Error('Notifications are blocked for this site.');
  }
  const reg = await navigator.serviceWorker.ready;
  const { publicKey } = await call<{ publicKey: string }>({ action: 'vapid' });
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) as BufferSource });
  await call({ action: 'subscribe', subscription: sub.toJSON(), tz: tz(), prefs: pushPrefsFrom(settings), userAgent: navigator.userAgent });
  setFlag(true);
}

/** Send updated reminder times (and timezone) for this device. */
export async function syncPushPrefs(settings: ReminderSettings): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return setFlag(false);
  await call({ action: 'prefs', endpoint: sub.endpoint, tz: tz(), prefs: pushPrefsFrom(settings) });
}

/** Stop push on this device (server and browser). Never throws. */
export async function disablePush(): Promise<void> {
  setFlag(false);
  try {
    const sub = await currentSubscription();
    if (!sub) return;
    await call({ action: 'unsubscribe', endpoint: sub.endpoint }).catch(() => undefined);
    await sub.unsubscribe();
  } catch {
    /* already off */
  }
}

export async function sendTestPush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) throw new Error('Push is off on this device.');
  const res = await call({ action: 'test', endpoint: sub.endpoint });
  if (!res.ok) throw new Error("The test couldn't be delivered. Try turning closed-app reminders off and on.");
}

/** Re-check the flag against the browser (e.g. the user revoked permission). */
export async function refreshPushFlag(): Promise<boolean> {
  const on = !!(await currentSubscription().catch(() => null)) && typeof Notification !== 'undefined' && Notification.permission === 'granted';
  setFlag(on && pushActiveHere());
  return on && pushActiveHere();
}
