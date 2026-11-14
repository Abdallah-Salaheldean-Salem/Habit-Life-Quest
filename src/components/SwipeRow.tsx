/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Check, Minus } from 'lucide-react';
import { buzz, playSfx } from '../utils/feedback';

// ---------------------------------------------------------
// SWIPE TO LOG — touch only. Swipe a quest right to complete it, left to log
// the never-zero minimum. A mouse keeps normal clicking and text selection,
// vertical scrolling is untouched (the swipe only takes over once the finger
// clearly moves sideways), and every action stays available as a button.
// ---------------------------------------------------------

const THRESHOLD = 0.35; // share of the row width that commits a swipe

export default function SwipeRow({
  children,
  onComplete,
  onMinimum,
  disabled = false,
}: {
  children: React.ReactNode;
  onComplete: () => void;
  /** Omit for quests with no minimum (milestones). */
  onMinimum?: () => void;
  /** Already logged today — swiping is off; tap the ring to undo. */
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; id: number; axis: 'h' | 'v' | null; armed: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [dx, setDxState] = useState(0);
  // The live offset: release reads this, not state, so a fast flick between
  // renders still counts.
  const dxRef = useRef(0);
  const setDx = (v: number) => {
    dxRef.current = v;
    setDxState(v);
  };
  const [dragging, setDragging] = useState(false);
  const [committing, setCommitting] = useState(false);
  const width = () => ref.current?.offsetWidth || 320;

  const reset = () => {
    drag.current = null;
    setDragging(false);
    setDx(0);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || committing || e.pointerType === 'mouse') return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, axis: null, armed: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const mx = e.clientX - d.x;
    const my = e.clientY - d.y;
    if (!d.axis) {
      if (Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my) * 1.2) {
        d.axis = 'h';
        setDragging(true);
        try {
          ref.current?.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      } else if (Math.abs(my) > 10) {
        d.axis = 'v';
        return;
      } else return;
    }
    if (d.axis !== 'h') return;
    // No minimum → resist a left swipe instead of offering one.
    const next = mx < 0 && !onMinimum ? mx * 0.25 : mx;
    const armed = Math.abs(next) > width() * THRESHOLD;
    if (armed !== d.armed) {
      d.armed = armed;
      if (armed) buzz(8);
    }
    setDx(next);
  };

  const commit = (dir: 1 | -1) => {
    setCommitting(true);
    setDx(dir * width());
    playSfx('swipe');
    window.setTimeout(() => {
      if (dir === 1) onComplete();
      else onMinimum?.();
      setCommitting(false);
      reset();
    }, 200);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    if (d.axis === 'h') {
      suppressClick.current = true; // a drag that started on a button is not a tap
      const w = width();
      const off = dxRef.current;
      if (off > w * THRESHOLD) return commit(1);
      if (off < -w * THRESHOLD && onMinimum) return commit(-1);
    }
    reset();
  };

  const w = width();
  const reveal = (v: number) => Math.max(0, Math.min(1, v / (w * 0.3)));

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-lg"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={reset}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          suppressClick.current = false;
          e.stopPropagation();
          e.preventDefault();
        }
      }}
    >
      {dx !== 0 && (
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-between px-4 font-mono text-[10px] font-bold uppercase tracking-wider"
          style={{ background: dx > 0 ? 'rgba(52,211,153,0.14)' : 'rgba(212,175,55,0.14)' }}
        >
          <span className="flex items-center gap-1.5 text-emerald-400" style={{ opacity: reveal(dx) }}>
            <Check className="w-4 h-4" /> Complete
          </span>
          {onMinimum && (
            <span className="flex items-center gap-1.5 text-[#d4af37]" style={{ opacity: reveal(-dx) }}>
              Minimum <Minus className="w-4 h-4" />
            </span>
          )}
        </div>
      )}
      <div
        style={{
          transform: dx ? `translateX(${dx}px)` : undefined,
          transition: dragging && !committing ? 'none' : committing ? 'transform .2s ease-out' : 'transform .28s cubic-bezier(.2,.9,.25,1.15)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
