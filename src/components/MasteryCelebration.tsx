/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy } from 'lucide-react';

interface MasteryCelebrationProps {
  title: string;
  subtitle: string;
  onDone: () => void;
}

const CONFETTI_COLORS = ['#d4af37', '#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899'];

// Deterministic-ish confetti pieces (generated once per mount).
function makeConfetti(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 0.4,
    duration: 2 + Math.random() * 1.2,
    drift: (Math.random() - 0.5) * 160,
    size: 5 + Math.random() * 6,
    rotate: Math.random() * 720 - 360,
  }));
}

export default function MasteryCelebration({ title, subtitle, onDone }: MasteryCelebrationProps) {
  const confetti = React.useMemo(() => makeConfetti(30), []);

  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#050510]/75 backdrop-blur-sm px-4 overflow-hidden cursor-pointer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onDone}
    >
      {/* Confetti */}
      {confetti.map((c) => (
        <motion.div
          key={c.id}
          className="absolute top-0 rounded-[1px]"
          style={{ left: `${c.left}%`, width: c.size, height: c.size * 1.6, backgroundColor: c.color }}
          initial={{ y: -30, opacity: 0, rotate: 0 }}
          animate={{ y: '105vh', x: c.drift, opacity: [0, 1, 1, 0.8, 0], rotate: c.rotate }}
          transition={{ duration: c.duration, delay: c.delay, ease: 'easeIn' }}
        />
      ))}

      {/* Card */}
      <motion.div
        className="relative bg-[#15152a] border-2 border-[#d4af37]/60 rounded-2xl px-8 py-8 text-center shadow-[0_0_60px_rgba(212,175,55,0.35)] max-w-sm w-full"
        initial={{ scale: 0.7, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0.5, duration: 0.7 }}
      >
        {/* Rotating rays behind the emblem */}
        <div className="relative flex items-center justify-center mb-4">
          <motion.div
            className="absolute w-24 h-24 rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, rgba(212,175,55,0.35), transparent 25%, rgba(212,175,55,0.35) 50%, transparent 75%, rgba(212,175,55,0.35))',
            }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
          />
          <motion.div
            className="relative w-16 h-16 rounded-full border-2 border-[#d4af37] bg-[#050510] flex items-center justify-center glow-active"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.6, delay: 0.15 }}
          >
            <Trophy className="w-7 h-7 text-[#d4af37]" />
          </motion.div>
        </div>

        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#d4af37]">Node Unlocked</p>
        <h2 className="font-serif text-2xl font-bold text-[#d4af37] uppercase tracking-wide mt-1.5 leading-tight">
          {title}
        </h2>
        <p className="font-sans text-xs text-slate-400 mt-2 leading-relaxed">{subtitle}</p>
        <p className="font-serif text-[11px] italic text-slate-500 mt-4">
          It stops counting against your active limit — slot in the next node.
        </p>
        <p className="font-mono text-[8px] text-slate-600 uppercase tracking-widest mt-4">Tap to continue</p>
      </motion.div>
    </motion.div>
  );
}
