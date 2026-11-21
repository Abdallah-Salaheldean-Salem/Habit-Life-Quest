// Habit Quest push reminders: decides WHEN a reminder is due and WHAT it says.
//
// Pure logic with no imports, so the same file runs in the Deno edge function
// and in the app's vitest suite (src/utils/pushMessages.test.ts). Streaks and
// shields mirror src/utils/logic.ts and src/utils/shields.ts.

export type Kind = 'dawn' | 'daily' | 'campfire' | 'weekly';
export const KINDS: Kind[] = ['dawn', 'daily', 'campfire', 'weekly'];
/** The weekly recap goes out on Sundays and doesn't count toward the daily cap. */
const CAPPED: Kind[] = ['dawn', 'daily', 'campfire'];

/** Reminder times as "HH:MM" (24h) in the device's timezone; null/absent = off. */
export type Prefs = Partial<Record<Kind, string | null>>;
/** The local date each kind was last sent on. */
export type LastSent = Partial<Record<Kind, string>>;

/** Never more than this many daily reminders a day per device (the weekly recap is extra). */
export const MAX_PER_DAY = 2;
/** A reminder whose time passed more than this long ago is skipped, not sent late. */
export const LATE_WINDOW_MIN = 180;

// deno-lint-ignore no-explicit-any
type Json = any;

export interface Message {
  title: string;
  body: string;
  tag: string;
  /** Where tapping it opens (defaults to the app's home). */
  url?: string;
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function cleanPrefs(input: Json): Prefs {
  const out: Prefs = {};
  for (const k of KINDS) {
    const v = input?.[k];
    out[k] = typeof v === 'string' && HHMM.test(v) ? v : null;
  }
  return out;
}

/** The kinds due right now: time reached, within the late window, not sent today, daily cap respected. */
export function dueKinds(prefs: Prefs, nowHHMM: string, today: string, lastSent: LastSent): Kind[] {
  let sentToday = CAPPED.filter((k) => lastSent[k] === today).length;
  const now = minutes(nowHHMM);
  const out: Kind[] = [];
  for (const k of KINDS) {
    const t = prefs[k];
    if (!t || !HHMM.test(t) || lastSent[k] === today) continue;
    if (k === 'weekly' && new Date(today + 'T00:00:00Z').getUTCDay() !== 0) continue; // Sundays only
    const diff = now - minutes(t);
    if (diff < 0 || diff > LATE_WINDOW_MIN) continue;
    if (k !== 'weekly') {
      if (sentToday >= MAX_PER_DAY) continue;
      sentToday++;
    }
    out.push(k);
  }
  return out;
}

// ---- Date helpers (UTC arithmetic on YYYY-MM-DD strings) ----------------------
export const addDays = (d: string, n: number) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
export const dayDiff = (from: string, to: string) => Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000);
const mondayOf = (d: string) => addDays(d, -((new Date(d + 'T00:00:00Z').getUTCDay() + 6) % 7));

/** Shield-covered missed days and the shields banked (mirror of utils/shields.ts). */
export function shields(active: Set<string>, today: string): { covered: Set<string>; bank: number } {
  const covered = new Set<string>();
  let bank = 0;
  const dates = [...active].filter((d) => d <= today).sort();
  if (!dates.length) return { covered, bank };
  let weekActive = 0;
  for (let d = dates[0], guard = 0; d <= today && guard < 11000; d = addDays(d, 1), guard++) {
    if (mondayOf(d) === d) weekActive = 0;
    if (active.has(d)) weekActive++;
    else if (d !== today && bank > 0) {
      bank--;
      covered.add(d);
    }
    if (addDays(mondayOf(d), 6) === d && weekActive === 7 && bank < 2) bank++;
  }
  return { covered, bank };
}

