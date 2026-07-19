/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StatType, STATS } from '../types';

interface RadarChartProps {
  statEffort: Record<StatType, { xp: number; percentage: number }>;
}

export default function RadarChart({ statEffort }: RadarChartProps) {
  const [hoveredStat, setHoveredStat] = useState<StatType | null>(null);

  const cx = 110;
  const cy = 110;
  const radius = 75;

  const axes: StatType[] = ['mind', 'career', 'hobby', 'body', 'spirit'];

  const getCoordinates = (stat: StatType, scale: number) => {
    const index = axes.indexOf(stat);
    // -Math.PI/2 is straight up. Clockwise rotation:
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 5;
    const r = scale * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  // Grid lines
  const gridScales = [0.25, 0.5, 0.75, 1.0];
  const gridPolygons = gridScales.map((scale) => {
    const points = axes.map((s) => getCoordinates(s, scale));
    return points.map((p) => `${p.x},${p.y}`).join(' ');
  });

  // Calculate polygon points for actual stats effort.
  // We'll normalize each stat's percentage or ratio. Let's find the max percentage in the set.
  const percentages = Object.values(statEffort).map((e) => e.percentage);
  const maxPercent = Math.max(...percentages, 1); // Avoid division by zero, at least 1%

  const userPoints = axes.map((s) => {
    const effort = statEffort[s];
    // Scale factor: minimum 0.15 (to avoid disappearing points), scaling up to 1.0 based on relative percentage
    const factor = 0.15 + (effort.percentage / maxPercent) * 0.85;
    return getCoordinates(s, factor);
  });
  const userPath = userPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Get label positioning offsets to draw nicely
  const getLabelAnchor = (stat: StatType) => {
    const index = axes.indexOf(stat);
    if (index === 0) return 'middle'; // Top
    if (index === 1 || index === 2) return 'start'; // Right side
    return 'end'; // Left side
  };

  const getLabelCoords = (stat: StatType) => {
    const index = axes.indexOf(stat);
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 5;
    // Labels are slightly further out than the outer radius
    const r = radius + 15;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle) + (index === 0 ? -5 : index === 2 || index === 3 ? 12 : 3),
    };
  };

  return (
    <div className="relative w-full aspect-square max-w-[240px] mx-auto select-none">
      <svg className="w-full h-full" viewBox="0 0 220 220">
        {/* Radar concentric grids */}
        {gridPolygons.map((points, index) => (
          <polygon
            key={index}
            points={points}
            className="fill-none stroke-slate-500/15"
            strokeWidth={index === 3 ? '1.25' : '0.75'}
          />
        ))}

        {/* Radar axis lines from center to outer boundaries */}
        {axes.map((s, index) => {
          const outer = getCoordinates(s, 1);
          const isHovered = hoveredStat === s;
          return (
            <line
              key={index}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              className={`transition-colors duration-250 ${isHovered ? 'stroke-amber-400/40' : 'stroke-slate-500/20'}`}
              strokeWidth={isHovered ? '1.5' : '0.75'}
              strokeDasharray="2 2"
            />
          );
        })}

        {/* Shaded user stats area */}
        <polygon
          points={userPath}
          className="fill-amber-500/10 stroke-amber-400/85 transition-all duration-300"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Data points (circles) on the vertices */}
        {userPoints.map((point, index) => {
          const s = axes[index];
          const color = STATS[s].color;
          const isHovered = hoveredStat === s;
          return (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={isHovered ? '5.5' : '3.5'}
              fill={color}
              className="stroke-[#12162b] stroke-1 cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredStat(s)}
              onMouseLeave={() => setHoveredStat(null)}
            />
          );
        })}

        {/* Axes Labels */}
        {axes.map((s) => {
          const coords = getLabelCoords(s);
          const textAnchor = getLabelAnchor(s);
          const config = STATS[s];
          const isHovered = hoveredStat === s;
          const effort = statEffort[s];

          return (
            <g
              key={s}
              className="cursor-pointer group"
              onMouseEnter={() => setHoveredStat(s)}
              onMouseLeave={() => setHoveredStat(null)}
            >
              {/* Stat Name */}
              <text
                x={coords.x}
                y={coords.y}
                textAnchor={textAnchor}
                className={`font-sans text-[10px] font-semibold uppercase tracking-wider transition-colors duration-200 ${
                  isHovered ? 'fill-white' : 'fill-slate-400'
                }`}
              >
                {config.name}
              </text>

              {/* Percentage label directly below name */}
              <text
                x={coords.x}
                y={coords.y + 10}
                textAnchor={textAnchor}
                className="font-mono text-[9px] fill-slate-500 font-medium"
              >
                {effort.percentage}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
