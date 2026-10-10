/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StatType, STATS } from '../types';
import { BRANCH_ORDER } from '../data/lifeTree';

/**
 * Five compact chips — Body, Mind, Career, Spirit, Hobby — for choosing which
 * core stat an entry feeds. The selected chip takes its stat's colour. Wraps
 * on narrow screens; used by the Dawn Ritual and Campfire inputs.
 */
export default function StatPicker({
  value,
  onChange,
  label = 'Stat',
  size = 'sm',
}: {
  value: StatType;
  onChange: (s: StatType) => void;
  /** Accessible name for the group. */
  label?: string;
  size?: 'xs' | 'sm';
}) {
  const pad = size === 'xs' ? 'px-2 py-0.5 text-[8px]' : 'px-2.5 py-1 text-[9px]';
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1">
      {BRANCH_ORDER.map((s) => {
        const active = value === s;
        const config = STATS[s];
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(s)}
            className={`rounded-full border font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${pad} ${
              active ? 'bg-white/5' : 'border-white/10 text-slate-500 hover:text-slate-300'
            }`}
            style={active ? { color: config.color, borderColor: config.color } : undefined}
          >
            {config.name}
          </button>
        );
      })}
    </div>
  );
}
