/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserClass, CLASSES, STATS } from '../types';
import { CLASS_HEROES } from '../data/classHeroes';
import { CLASS_BONUS } from '../utils/logic';
import { burst, playSfx } from '../utils/feedback';
import ClassHero from './ClassHero';

export const CLASS_ORDER: UserClass[] = ['warrior', 'scholar', 'monk', 'guildmaster', 'bard'];

/**
 * Character select: a roster of the five class heroes, and a stage showing
 * the chosen hero with its bonus and motto. Used for character creation and
 * for editing the character.
 */
export default function ClassPicker({ value, onChange }: { value: UserClass; onChange: (c: UserClass) => void }) {
  const cls = CLASSES[value];
  const stat = STATS[cls.bonusStat];
  const bonusPct = Math.round((CLASS_BONUS - 1) * 100);

  const pick = (c: UserClass, e: React.MouseEvent<HTMLButtonElement>) => {
    if (c !== value) {
      const r = e.currentTarget.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, [STATS[CLASSES[c].bonusStat].color, '#d4af37', '#f3e5ab'], { count: 14 });
      playSfx('tick');
    }
    onChange(c);
  };

  return (
    <div>
      {/* Roster */}
      <div role="radiogroup" aria-label="Class" className="grid grid-cols-5 gap-2">
        {CLASS_ORDER.map((c) => {
          const on = c === value;
          const color = STATS[CLASSES[c].bonusStat].color;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${CLASSES[c].name}: ${CLASSES[c].description}`}
              onClick={(e) => pick(c, e)}
              className={`group relative overflow-hidden rounded-lg border bg-[#0c0c1b] transition-all cursor-pointer ${
                on ? '-translate-y-0.5' : 'border-white/5 opacity-75 grayscale-[45%] hover:opacity-100 hover:grayscale-0'
              }`}
              style={on ? { borderColor: color, boxShadow: `0 0 16px ${color}66` } : undefined}
            >
              <ClassHero cls={c} className="block w-full aspect-[2/3]" />
              <span
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent pb-1 pt-3 text-center font-mono text-[7px] sm:text-[8px] font-bold uppercase tracking-wider"
                style={{ color: on ? color : '#94a3b8' }}
              >
                {/* Tiles are narrow on small phones; the stage shows the full name. */}
                <span className="sm:hidden">{c === 'guildmaster' ? 'Guild' : CLASSES[c].name}</span>
                <span className="hidden sm:inline">{CLASSES[c].name}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Stage */}
      <div
        className="mt-3 flex items-center gap-4 overflow-hidden rounded-xl border p-3 sm:p-4"
        style={{ borderColor: `${stat.color}55`, background: `linear-gradient(180deg, ${stat.color}14, rgba(12,12,27,0.6))` }}
        aria-live="polite"
      >
        <ClassHero key={value} cls={value} idle className="w-24 sm:w-28 aspect-[2/3] shrink-0 animate-fade-in" title={cls.name} />
        <div className="min-w-0">
          <p className="font-serif text-lg font-bold uppercase tracking-[0.18em]" style={{ color: stat.color }}>
            {cls.name}
          </p>
          <p className="mt-0.5 inline-block rounded-md border px-2 py-0.5 leading-relaxed font-mono text-[9px] font-bold uppercase tracking-wider" style={{ color: stat.color, borderColor: `${stat.color}66` }}>
            +{bonusPct}% XP on {stat.name} quests
          </p>
          <p className="mt-1.5 font-serif text-[13px] italic leading-snug text-slate-300">{CLASS_HEROES[value].motto}</p>
        </div>
      </div>
    </div>
  );
}
