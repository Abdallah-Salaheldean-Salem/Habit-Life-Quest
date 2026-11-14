/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Flame, Shield, X } from 'lucide-react';
import { LedgerEntry, STATS } from '../types';
import { dayReplay } from '../utils/dayReplay';
import { getAppWideStreak, getDaysAgoStr, getMonday } from '../utils/logic';

interface ChronicleProps {
  ledger: LedgerEntry[];
  todayStr: string;
  /** Missed days a streak shield covered — counted as kept, drawn in blue. */
  shieldedDates?: Set<string>;
  /** Shields banked and ready. */
  shieldBank?: number;
}

const WEEKS = 15;
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

/** Maps a day's XP to a gold intensity level (0–4). */
function intensity(xp: number): number {
  if (xp <= 0) return 0;
  if (xp < 20) return 1;
  if (xp < 45) return 2;
  if (xp < 80) return 3;
  return 4;
}

const LEVEL_STYLE: Record<number, string> = {
  0: 'bg-[#1a1a2e] border-white/5',
  1: 'bg-[#d4af37]/20 border-[#d4af37]/20',
  2: 'bg-[#d4af37]/40 border-[#d4af37]/30',
  3: 'bg-[#d4af37]/70 border-[#d4af37]/50',
  4: 'bg-[#d4af37] border-[#f3e5ab]',
};

