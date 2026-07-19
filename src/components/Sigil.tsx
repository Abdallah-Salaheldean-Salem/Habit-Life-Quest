/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sword, BookOpen, Sparkles, Crown, Music, Shield } from 'lucide-react';
import { UserClass, StatType, STATS } from '../types';

const CLASS_IMAGES: Record<UserClass, string> = {
  warrior: 'https://images.unsplash.com/photo-1614036417651-efe5912149d8?auto=format&fit=crop&w=150&h=150&q=80',
  scholar: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&w=150&h=150&q=80',
  monk: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=150&h=150&q=80',
  guildmaster: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&h=150&q=80',
  bard: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=150&h=150&q=80'
};

interface SigilProps {
  userClass: UserClass;
  statXps: Record<StatType, number>;
  level: number;
}

export default function Sigil({ userClass, statXps, level }: SigilProps) {
  // Center and dimensions of the SVG
  const cx = 100;
  const cy = 100;
  const radius = 80;

  // Let's get the max XP of any stat to scale the pentagon, or scale by a fixed max (e.g., 1000 XP)
  // Let's normalize so that a stat is shown as progress from 0 to 1.
  // To avoid dividing by zero or having a tiny sigil, let's set a minimum max val of 500.
  const maxVal = Math.max(...Object.values(statXps), 500);

  // Axes indices:
  // 0: mind, 1: career, 2: hobby, 3: body, 4: spirit
  const axes: StatType[] = ['mind', 'career', 'hobby', 'body', 'spirit'];

  // Calculate coordinates for the pentagon points
  const getCoordinates = (stat: StatType, rScale: number) => {
    const index = axes.indexOf(stat);
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 5;
    const r = rScale * radius * 0.7; // Limit to 70% of outer radius
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  // Outer polygon path of full potential stats
  const gridPoints = axes.map((s) => getCoordinates(s, 1));
  const gridPath = gridPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Outer polygon path for intermediate grids
  const gridPointsHalf = axes.map((s) => getCoordinates(s, 0.5));
  const gridPathHalf = gridPointsHalf.map((p) => `${p.x},${p.y}`).join(' ');

  // User's actual stats polygon points
  const userPoints = axes.map((s) => {
    const xp = statXps[s] || 0;
    // Scale factor between 0.15 (to keep a small center shape) and 1.0
    const factor = 0.2 + (xp / maxVal) * 0.8;
    return getCoordinates(s, factor);
  });
  const userPath = userPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Generate ticks for the outer level ring
  const numTicks = 60;
  const ticks = Array.from({ length: numTicks }).map((_, i) => {
    const angle = (i * 2 * Math.PI) / numTicks;
    const r1 = radius - 2;
    // Every 5 ticks is slightly longer
    const r2 = i % 5 === 0 ? radius - 8 : radius - 5;
    return {
      x1: cx + r1 * Math.cos(angle),
      y1: cy + r1 * Math.sin(angle),
      x2: cx + r2 * Math.cos(angle),
      y2: cy + r2 * Math.sin(angle),
      isMajor: i % 5 === 0,
    };
  });

  // Get Lucide Icon for Class (mini badge style)
  const renderClassIconMini = () => {
    const iconProps = { className: 'w-3.5 h-3.5 text-[#d4af37]', strokeWidth: 2 };
    switch (userClass) {
      case 'warrior':
        return <Sword {...iconProps} />;
      case 'scholar':
        return <BookOpen {...iconProps} />;
      case 'monk':
        return <Sparkles {...iconProps} />;
      case 'guildmaster':
        return <Crown {...iconProps} />;
      case 'bard':
        return <Music {...iconProps} />;
      default:
        return <BookOpen {...iconProps} />;
    }
  };

  return (
    <div id="character-sigil-container" className="relative w-48 h-48 mx-auto my-4 select-none">
      <svg className="w-full h-full filter drop-shadow-[0_0_12px_rgba(223,192,138,0.15)]" viewBox="0 0 200 200">
        {/* Ambient background glow inside the seal */}
        <circle cx={cx} cy={cy} r={radius} className="fill-slate-900/40 stroke-none" />

        {/* Outer Engraved Level Ring */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          className="fill-none stroke-amber-500/30"
          strokeWidth="1"
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius - 3}
          className="fill-none stroke-amber-500/10"
          strokeWidth="0.5"
          strokeDasharray="4 2"
        />

        {/* Ring Tick Marks representing levels and progression */}
        {ticks.map((tick, index) => (
          <line
            key={index}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            className={tick.isMajor ? 'stroke-amber-400/45' : 'stroke-amber-500/20'}
            strokeWidth={tick.isMajor ? '1.5' : '1'}
          />
        ))}

        {/* Outer Ring boundary accents */}
        <circle
          cx={cx}
          cy={cy}
          r={radius - 8}
          className="fill-none stroke-amber-500/25"
          strokeWidth="0.5"
        />

        {/* Axis Lines connecting center to pentagon outer vertices */}
        {gridPoints.map((point, index) => (
          <line
            key={index}
            x1={cx}
            y1={cy}
            x2={point.x}
            y2={point.y}
            className="stroke-slate-500/20"
            strokeWidth="0.75"
            strokeDasharray="2 2"
          />
        ))}

        {/* Base Pentagon Grids */}
        <polygon
          points={gridPath}
          className="fill-none stroke-slate-500/15"
          strokeWidth="1"
        />
        <polygon
          points={gridPathHalf}
          className="fill-none stroke-slate-500/10"
          strokeWidth="0.75"
          strokeDasharray="3 3"
        />

        {/* Nodes for each user stat level on the pentagon */}
        {userPoints.map((point, index) => {
          const stat = axes[index];
          const color = STATS[stat].color;
          return (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="3.5"
              fill={color}
              className="stroke-slate-900 stroke-1 shadow-sm"
              filter="drop-shadow(0px 0px 4px rgba(255,255,255,0.4))"
            />
          );
        })}
      </svg>

      {/* Warrior / Class Portrait Photo centered inside the Sigil */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#d4af37]/80 ring-2 ring-[#d4af37]/35 shadow-xl shadow-black/90 flex items-center justify-center bg-slate-950">
          <img
            src={CLASS_IMAGES[userClass]}
            alt={userClass}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover rounded-full select-none"
          />
          {/* Subtle gradient overlay to blend into the card */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        {/* Mini Class Badge overlapping the bottom right corner of the portrait */}
        <div className="absolute translate-x-5 translate-y-5 w-6 h-6 bg-[#0c0f20] border border-[#d4af37]/75 rounded-full flex items-center justify-center shadow-lg shadow-black/80">
          {renderClassIconMini()}
        </div>
      </div>
    </div>
  );
}
