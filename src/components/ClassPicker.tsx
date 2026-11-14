/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserClass, CLASSES, STATS } from '../types';
import { CLASS_SPRITES } from '../data/classSprites';
import { CLASS_BONUS } from '../utils/logic';
import { burst, playSfx } from '../utils/feedback';
import ClassSprite from './ClassSprite';

export const CLASS_ORDER: UserClass[] = ['warrior', 'scholar', 'monk', 'guildmaster', 'bard'];

/**
 * Character select: a roster of the five class portraits, and a stage
 * showing the chosen class idling on a pedestal with its bonus and motto.
 * Used for character creation and for editing the character.
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
              className={`relative aspect-square rounded-lg border p-1 transition-all cursor-pointer ${
                on ? 'scale-105' : 'border-white/5 bg-[#0c0c1b] opacity-60 grayscale-[60%] hover:opacity-90 hover:grayscale-0'
              }`}
              style={on ? { borderColor: color, backgroundColor: `${color}1f`, boxShadow: `0 0 14px ${color}55` } : undefined}
            >
              <ClassSprite cls={c} size="100%" />
            </button>
          );
        })}
      </div>

      {/* Stage */}
      <div
        className="mt-3 flex items-center gap-4 rounded-xl border p-3 sm:p-4"
        style={{ borderColor: `${stat.color}55`, background: `linear-gradient(180deg, ${stat.color}14, rgba(12,12,27,0.6))` }}
        aria-live="polite"
      >
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
          {/* pedestal */}
          <div
            className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[80%] h-[14%] rounded-[50%]"
            style={{ background: `radial-gradient(closest-side, ${stat.color}88, transparent)` }}
            aria-hidden
          />
          <ClassSprite key={value} cls={value} size="100%" idle className="relative animate-fade-in" title={`${cls.name} sprite`} />
        </div>
        <div className="min-w-0">
          <p className="font-serif text-lg font-bold uppercase tracking-[0.18em]" style={{ color: stat.color }}>
            {cls.name}
          </p>
          <p className="mt-0.5 inline-block rounded-md border px-2 py-0.5 leading-relaxed font-mono text-[9px] font-bold uppercase tracking-wider" style={{ color: stat.color, borderColor: `${stat.color}66` }}>
            +{bonusPct}% XP on {stat.name} quests
          </p>
          <p className="mt-1.5 font-serif text-[13px] italic leading-snug text-slate-300">{CLASS_SPRITES[value].motto}</p>
        </div>
      </div>
    </div>
  );
}
