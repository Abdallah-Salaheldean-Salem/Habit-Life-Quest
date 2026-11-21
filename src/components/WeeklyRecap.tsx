/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { ScrollText, Shield, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { LedgerEntry, STATS, StatType } from '../types';
import { getDaysAgoStr, getMonday } from '../utils/logic';
import { weekRecap, defaultRecapStart, weekDelta } from '../utils/weeklyRecap';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const STAT_ORDER: StatType[] = ['body', 'mind', 'career', 'spirit', 'hobby'];
const fmt = (d: string, opts: Intl.DateTimeFormatOptions) => new Date(`${d}T00:00:00`).toLocaleDateString('en-US', opts);

/** A Monday–Sunday look back: XP, active days, stats, best day and Campfire wins. */
export default function WeeklyRecap({
  ledger,
  todayStr,
  shieldsEarnedOn = [],
}: {
  ledger: LedgerEntry[];
  todayStr: string;
  /** Sundays on which a streak shield was earned (from utils/shields). */
  shieldsEarnedOn?: string[];
}) {
  const thisWeek = getMonday(todayStr);
  const lastWeek = getDaysAgoStr(thisWeek, 7);
  // Which week is chosen, not a fixed date: the app's date can change after
  // the first render (the save loads, the day rolls over), and the recap follows.
  const [choice, setChoice] = useState<'this' | 'last' | null>(null);
  const start = choice === 'this' ? thisWeek : choice === 'last' ? lastWeek : defaultRecapStart(todayStr);
  const r = useMemo(() => weekRecap(ledger, start, todayStr), [ledger, start, todayStr]);
  const delta = weekDelta(r);
  const maxDay = Math.max(1, ...r.dayXp);
  const statTotal = Math.max(1, r.totalXp);

  return (
    <div id="weekly-recap" className="mb-6 rounded-xl border border-[#d4af37]/20 bg-[#15152a] p-4 shadow-[0_0_15px_rgba(212,175,55,0.05)] sm:p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/5 pb-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 font-serif text-sm uppercase tracking-widest text-[#d4af37]">
            <ScrollText className="h-4 w-4" /> Weekly recap
          </h3>
          <p className="mt-0.5 font-mono text-[10px] uppercase text-slate-400">
            {fmt(r.start, { month: 'short', day: 'numeric' })} – {fmt(r.end, { month: 'short', day: 'numeric' })}
            {r.ongoing ? ' · so far' : ''}
          </p>
        </div>
        <div role="tablist" aria-label="Recap week" className="flex shrink-0 rounded-lg border border-white/5 bg-[#0c0c1b] p-0.5">
          {([['This week', thisWeek, 'this'], ['Last week', lastWeek, 'last']] as const).map(([label, s, c]) => (
            <button
              key={label}
              role="tab"
              aria-selected={start === s}
              onClick={() => setChoice(c)}
              className={`rounded px-2 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors cursor-pointer ${
                start === s ? 'bg-white/10 text-[#d4af37]' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {r.totalXp === 0 ? (
        <p className="py-4 text-center font-serif text-sm italic text-slate-400">
          {r.ongoing ? 'Nothing logged this week yet — one quest starts it.' : 'A quiet week. The next one starts fresh.'}
        </p>
      ) : (
        <>
          {/* Headline: XP + change */}
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-serif text-3xl font-bold leading-none text-[#d4af37]" data-testid="recap-xp">
                +{r.totalXp} <span className="text-base font-normal">XP</span>
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                {r.activeDays} of 7 days · {r.questsDone} quest{r.questsDone === 1 ? '' : 's'}
              </p>
            </div>
            {delta !== null && (
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] font-bold ${
                  delta >= 0 ? 'border-emerald-500/30 text-emerald-300' : 'border-slate-500/30 text-slate-400'
                }`}
              >
                {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {delta >= 0 ? '+' : ''}
                {delta}% vs week before
              </span>
            )}
          </div>

          {/* Seven days */}
          <div className="mt-4 grid grid-cols-7 gap-1.5" aria-label="XP per day">
            {r.dayXp.map((xp, i) => {
              const future = r.days[i] > todayStr;
              const best = r.best?.date === r.days[i];
              return (
                <div key={r.days[i]} className="flex flex-col items-center gap-1" title={`${fmt(r.days[i], { weekday: 'long' })}: ${xp} XP`}>
                  <div className="flex h-14 w-full items-end overflow-hidden rounded-md bg-[#1a1a2e]">
                    <div
                      className={`w-full rounded-md transition-[height] duration-700 ${best ? 'bg-[#f3e5ab]' : 'bg-[#d4af37]/70'}`}
                      style={{ height: future ? 0 : `${xp > 0 ? Math.max(10, (xp / maxDay) * 100) : 0}%` }}
                    />
                  </div>
                  <span className={`font-mono text-[9px] ${xp > 0 ? 'text-[#d4af37]' : future ? 'text-slate-700' : 'text-slate-500'}`}>
                    {DAY_LETTERS[i]}
                  </span>
                </div>
              );
            })}
          </div>
          {r.best && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Best day: <span className="text-[#f3e5ab]">{fmt(r.best.date, { weekday: 'long' })}</span> · +{r.best.xp} XP
            </p>
          )}

          {/* Stats */}
          <div className="mt-4 space-y-1.5">
            {STAT_ORDER.filter((s) => r.byStat[s] > 0).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <span className="w-14 shrink-0 font-mono text-[9px] uppercase" style={{ color: STATS[s].color }}>
                  {STATS[s].name}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded bg-[#1a1a2e]">
                  <div className="h-full rounded" style={{ width: `${(r.byStat[s] / statTotal) * 100}%`, backgroundColor: STATS[s].color }} />
                </div>
                <span className="w-10 shrink-0 text-right font-mono text-[9px] tabular-nums text-slate-400">{r.byStat[s]}</span>
              </div>
            ))}
          </div>
          {r.topStat && (
            <p className="mt-2 font-serif text-xs italic text-slate-400">
              <span style={{ color: STATS[r.topStat].color }}>{STATS[r.topStat].name}</span> led the week.
            </p>
          )}

          {/* Campfire wins */}
          {r.wins.length > 0 && (
            <div className="mt-4 border-t border-white/5 pt-3">
              <p className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-widest text-orange-200/70">Campfire wins</p>
              <ul className="space-y-1">
                {r.wins.slice(-3).map((w) => (
                  <li key={w.date + w.text} className="font-serif text-xs italic leading-snug text-orange-100/90">
                    “{w.text}”{' '}
                    <span className="not-italic font-mono text-[8px] uppercase tracking-wider text-slate-500">
                      {fmt(w.date, { weekday: 'short' })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Badges */}
          {(r.perfect || r.bounties > 0) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {r.perfect && (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-sky-300">
                  <Shield className="h-3 w-3" /> Perfect week{shieldsEarnedOn.includes(r.end) ? ' · shield earned' : ''}
                </span>
              )}
              {r.bounties > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#d4af37]">
                  <Target className="h-3 w-3" /> {r.bounties} bount{r.bounties === 1 ? 'y' : 'ies'}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