export default function Chronicle({ ledger, todayStr, shieldedDates = new Set(), shieldBank = 0 }: ChronicleProps) {
  // The day being replayed (tap a square), or null.
  const [selected, setSelected] = useState<string | null>(null);
  // Sum XP per day.
  const dailyXp = new Map<string, number>();
  for (const entry of ledger) {
    dailyXp.set(entry.date, (dailyXp.get(entry.date) || 0) + entry.xp);
  }

  // Grid runs from the Monday (WEEKS-1) weeks ago through today.
  const startMonday = getDaysAgoStr(getMonday(todayStr), (WEEKS - 1) * 7);

  const weeks: { date: string; xp: number; future: boolean }[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col: { date: string; xp: number; future: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = getDaysAgoStr(startMonday, -(w * 7 + d));
      col.push({ date, xp: dailyXp.get(date) || 0, future: date > todayStr });
    }
    weeks.push(col);
  }

  const activeDays = Array.from(dailyXp.keys()).filter((d) => d <= todayStr && (dailyXp.get(d) || 0) > 0).length;

  // 30-day consistency: distinct active days across the last 30 days.
  let last30Active = 0;
  for (let i = 0; i < 30; i++) {
    const date = getDaysAgoStr(todayStr, i);
    if ((dailyXp.get(date) || 0) > 0) last30Active++;
  }
  const consistencyPct = Math.round((last30Active / 30) * 100);

  const streak = getAppWideStreak([...dailyXp.keys(), ...shieldedDates], todayStr);
  const replay = selected ? dayReplay(ledger, selected) : null;
  const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div id="chronicle-panel" className="bg-[#15152a] border border-[#d4af37]/20 rounded-xl p-4 sm:p-6 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
      <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
        <div>
          <h3 className="font-serif text-sm tracking-widest text-[#d4af37] uppercase">CHRONICLE</h3>
          <p className="font-mono text-[10px] text-slate-400 uppercase mt-0.5">Your trail of discipline</p>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 uppercase">
          <Flame className={`w-3.5 h-3.5 text-[#d4af37] ${streak > 0 ? 'animate-pulse' : 'opacity-30'}`} />
          <span>
            <span className="text-[#d4af37] font-bold">{streak}</span> day streak
          </span>
          {shieldBank > 0 && (
            <span className="inline-flex items-center gap-0.5 text-sky-300" title={`${shieldBank} streak shield${shieldBank > 1 ? 's' : ''} ready`}>
              <Shield className="w-3 h-3" />
              {shieldBank}
            </span>
          )}
        </div>
      </div>

      {/* 30-day consistency progress bar */}
      <div className="mb-5">
        <div className="flex justify-between items-center font-mono text-[9px] text-slate-500 uppercase tracking-wider mb-1.5">
          <span>30-day consistency</span>
          <span>
            <span className="text-[#d4af37] font-bold">{last30Active}</span> / 30 days · {consistencyPct}%
          </span>
        </div>
        <div className="w-full bg-[#1a1a2e] h-2.5 rounded overflow-hidden border border-white/5 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-[#aa7c11] to-[#d4af37] rounded-r-sm shadow-[0_0_8px_rgba(212,175,55,0.6)] transition-[width] duration-700"
            style={{ width: `${consistencyPct}%` }}
          />
        </div>
      </div>

      {/* Contribution heatmap */}
      <div className="overflow-x-auto pb-2 hide-scrollbar">
        <div className="flex gap-[3px] min-w-max">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-[3px] mr-1">
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="h-4 sm:h-3 flex items-center">
                <span className="font-mono text-[7px] text-slate-600 uppercase pr-1">{label}</span>
              </div>
            ))}
          </div>

          {weeks.map((col, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {col.map((cell) =>
                cell.future ? (
                  <div key={cell.date} className="w-4 h-4 sm:w-3 sm:h-3" aria-hidden />
                ) : (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => setSelected(selected === cell.date ? null : cell.date)}
                    aria-pressed={selected === cell.date}
                    aria-label={`${fmtDay(cell.date)}: ${cell.xp} XP${shieldedDates.has(cell.date) ? ', covered by a shield' : ''}`}
                    title={`${cell.date} · ${cell.xp} XP${shieldedDates.has(cell.date) ? ' · shield' : ''}`}
                    className={`w-4 h-4 sm:w-3 sm:h-3 rounded-sm border cursor-pointer transition-transform hover:scale-125 ${
                      shieldedDates.has(cell.date) ? 'bg-sky-500/15 border-sky-400/70' : LEVEL_STYLE[intensity(cell.xp)]
                    } ${selected === cell.date ? 'ring-2 ring-[#f3e5ab] ring-offset-1 ring-offset-[#15152a]' : ''}`}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Day replay — what happened on the tapped day */}
      {replay ? (
        <div className="mt-3 rounded-lg border border-white/5 bg-[#1a1a2e] p-3 animate-fade-in" aria-live="polite">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-serif text-sm text-[#d4af37] tracking-wide">{fmtDay(replay.date)}</h4>
              <p className="font-mono text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">
                {replay.quests.length} quest{replay.quests.length === 1 ? '' : 's'} · {replay.totalXp} XP
                {shieldedDates.has(replay.date) && <span className="text-sky-300"> · covered by a shield</span>}
              </p>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="p-1 text-slate-500 hover:text-[#d4af37] cursor-pointer" aria-label="Close day replay">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {replay.quests.length + replay.other.length === 0 && !replay.win ? (
            <p className="mt-2 font-sans text-xs text-slate-500">
              {shieldedDates.has(replay.date) ? 'A rest day — your shield kept the streak alive.' : 'Nothing logged this day.'}
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {[...replay.quests, ...replay.other].map((q, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-slate-200">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATS[q.stat].color }} />
                  <span className="min-w-0 truncate">{q.title}</span>
                  {'minimum' in q && q.minimum && <span className="font-mono text-[8px] uppercase text-[#d4af37]/70">min</span>}
                  <span className="ml-auto font-mono text-[9px] text-slate-400 tabular-nums">+{q.xp}</span>
                </li>
              ))}
            </ul>
          )}
          {replay.win && (
            <p className="mt-2 border-t border-white/5 pt-2 font-serif italic text-xs text-orange-100/90">
              “{replay.win.text}” <span className="not-italic font-mono text-[8px] uppercase tracking-wider" style={{ color: STATS[replay.win.stat].color }}>· {STATS[replay.win.stat].name}</span>
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 font-mono text-[8px] text-slate-600 uppercase tracking-wider">Tap a day to replay it</p>
      )}

      {/* Footer: total active days + legend */}
      <div className="flex items-center justify-between mt-4 font-mono text-[8px] text-slate-500 uppercase">
        <span>
          <span className="text-[#d4af37] font-bold">{activeDays}</span> active days
        </span>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((lvl) => (
            <div key={lvl} className={`w-3 h-3 rounded-sm border ${LEVEL_STYLE[lvl]}`} />
          ))}
          <span>More</span>
          <span className="w-3 h-3 rounded-sm border bg-sky-500/15 border-sky-400/70 ml-1" aria-hidden />
          <span>Shield</span>
        </div>
      </div>
    </div>
  );
}