/** App-wide day streak; today not yet logged doesn't break it. */
export function streakOf(days: Set<string>, today: string): number {
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function levelOf(totalXp: number): { level: number; toNext: number } {
  let level = 1;
  let left = Math.max(0, totalXp);
  let cost = Math.round(100 * Math.pow(1.25, level - 1));
  while (left >= cost) {
    left -= cost;
    level++;
    cost = Math.round(100 * Math.pow(1.25, level - 1));
  }
  return { level, toNext: cost - left };
}

const CLASS_NAMES: Record<string, string> = { warrior: 'Warrior', scholar: 'Scholar', monk: 'Monk', guildmaster: 'Guildmaster', bard: 'Bard' };

/** Everything the messages need, from one cloud save. */
export function summarize(save: Json, today: string) {
  const ledger: Json[] = Array.isArray(save?.ledger) ? save.ledger.filter((e: Json) => isDate(e?.date)) : [];
  const quests: Json[] = Array.isArray(save?.quests) ? save.quests : [];
  const active = new Set<string>(ledger.map((e) => e.date as string).filter((d) => d <= today));
  const { covered, bank } = shields(active, today);
  const streak = streakOf(new Set([...active, ...covered]), today);
  const todays = ledger.filter((e) => e.date === today);
  const xpToday = todays.reduce((s, e) => s + (Number(e.xp) || 0), 0);
  const past = [...active].filter((d) => d < today).sort();
  const lastActive = past.length ? past[past.length - 1] : null;
  const dawnIds = new Set(quests.filter((q) => q?.active !== false && q?.type === 'daily' && q?.phase === 'dawn').map((q) => q.id));
  const doneToday = new Set(todays.filter((e) => (e.kind ?? 'full') === 'full' || e.kind === 'minimum').map((e) => e.questId));
  const { level, toNext } = levelOf(ledger.reduce((s, e) => s + (Number(e.xp) || 0), 0));
  return {
    hero: CLASS_NAMES[save?.userClass] ?? 'hero',
    activeToday: todays.length > 0,
    xpToday,
    streak,
    shieldBank: bank,
    daysAway: lastActive && !todays.length ? dayDiff(lastActive, today) : 0,
    hasHistory: active.size > 0,
    dawnDone: dawnIds.size > 0 && [...dawnIds].every((id) => doneToday.has(id)),
    reflectedToday: todays.some((e) => e.kind === 'reflection'),
    level,
    toNext,
  };
}

const STATS_ORDER = ['body', 'mind', 'career', 'spirit', 'hobby'];
const STAT_NAMES: Record<string, string> = { body: 'Body', mind: 'Mind', career: 'Career', spirit: 'Spirit', hobby: 'Hobby' };

/** The Monday–Sunday week containing `today`, so far (mirror of src/utils/weeklyRecap.ts). */
export function weekSummary(save: Json, today: string) {
  const ledger: Json[] = Array.isArray(save?.ledger) ? save.ledger.filter((e: Json) => isDate(e?.date)) : [];
  const start = mondayOf(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const prevStart = addDays(start, -7);
  const dayXp = days.map(() => 0);
  const byStat: Record<string, number> = Object.fromEntries(STATS_ORDER.map((s) => [s, 0]));
  let prevTotalXp = 0;
  let wins = 0;
  for (const e of ledger) {
    if (e.date > today) continue;
    const xp = Number(e.xp) || 0;
    if (e.date >= prevStart && e.date < start) {
      prevTotalXp += xp;
      continue;
    }
    const i = days.indexOf(e.date);
    if (i < 0) continue;
    dayXp[i] += xp;
    if (e.stat in byStat) byStat[e.stat] += xp;
    if (e.kind === 'reflection') wins++;
  }
  const totalXp = dayXp.reduce((a, b) => a + b, 0);
  const bestI = dayXp.reduce((bi, x, i) => (x > dayXp[bi] ? i : bi), 0);
  return {
    totalXp,
    prevTotalXp,
    activeDays: new Set(ledger.filter((e) => e.date >= start && e.date <= today && days.includes(e.date)).map((e) => e.date)).size,
    best: totalXp > 0 ? { date: days[bestI], xp: dayXp[bestI] } : null,
    topStat: totalXp > 0 ? STATS_ORDER.reduce((a, b) => (byStat[b] > byStat[a] ? b : a)) : null,
    wins,
  };
}

export const COMEBACK_DAYS = 3;

/** The reminder for `kind`, or null when there's nothing worth saying (already done). */
export function buildMessage(kind: Kind, save: Json, today: string): Message | null {
  const tag = `hq-${kind}-${today}`;
  if (kind === 'weekly') {
    const w = weekSummary(save, today);
    if (w.totalXp <= 0) return null; // nothing to celebrate — no guilt trip
    const pct = w.prevTotalXp > 0 ? Math.round(((w.totalXp - w.prevTotalXp) / w.prevTotalXp) * 100) : null;
    const weekday = new Date(w.best!.date + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    const parts = [
      `+${w.totalXp} XP${pct !== null && pct >= 0 ? ` (+${pct}% on last week)` : ''}`,
      `${w.activeDays}/7 days`,
      `best: ${weekday} (+${w.best!.xp})`,
    ];
    const extra = [
      w.topStat ? `${STAT_NAMES[w.topStat]} led the week.` : '',
      w.wins ? `${w.wins} Campfire win${w.wins === 1 ? '' : 's'}.` : '',
      w.activeDays === 7 ? '🛡 Perfect week!' : '',
    ].filter(Boolean).join(' ');
    return { title: '📜 Your week in review', body: `${parts.join(' · ')}. ${extra}`.trim(), tag, url: '/?view=recap' };
  }
  const s = summarize(save, today);
  const comeback = s.hasHistory && s.daysAway >= COMEBACK_DAYS;
  const levelHint = s.toNext <= 60 ? ` ${s.toNext} XP to Level ${s.level + 1}.` : '';

  if (kind === 'dawn') {
    if (s.dawnDone) return null;
    if (comeback) return { title: `☀ Your ${s.hero} waited`, body: `A fresh start, no penalty. One small quest this morning begins it again.`, tag };
    if (s.streak > 0) return { title: '☀ Dawn Ritual', body: `Day ${s.streak + (s.activeToday ? 0 : 1)} begins. Finish your ritual for +10% XP today.`, tag };
    return { title: '☀ Dawn Ritual', body: 'Start your day — finish the ritual for a +10% XP buff.', tag };
  }

  if (kind === 'daily') {
    if (s.activeToday) return null;
    if (comeback) return { title: `Your ${s.hero} waited`, body: `${s.daysAway} days away — no penalty. One small quest starts you again.`, tag };
    if (s.streak > 0) {
      const shield = s.shieldBank > 0 ? ' 🛡 You have a shield, but tonight you won’t need it.' : '';
      return { title: `🔥 Day ${s.streak + 1} is waiting`, body: `One quest keeps your ${s.streak}-day streak alive.${shield}${levelHint}`, tag };
    }
    return { title: 'Your quests are waiting', body: `One small win today is enough.${levelHint}`, tag };
  }

  // campfire
  if (s.reflectedToday) return null;
  if (s.activeToday) return { title: '🔥 The Campfire', body: `+${s.xpToday} XP today. Bank one win to close the day.${levelHint}`, tag };
  if (s.streak > 0) return { title: '🔥 The Campfire', body: `Your ${s.streak}-day streak is still open tonight. One quick quest, then bank the day.`, tag };
  return { title: '🔥 The Campfire', body: 'Wind down and bank one win from today.', tag };
}

/** Local date and HH:MM in a timezone (falls back to UTC on a bad zone). */
export function localNow(tz: string, at: Date = new Date()): { date: string; hhmm: string } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  } catch {
    return localNow('UTC', at);
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hhmm: `${get('hour').padStart(2, '0')}:${get('minute')}` };
}
