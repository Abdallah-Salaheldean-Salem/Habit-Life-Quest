/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { UserClass } from '../types';
import { resolveLook } from '../data/classHeroes';
import { LegendProgress } from '../utils/legends';
import { burst, playSfx, buzz } from '../utils/feedback';
import ClassHero from './ClassHero';

const ROMAN = ['I', 'II', 'III', 'IV'];

/** Full-screen moment when the hero reaches a new chapter of their legend. */
export default function ChapterMoment({
  progress,
  userClass,
  heroLook,
  onClose,
}: {
  progress: LegendProgress;
  userClass: UserClass;
  heroLook: string;
  onClose: () => void;
}) {
  const look = resolveLook(userClass, heroLook);
  const { legend, chapter } = progress;

  useEffect(() => {
    const t = setTimeout(() => {
      burst(window.innerWidth / 2, window.innerHeight * 0.38, [look.color, look.light, '#d4af37', '#f3e5ab'], { count: 60, speed: 0.36, life: 1300, size: 2.8, up: true });
      playSfx('mastery');
      buzz([30, 50, 30]);
    }, 250);
    return () => clearTimeout(t);
  }, [look.color, look.light]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#050510]/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="chapter-title" onClick={onClose}>
      <div className="w-full max-w-sm text-center animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#d4af37]">{legend.title}</p>
        <ClassHero cls={userClass} look={heroLook} tiers={progress.tiers} idle className="mx-auto mt-3 w-40 aspect-[2/3]" title={look.name} />
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400">Chapter {ROMAN[chapter]} unlocked</p>
        <h2 id="chapter-title" className="mt-1 font-serif text-2xl font-bold uppercase tracking-[0.14em]" style={{ color: look.light }}>
          {legend.chapters[chapter]}
        </h2>
        <p className="mt-2 font-serif text-sm italic leading-relaxed text-slate-300">{legend.lines[chapter]}</p>
        <button
          onClick={onClose}
          className="mt-5 rounded-lg bg-gradient-to-r from-[#aa7c11] to-[#d4af37] px-6 py-2.5 font-sans text-xs font-bold uppercase tracking-widest text-[#050510] transition-all hover:from-[#d4af37] hover:to-[#f3e5ab] cursor-pointer"
        >
          Continue the legend
        </button>
      </div>
    </div>
  );
}
