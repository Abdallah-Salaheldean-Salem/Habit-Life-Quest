/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useId } from 'react';
import { UserClass } from '../types';
import { CLASS_HEROES, HERO_VIEWBOX, heroDetail } from '../data/classHeroes';

/**
 * A class's hero: a dark silhouette backlit by the class's stat colour,
 * with light rays, a ground glow and its glowing signature item.
 * `bust` frames head and shoulders for small badges; `idle` makes the hero
 * breathe gently (off under reduced motion).
 */
export default function ClassHero({
  cls,
  bust = false,
  idle = false,
  backdrop = true,
  className = '',
  title,
}: {
  cls: UserClass;
  bust?: boolean;
  idle?: boolean;
  /** Draw the coloured glow, rays and ground behind the hero. */
  backdrop?: boolean;
  className?: string;
  /** Accessible name; omit for a decorative hero. */
  title?: string;
}) {
  const def = CLASS_HEROES[cls];
  const id = useId().replace(/:/g, '');
  const ids = { glow: `g${id}`, sil: `s${id}`, bg: `b${id}`, rim: `r${id}` };

  return (
    <svg
      viewBox={bust ? def.bust : HERO_VIEWBOX}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title ? `${title}. ${def.alt}` : undefined}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <radialGradient id={ids.bg} cx="50%" cy="38%" r="60%">
          <stop offset="0" stopColor={def.color} stopOpacity=".55" />
          <stop offset=".55" stopColor={def.color} stopOpacity=".12" />
          <stop offset="1" stopColor={def.color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ids.rim} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={def.light} />
          <stop offset=".6" stopColor={def.color} stopOpacity=".7" />
          <stop offset="1" stopColor={def.color} stopOpacity=".1" />
        </linearGradient>
        <linearGradient id={ids.sil} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1c34" />
          <stop offset="1" stopColor="#07070f" />
        </linearGradient>
        <filter id={ids.glow} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {backdrop && (
        <>
          <rect width="120" height="180" fill={`url(#${ids.bg})`} />
          <g opacity=".18" fill={def.light} className={idle ? 'hero-rays' : undefined}>
            <path d="M60 50 L20 0 H34Z" />
            <path d="M60 50 L52 0 H68Z" />
            <path d="M60 50 L86 0 H100Z" />
          </g>
          <ellipse cx="60" cy="171" rx="42" ry="5" fill={def.color} opacity=".35" />
        </>
      )}
      <g className={idle ? 'hero-idle' : undefined}>
        <path d={def.outline} fill={`url(#${ids.sil})`} stroke={`url(#${ids.rim})`} strokeWidth="1.3" strokeLinejoin="round" />
        {/* Static, authored art from data/classHeroes — never user input. */}
        <g dangerouslySetInnerHTML={{ __html: heroDetail(def, ids) }} />
      </g>
    </svg>
  );
}
