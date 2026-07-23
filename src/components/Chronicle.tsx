/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Flame } from 'lucide-react';
import { LedgerEntry } from '../types';
import { getAppWideStreak, getDaysAgoStr, getMonday } from '../utils/logic';

interface ChronicleProps {
  ledger: LedgerEntry[];
  todayStr: string;
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

export default function Chronicle({ ledger, todayStr }: ChronicleProps) {
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

  const streak = getAppWideStreak(Array.from(dailyXp.keys()), todayStr);

  return (
    <div id="chronicle-panel" className="bg-[#15152a] border border-[#d4af37]/20 rounded-lg p-6 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
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
              <div key={i} className="h-3 flex items-center">
                <span className="font-mono text-[7px] text-slate-600 uppercase pr-1">{label}</span>
              </div>
            ))}
          </div>

          {weeks.map((col, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {col.map((cell) => (
                <div
                  key={cell.date}
                  title={cell.future ? cell.date : `${cell.date} · ${cell.xp} XP`}
                  className={`w-3 h-3 rounded-sm border ${
                    cell.future ? 'bg-transparent border-transparent' : LEVEL_STYLE[intensity(cell.xp)]
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

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
        </div>
      </div>
    </div>
  );
}
