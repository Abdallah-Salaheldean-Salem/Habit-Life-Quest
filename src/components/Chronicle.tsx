/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LedgerEntry } from '../types';
import { getDaysAgoStr } from '../utils/logic';

interface ChronicleProps {
  ledger: LedgerEntry[];
  todayStr: string;
}

export default function Chronicle({ ledger, todayStr }: ChronicleProps) {
  // Let's get the last 30 days, starting from 29 days ago up to today
  const last30Days = Array.from({ length: 30 }).map((_, i) => {
    // 29 days ago is first, today is last
    return getDaysAgoStr(todayStr, 29 - i);
  });

  // Calculate completions for each day
  const dailyStats = last30Days.map((dateStr) => {
    const dayEntries = ledger.filter((entry) => entry.date === dateStr);
    const count = dayEntries.length;
    const totalXp = dayEntries.reduce((sum, e) => sum + e.xp, 0);

    // Shading levels (0 to 4):
    // 0: 0 clears
    // 1: 1 clear
    // 2: 2 clears
    // 3: 3 clears
    // 4: 4+ clears
    let level = 0;
    if (count === 1) level = 1;
    else if (count === 2) level = 2;
    else if (count === 3) level = 3;
    else if (count >= 4) level = 4;

    return {
      date: dateStr,
      count,
      totalXp,
      level,
    };
  });

  // Level colour classes mapping for dark fantasy theme
  const levelClasses = [
    'bg-[#101020] border-white/5 hover:bg-[#1a1a2e]',                                // Level 0 (Quiet)
    'bg-[#d4af37]/10 border-[#d4af37]/20 hover:bg-[#d4af37]/20 text-[#d4af37]',        // Level 1
    'bg-[#d4af37]/30 border-[#d4af37]/40 hover:bg-[#d4af37]/40 text-[#f3e5ab]',        // Level 2
    'bg-[#d4af37]/60 border-[#d4af37]/70 hover:bg-[#d4af37]/70 text-slate-900',       // Level 3
    'bg-[#d4af37] border-white/20 hover:bg-[#f3e5ab] text-slate-900',                 // Level 4 (Full)
  ];

  const formatHeatmapDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
  };

  return (
    <div id="chronicle-card" className="bg-[#15152a] border border-[#d4af37]/20 rounded-lg p-6 shadow-[0_0_15px_rgba(212,175,55,0.05)] relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-serif text-sm tracking-widest text-[#d4af37] uppercase">
            CHRONICLE
          </h3>
          <p className="font-mono text-[10px] text-slate-400 uppercase mt-0.5">
            Last 30 Days of Effort
          </p>
        </div>

        {/* Shading Legend */}
        <div className="flex items-center gap-2 font-mono text-[9px] text-slate-500">
          <span className="uppercase">Quiet</span>
          <div className="flex gap-1.5">
            {levelClasses.map((cls, idx) => (
              <div
                key={idx}
                className={`w-3 h-3 rounded-sm border ${cls.split(' ')[0]} ${cls.split(' ')[1]}`}
                title={`Level ${idx}: ${idx === 0 ? '0' : idx === 4 ? '4+' : idx} Clears`}
              />
            ))}
          </div>
          <span className="uppercase">Full</span>
        </div>
      </div>

      {/* Grid of 30 days: 2 rows of 15 squares */}
      <div className="grid grid-cols-10 sm:grid-cols-15 gap-2 justify-center py-2">
        {dailyStats.map((day, idx) => {
          return (
            <div
              key={day.date}
              className={`aspect-square rounded-md border flex flex-col items-center justify-center relative group cursor-pointer transition-all duration-200 shadow-inner ${levelClasses[day.level]}`}
            >
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 bg-[#050510] border border-[#d4af37]/30 rounded-md p-2.5 shadow-xl w-36 pointer-events-none text-left">
                <p className="font-sans text-[10px] font-bold text-slate-200">
                  {formatHeatmapDate(day.date)}
                </p>
                <div className="border-t border-white/5 my-1"></div>
                <p className="font-mono text-[9px] text-[#d4af37]">
                  {day.count} {day.count === 1 ? 'quest' : 'quests'} cleared
                </p>
                <p className="font-mono text-[9px] text-emerald-400">
                  +{day.totalXp} XP logged
                </p>
              </div>

              {/* Day Number (very subtle, inside the box if it is Level 3/4, or hover) */}
              <span className={`font-mono text-[9px] font-medium transition-opacity duration-200 ${day.level >= 3 ? 'text-slate-900/60' : 'text-slate-400/10 group-hover:text-slate-400/60'}`}>
                {day.date.split('-')[2]}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center mt-6">
        <p className="font-mono text-[9px] text-slate-500 uppercase tracking-wider text-center">
          Every shaded day holds the memory of your discipline.
        </p>
      </div>
    </div>
  );
}
