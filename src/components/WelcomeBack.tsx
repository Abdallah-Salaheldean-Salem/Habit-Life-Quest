/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Quest, UserClass, STATS } from '../types';
import { resolveLook } from '../data/classHeroes';
import ClassHero from './ClassHero';
import { LegendTiers } from '../utils/legends';

/**
 * Shown once when you come back after a few days away. Warm, no penalties,
 * and one easy way back in (today's bounty, or your easiest quest).
 */
export default function WelcomeBack({
  days,
  userName,
  userClass,
  heroLook,
  tiers,
  level,
  quest,
  isBounty,
  onDo,
  onClose,
}: {
  days: number;
  userName: string;
  userClass: UserClass;
  heroLook: string;
  tiers?: LegendTiers | null;
  level: number;
  quest: Quest | null;
  isBounty: boolean;
  onDo: (q: Quest) => void;
  onClose: () => void;
}) {
  const look = resolveLook(userClass, heroLook);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#050510]/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="welcome-back-title">
      <div className="w-full max-w-sm rounded-2xl border p-6 text-center shadow-[0_0_60px_rgba(212,175,55,0.12)] animate-fade-in bg-[#15152a]" style={{ borderColor: `${look.color}55` }}>
        <ClassHero cls={userClass} look={heroLook} tiers={tiers} idle className="mx-auto w-28 aspect-[2/3]" title={look.name} />
        <h2 id="welcome-back-title" className="mt-3 font-serif text-xl font-bold tracking-wide text-[#d4af37]">
          Welcome back, {userName}
        </h2>
        <p className="mt-2 font-serif text-sm italic leading-relaxed text-slate-300">
          {days} days away — and no penalty. Your Level {level} {look.name} and everything you built are right where you left them.
        </p>

        {quest ? (
          <div className="mt-5 rounded-xl border border-white/10 bg-[#1a1a2e] p-3 text-left">
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-500">
              {isBounty ? "One easy way back in · today's bounty, +50% XP" : 'One easy way back in'}
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-100">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: STATS[quest.stat].color }} />
              <span className="min-w-0 truncate">{quest.title}</span>
            </p>
            <button
              onClick={() => onDo(quest)}
              className="mt-3 w-full rounded-lg bg-gradient-to-r from-[#aa7c11] to-[#d4af37] px-4 py-2.5 font-sans text-xs font-bold uppercase tracking-widest text-[#050510] transition-all hover:from-[#d4af37] hover:to-[#f3e5ab] cursor-pointer"
            >
              I did it — log it
            </button>
          </div>
        ) : null}

        <button
          onClick={onClose}
          className={`mt-3 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${
            quest ? 'text-slate-500 hover:text-slate-300' : 'w-full rounded-lg bg-gradient-to-r from-[#aa7c11] to-[#d4af37] px-4 py-2.5 text-[#050510]'
          }`}
        >
          {quest ? 'Not now — take me in' : "Let's go"}
        </button>
      </div>
    </div>
  );
}
