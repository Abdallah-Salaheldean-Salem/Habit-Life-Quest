/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LedgerEntry } from '../types';
import { getDaysAgoStr } from '../utils/logic';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

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

  const levelColors = [
    '#101020',
    'rgba(212, 175, 55, 0.3)',
    'rgba(212, 175, 55, 0.5)',
    'rgba(212, 175, 55, 0.8)',
    '#d4af37'
  ];

  const formatHeatmapDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
  };
  
  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const last7DaysData = dailyStats.slice(-7).map(stat => ({
    ...stat,
    shortDay: formatShortDate(stat.date)
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#050510] border border-[#d4af37]/30 rounded-md p-2.5 shadow-xl text-left">
          <p className="font-sans text-[10px] font-bold text-slate-200">{label}</p>
          <div className="border-t border-white/5 my-1"></div>
          <p className="font-mono text-[9px] text-[#d4af37]">{payload[0].value} quests cleared</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="chronicle-card" className="bg-[#15152a] border border-[#d4af37]/20 rounded-lg p-6 shadow-[0_0_15px_rgba(212,175,55,0.05)] relative flex flex-col gap-8">
      
      {/* HEATMAP SECTION */}
      <div>
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
      </div>

      {/* BAR CHART SECTION */}
      <div>
        <div className="mb-4">
          <h3 className="font-serif text-sm tracking-widest text-[#d4af37] uppercase">
            Consistency Trend
          </h3>
          <p className="font-mono text-[10px] text-slate-400 uppercase mt-0.5">
            Quests Cleared (Last 7 Days)
          </p>
        </div>
        
        <div className="h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="shortDay" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }} 
                allowDecimals={false}
              />
              <Tooltip cursor={{ fill: 'rgba(212,175,55,0.05)' }} content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={30}>
                {last7DaysData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={levelColors[entry.level]} stroke="rgba(212,175,55,0.2)" strokeWidth={1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex justify-center mt-2 border-t border-white/5 pt-4">
        <p className="font-mono text-[9px] text-slate-500 uppercase tracking-wider text-center">
          Every shaded day holds the memory of your discipline.
        </p>
      </div>
    </div>
  );
}
