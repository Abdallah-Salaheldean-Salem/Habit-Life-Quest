/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Lock } from 'lucide-react';
import { UserClass } from '../types';
import { CLASS_LOOKS, resolveLook } from '../data/classHeroes';
import { LegendProgress, metricLabel } from '../utils/legends';
import ClassHero from './ClassHero';

const ROMAN = ['I', 'II', 'III', 'IV'];

/**
 * Your hero's legend: the hero drawn at their current chapters, the chapter's
 * line of story, and the three upgrades with what earns the next step.
 */
export default function LegendCard({
  progress,
  userClass,
  heroLook,
}: {
  progress: LegendProgress | null;
  userClass: UserClass;
  heroLook: string;
}) {
  const look = resolveLook(userClass, heroLook);

  if (!progress) {
    const def = CLASS_LOOKS[userClass][0];
    return (
      <div id="legend-card" className="mb-6 rounded-xl border border-[#d4af37]/20 bg-[#15152a] p-4 sm:p-6">
        <h3 className="flex items-center gap-1.5 font-serif text-sm uppercase tracking-widest text-[#d4af37]">
          <BookOpen className="h-4 w-4" /> Legend
        </h3>
        <p className="mt-2 font-serif text-sm italic leading-relaxed text-slate-400">
          The {look.name}'s legend is still being written. The {def.name} already has one — switch looks in Edit Character to begin it.
        </p>
      </div>
    );
  }

  const { legend, tracks, chapter } = progress;
  return (
    <div id="legend-card" className="mb-6 rounded-xl border border-[#d4af37]/20 bg-[#15152a] p-4 shadow-[0_0_15px_rgba(212,175,55,0.05)] sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/5 pb-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 font-serif text-sm uppercase tracking-widest text-[#d4af37]">
            <BookOpen className="h-4 w-4" /> Legend
          </h3>
          <p className="mt-0.5 font-serif text-sm italic" style={{ color: look.light }}>
            {legend.title}
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-[#d4af37]/40 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[#d4af37]">
          Chapter {ROMAN[chapter]}
        </span>
      </div>

      <div className="flex gap-4">
        <ClassHero cls={userClass} look={heroLook} tiers={progress.tiers} idle className="w-24 sm:w-32 aspect-[2/3] shrink-0" title={`${look.name}, ${legend.chapters[chapter]}`} />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-lg font-bold uppercase tracking-[0.12em]" style={{ color: look.light }}>
            {legend.chapters[chapter]}
          </p>
          <p className="mt-1 font-serif text-[13px] italic leading-snug text-slate-300">{legend.lines[chapter]}</p>

          {/* The four chapters */}
          <ol className="mt-3 flex flex-wrap gap-1" aria-label="Chapters">
            {legend.chapters.map((name, i) => (
              <li
                key={name}
                aria-current={i === chapter ? 'step' : undefined}
                className={`rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider ${
                  i < chapter ? 'text-slate-400' : i === chapter ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'text-slate-600'
                }`}
              >
                {ROMAN[i]} · {name}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* The three upgrades, each earned its own way */}
      <ul className="mt-4 space-y-3" aria-label="Upgrades">
        {tracks.map(({ track, tier, value, next }) => {
          const prevStep = tier === 0 ? 0 : track.steps[tier - 1];
          const pct = next === null ? 100 : Math.max(4, Math.min(100, ((value - prevStep) / (next - prevStep)) * 100));
          return (
            <li key={track.id} data-track={track.id}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-500">{track.label} </span>
                  <span className="font-serif text-sm" style={{ color: tier ? look.light : '#cbd5e1' }}>
                    {track.names[tier]}
                  </span>
                </span>
                <span className="flex shrink-0 gap-0.5" aria-label={`Chapter ${ROMAN[tier]} of IV`}>
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="h-1.5 w-3 rounded-sm" style={{ backgroundColor: i <= tier ? look.color : '#1e293b' }} />
                  ))}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded bg-[#1a1a2e]">
                <div className="h-full rounded transition-[width] duration-700" style={{ width: `${pct}%`, backgroundColor: next === null ? '#d4af37' : look.color }} />
              </div>
              <p className="mt-0.5 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-slate-500">
                {next === null ? (
                  <span className="text-[#d4af37]">Complete</span>
                ) : (
                  <>
                    <Lock className="h-2.5 w-2.5" />
                    {track.names[tier + 1]}: {value} / {next} {metricLabel(track.metric)}
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
