/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { buildMessage, dueKinds, cleanPrefs, shields, streakOf, levelOf, localNow, addDays, summarize, MAX_PER_DAY } from '../../supabase/functions/hq-push/messages';
import { computeShields, shieldedStreak } from './shields';
import { getLevelAndProgress } from './logic';

const TODAY = '2026-11-21'; // a Saturday
const entry = (date: string, over: Record<string, unknown> = {}) => ({ id: `e-${date}-${Math.random()}`, date, questId: 'q1', questTitle: 'Read', xp: 10, stat: 'mind', kind: 'full', ...over });
const daysBack = (n: number[]) => n.map((k) => entry(addDays(TODAY, -k)));

describe('push reminder timing', () => {
  const prefs = cleanPrefs({ dawn: '07:30', daily: '19:00', campfire: '21:30', junk: '1', extra: 'x' });

  it('accepts only valid HH:MM times', () => {
    expect(cleanPrefs({ dawn: '7:30', daily: '25:00', campfire: '21:05' })).toEqual({ dawn: null, daily: null, campfire: '21:05' });
  });

  it('is due once the time is reached, not before, and not hours late', () => {
    expect(dueKinds(prefs, '07:29', TODAY, {})).toEqual([]);
    expect(dueKinds(prefs, '07:30', TODAY, {})).toEqual(['dawn']);
    expect(dueKinds(prefs, '10:31', TODAY, {})).toEqual([]); // > 3h late → skipped
  });

  it('sends each kind once a day', () => {
    expect(dueKinds(prefs, '07:45', TODAY, { dawn: TODAY })).toEqual([]);
    expect(dueKinds(prefs, '07:45', TODAY, { dawn: addDays(TODAY, -1) })).toEqual(['dawn']);
  });

  it(`never sends more than ${MAX_PER_DAY} a day`, () => {
    expect(dueKinds(prefs, '21:40', TODAY, { dawn: TODAY, daily: TODAY })).toEqual([]);
    expect(dueKinds(cleanPrefs({ daily: '21:00', campfire: '21:00', dawn: '21:00' }), '21:10', TODAY, {})).toHaveLength(MAX_PER_DAY);
  });

  it('reads local time in the device timezone', () => {
    const at = new Date('2026-11-21T23:30:00Z');
    expect(localNow('Africa/Cairo', at)).toEqual({ date: '2026-11-22', hhmm: '01:30' });
    expect(localNow('Not/AZone', at)).toEqual({ date: '2026-11-21', hhmm: '23:30' });
  });
});

describe('server streak + shields match the app', () => {
  it('on 300 random histories', () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let run = 0; run < 300; run++) {
      const active = new Set<string>();
      const density = rand();
      for (let k = 0; k < 70; k++) if (rand() < density) active.add(addDays(TODAY, -k));
      const app = computeShields(active, TODAY);
      const srv = shields(active, TODAY);
      expect(srv.bank).toBe(app.bank);
      expect([...srv.covered].sort()).toEqual([...app.shieldedDates].sort());
      expect(streakOf(new Set([...active, ...srv.covered]), TODAY)).toBe(shieldedStreak(active, app.shieldedDates, TODAY));
    }
  });

  it('levels match the app', () => {
    for (const xp of [0, 99, 100, 225, 1000, 5432]) {
      const app = getLevelAndProgress(xp);
      expect(levelOf(xp)).toEqual({ level: app.level, toNext: app.nextLevelCost - app.currentXp });
    }
  });
});

describe('push reminder wording', () => {
  const save = (ledger: unknown[], over: Record<string, unknown> = {}) => ({ userClass: 'scholar', quests: [], ledger, ...over });

  it('daily: streak nudge with the next day number, silent once you have logged', () => {
    const s = save(daysBack([1, 2, 3, 4]));
    expect(buildMessage('daily', s, TODAY)).toMatchObject({ title: '🔥 Day 5 is waiting', body: expect.stringContaining('4-day streak') });
    expect(buildMessage('daily', save([...daysBack([1, 2]), entry(TODAY)]), TODAY)).toBeNull();
  });

  it('daily: mentions a banked shield', () => {
    // Mon 2026-11-09 .. Sun 2026-11-15 perfect week, then active through yesterday.
    const s = save(daysBack([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]));
    expect(summarize(s, TODAY).shieldBank).toBe(1);
    expect(buildMessage('daily', s, TODAY)!.body).toContain('🛡');
  });

  it('comeback after 3+ days away is warm, with no streak talk', () => {
    const m = buildMessage('daily', save(daysBack([5, 6, 7])), TODAY)!;
    expect(m.title).toBe('Your Scholar waited');
    expect(m.body).toContain('5 days away');
    expect(m.body).toContain('no penalty');
  });

  it('campfire: reports XP today, silent after reflecting', () => {
    expect(buildMessage('campfire', save([entry(TODAY, { xp: 35 })]), TODAY)!.body).toContain('+35 XP today');
    expect(buildMessage('campfire', save([entry(TODAY, { kind: 'reflection' })]), TODAY)).toBeNull();
  });

  it('dawn: silent once every dawn quest is done today', () => {
    const quests = [{ id: 'd1', type: 'daily', phase: 'dawn', active: true }, { id: 'd2', type: 'daily', phase: 'dawn', active: true }];
    expect(buildMessage('dawn', save([entry(TODAY, { questId: 'd1' })], { quests }), TODAY)).not.toBeNull();
    expect(buildMessage('dawn', save([entry(TODAY, { questId: 'd1' }), entry(TODAY, { questId: 'd2' })], { quests }), TODAY)).toBeNull();
  });

  it('a brand-new character gets a gentle message, and a bad save never throws', () => {
    expect(buildMessage('daily', save([]), TODAY)!.title).toBe('Your quests are waiting');
    expect(() => buildMessage('daily', null, TODAY)).not.toThrow();
    expect(() => buildMessage('campfire', { ledger: 'nope' }, TODAY)).not.toThrow();
  });
});
