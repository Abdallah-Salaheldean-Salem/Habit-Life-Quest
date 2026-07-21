/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { STATS, StatType, UserClass, CLASSES } from '../types';
import { getStatRank } from '../utils/logic';

interface SigilProps {
  userClass: UserClass;
  statXps: Record<StatType, number>;
  level: number;
}

const STAT_ORDER: StatType[] = ['body', 'mind', 'career', 'hobby', 'spirit'];

/**
 * A dynamic, engraved sigil. Each of the five stats pushes a vertex of the
 * inner polygon outward as its rank grows, so the emblem visibly reshapes
 * itself as the hero develops. The class's bonus stat is highlighted.
 */
export default function Sigil({ userClass, statXps, level }: SigilProps) {
  const size = 180;
  const center = size / 2;
  const maxRadius = 66;
  const minRadius = 18;
  const bonusStat = CLASSES[userClass].bonusStat;

  const points = STAT_ORDER.map((stat, i) => {
    const angle = (Math.PI * 2 * i) / STAT_ORDER.length - Math.PI / 2;
    const rank = getStatRank(statXps[stat] ?? 0);
    // Saturate around rank 6 so the sigil keeps growing but stays in-frame.
    const t = Math.min(1, rank / 6);
    const radius = minRadius + t * (maxRadius - minRadius);
    return {
      stat,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      outerX: center + Math.cos(angle) * maxRadius,
      outerY: center + Math.sin(angle) * maxRadius,
    };
  });

  const polygon = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="flex justify-center py-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="glow-active">
        {/* Outer engraved rings */}
        <circle cx={center} cy={center} r={maxRadius + 12} fill="none" stroke="#d4af37" strokeOpacity="0.25" strokeWidth="1" />
        <circle cx={center} cy={center} r={maxRadius + 6} fill="none" stroke="#d4af37" strokeOpacity="0.4" strokeWidth="1.5" />

        {/* Axis guide-lines */}
        {points.map((p) => (
          <line
            key={`axis-${p.stat}`}
            x1={center}
            y1={center}
            x2={p.outerX}
            y2={p.outerY}
            stroke={STATS[p.stat].color}
            strokeOpacity="0.2"
            strokeWidth="1"
          />
        ))}

        {/* The living stat polygon */}
        <motion.polygon
          points={polygon}
          fill="url(#sigilFill)"
          stroke="#d4af37"
          strokeWidth="2"
          strokeLinejoin="round"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', bounce: 0.35, duration: 0.9 }}
          style={{ transformOrigin: 'center' }}
        />

        {/* Stat vertices */}
        {points.map((p) => {
          const isBonus = p.stat === bonusStat;
          return (
            <circle
              key={`node-${p.stat}`}
              cx={p.x}
              cy={p.y}
              r={isBonus ? 4.5 : 3}
              fill={STATS[p.stat].color}
              stroke="#050510"
              strokeWidth="1"
            />
          );
        })}

        {/* Level core */}
        <circle cx={center} cy={center} r={15} fill="#050510" stroke="#d4af37" strokeWidth="1.5" />
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="serif"
          fontWeight="bold"
          fontSize="14"
          fill="#d4af37"
        >
          {level}
        </text>

        <defs>
          <radialGradient id="sigilFill" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#d4af37" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#aa7c11" stopOpacity="0.12" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}
