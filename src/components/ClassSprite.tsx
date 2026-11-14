/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { UserClass } from '../types';
import { CLASS_SPRITES, SPRITE_SIZE, spriteColor } from '../data/classSprites';

/**
 * A class's 16×16 pixel sprite, drawn as crisp SVG squares so it stays sharp
 * at any size. `idle` adds a two-frame bob (off under reduced motion).
 */
export default function ClassSprite({
  cls,
  size = 64,
  idle = false,
  className = '',
  title,
}: {
  cls: UserClass;
  /** Pixel size, or any CSS length (e.g. '100%'). */
  size?: number | string;
  idle?: boolean;
  className?: string;
  /** Accessible name; omit for a decorative sprite. */
  title?: string;
}) {
  const rects = useMemo(() => {
    const def = CLASS_SPRITES[cls];
    const out: React.ReactElement[] = [];
    def.rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        const fill = spriteColor(def, ch);
        if (fill) out.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={fill} />);
      }),
    );
    return out;
  }, [cls]);

  return (
    <svg
      viewBox={`0 0 ${SPRITE_SIZE} ${SPRITE_SIZE}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={`${idle ? 'sprite-idle' : ''} ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {rects}
    </svg>
  );
}
