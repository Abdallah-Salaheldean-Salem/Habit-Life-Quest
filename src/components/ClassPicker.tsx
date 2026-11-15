/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserClass, CLASSES, STATS } from '../types';
import { CLASS_LOOKS, CLASS_MOTTOS, resolveLook } from '../data/classHeroes';
import { CLASS_BONUS } from '../utils/logic';
import { burst, playSfx } from '../utils/feedback';
import ClassHero from './ClassHero';

export const CLASS_ORDER: UserClass[] = ['warrior', 'scholar', 'monk', 'guildmaster', 'bard'];

const centre = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2] as const;
};

/**
 * Character select: a roster of the five class heroes, a stage showing the
 * chosen hero with its bonus and motto, and the looks available for that
 * class. Used for character creation and for editing the character.
 */
export default function ClassPicker({
  value,
  onChange,
  look,
  onLookChange,
}: {
  value: UserClass;
  onChange: (c: UserClass) => void;
  /** Chosen look id for `value`; invalid or empty means the class default. */
  look: string;
  onLookChange: (id: string) => void;
}) {
  const cls = CLASSES[value];
  const stat = STATS[cls.bonusStat];
  const bonusPct = Math.round((CLASS_BONUS - 1) * 100);
  const current = resolveLook(value, look);
  const looks = CLASS_LOOKS[value];

  const pick = (c: UserClass, e: React.MouseEvent<HTMLButtonElement>) => {
    if (c !== value) {
      const [x, y] = centre(e.currentTarget);
      burst(x, y, [STATS[CLASSES[c].bonusStat].color, '#d4af37', '#f3e5ab'], { count: 14 });
      playSfx('tick');
      onLookChange(CLASS_LOOKS[c][0].id);
    }
    onChange(c);
  };

  const pickLook = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (id !== current.id) {
      const [x, y] = centre(e.currentTarget);
      burst(x, y, [stat.color, '#d4af37'], { count: 8 });
      playSfx('tick');
    }
    onLookChange(id);
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
              <ClassHero cls={c} look={on ? current.id : undefined} className="block w-full aspect-[2/3]" />
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
        className="mt-3 overflow-hidden rounded-xl border p-3 sm:p-4"
        style={{ borderColor: `${stat.color}55`, background: `linear-gradient(180deg, ${stat.color}14, rgba(12,12,27,0.6))` }}
      >
        <div className="flex items-center gap-4" aria-live="polite">
          <ClassHero key={`${value}-${current.id}`} cls={value} look={current.id} idle className="w-24 sm:w-28 aspect-[2/3] shrink-0 animate-fade-in" title={current.name} />
          <div className="min-w-0">
            <p className="font-serif text-lg font-bold uppercase tracking-[0.18em]" style={{ color: stat.color }}>
              {cls.name}
            </p>
            <p className="font-serif text-[13px] italic text-[#d4af37]/90">{current.name}</p>
            <p className="mt-1 inline-block rounded-md border px-2 py-0.5 leading-relaxed font-mono text-[9px] font-bold uppercase tracking-wider" style={{ color: stat.color, borderColor: `${stat.color}66` }}>
              +{bonusPct}% XP on {stat.name} quests
            </p>
            <p className="mt-1.5 font-serif text-[13px] italic leading-snug text-slate-300">{CLASS_MOTTOS[value]}</p>
          </div>
        </div>

        {/* Looks for this class */}
        {looks.length > 1 && (
          <div className="mt-3 border-t border-white/5 pt-3">
            <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-widest text-slate-500">Look</p>
            <div role="radiogroup" aria-label="Hero look" className="flex flex-wrap gap-2">
              {looks.map((l) => {
                const on = l.id === current.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`${l.name}: ${l.alt}`}
                    onClick={(e) => pickLook(l.id, e)}
                    className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition-all cursor-pointer ${
                      on ? '' : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                    style={on ? { borderColor: stat.color, backgroundColor: `${stat.color}1f` } : undefined}
                  >
                    <ClassHero cls={value} look={l.id} bust backdrop={false} className="w-7 h-7 rounded-full bg-[#0c0c1b]" />
                    <span className="font-serif text-[12px]" style={{ color: on ? stat.color : '#cbd5e1' }}>
                      {l.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
