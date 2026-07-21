/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { STATS, StatType } from '../types';

interface RadarChartProps {
  statEffort: Record<StatType, { xp: number; percentage: number }>;
}

const STAT_ORDER: StatType[] = ['body', 'mind', 'career', 'hobby', 'spirit'];

/**
 * A five-axis radar plotting each stat's share of effort (percentage) for the
 * selected timeframe.
 */
export default function RadarChart({ statEffort }: RadarChartProps) {
  const size = 220;
  const center = size / 2;
  const maxRadius = 82;

  const axis = STAT_ORDER.map((stat, i) => {
    const angle = (Math.PI * 2 * i) / STAT_ORDER.length - Math.PI / 2;
    const pct = Math.max(0, Math.min(100, statEffort[stat]?.percentage ?? 0));
    // Scale so a single stat at 100% still fits; cap the visual at ~60% share.
    const t = Math.min(1, pct / 60);
    const radius = t * maxRadius;
    return {
      stat,
      angle,
      labelX: center + Math.cos(angle) * (maxRadius + 16),
      labelY: center + Math.sin(angle) * (maxRadius + 16),
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      gridX: center + Math.cos(angle) * maxRadius,
      gridY: center + Math.sin(angle) * maxRadius,
    };
  });

  const polygon = axis.map((a) => `${a.x.toFixed(1)},${a.y.toFixed(1)}`).join(' ');

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Concentric grid rings */}
      {rings.map((r) => (
        <polygon
          key={`ring-${r}`}
          points={axis
            .map((a) => {
              const x = center + Math.cos(a.angle) * maxRadius * r;
              const y = center + Math.sin(a.angle) * maxRadius * r;
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ')}
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.06"
          strokeWidth="1"
        />
      ))}

      {/* Axis spokes + labels */}
      {axis.map((a) => (
        <g key={`spoke-${a.stat}`}>
          <line
            x1={center}
            y1={center}
            x2={a.gridX}
            y2={a.gridY}
            stroke="#ffffff"
            strokeOpacity="0.08"
            strokeWidth="1"
          />
          <text
            x={a.labelX}
            y={a.labelY}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="monospace"
            fontSize="8"
            letterSpacing="1"
            fill={STATS[a.stat].color}
            style={{ textTransform: 'uppercase' }}
          >
            {STATS[a.stat].name}
          </text>
        </g>
      ))}

      {/* Effort polygon */}
      <motion.polygon
        points={polygon}
        fill="#d4af37"
        fillOpacity="0.18"
        stroke="#d4af37"
        strokeWidth="2"
        strokeLinejoin="round"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', bounce: 0.3, duration: 0.8 }}
        style={{ transformOrigin: 'center' }}
      />

      {/* Vertices */}
      {axis.map((a) => (
        <circle key={`pt-${a.stat}`} cx={a.x} cy={a.y} r={3} fill={STATS[a.stat].color} stroke="#050510" strokeWidth="1" />
      ))}
    </svg>
  );
}
