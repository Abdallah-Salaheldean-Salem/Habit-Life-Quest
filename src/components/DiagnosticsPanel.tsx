/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FlaskConical, X, ChevronRight, RotateCcw, Trash2, Sparkles } from 'lucide-react';

interface DiagnosticsPanelProps {
  currentMockDate: string;
  onSetMockDate: (date: string) => void;
  onAdvanceDay: () => void;
  onAdvanceWeek: () => void;
  onAddFreeXp: (xp: number) => void;
  onResetToMockup: () => void;
  onHardReset: () => void;
}

/**
 * A collapsible developer/diagnostics panel for time-travel and save
 * manipulation. Purely a testing aid — hidden behind a small flask button.
 */
export default function DiagnosticsPanel({
  currentMockDate,
  onSetMockDate,
  onAdvanceDay,
  onAdvanceWeek,
  onAddFreeXp,
  onResetToMockup,
  onHardReset,
}: DiagnosticsPanelProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="p-2.5 rounded-full border border-[#d4af37]/30 bg-[#15152a] text-[#d4af37]/70 hover:text-[#d4af37] hover:border-[#d4af37]/60 shadow-2xl transition-all cursor-pointer"
        title="Diagnostics"
      >
        <FlaskConical className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="w-64 bg-[#15152a] border border-[#d4af37]/30 rounded-lg p-4 shadow-2xl animate-fade-in">
      <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
        <span className="font-mono text-[10px] text-[#d4af37] uppercase tracking-widest font-bold flex items-center gap-1.5">
          <FlaskConical className="w-3.5 h-3.5" /> Diagnostics
        </span>
        <button
          onClick={() => setOpen(false)}
          className="p-1 text-slate-500 hover:text-[#d4af37] transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Mock date control */}
        <div>
          <label className="block font-mono text-[8px] text-slate-500 uppercase tracking-widest mb-1">
            Current Date
          </label>
          <input
            type="date"
            value={currentMockDate}
            onChange={(e) => e.target.value && onSetMockDate(e.target.value)}
            className="w-full bg-[#1a1a2e] border border-white/10 focus:border-[#d4af37]/40 rounded py-1.5 px-2 text-[10px] text-slate-200 outline-none font-mono"
          />
        </div>

        {/* Time travel */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onAdvanceDay}
            className="flex items-center justify-center gap-1 bg-[#1a1a2e] border border-white/10 hover:border-[#d4af37]/40 text-slate-300 hover:text-[#d4af37] font-mono text-[9px] uppercase py-1.5 rounded cursor-pointer transition-all"
          >
            <ChevronRight className="w-3 h-3" /> +1 Day
          </button>
          <button
            onClick={onAdvanceWeek}
            className="flex items-center justify-center gap-1 bg-[#1a1a2e] border border-white/10 hover:border-[#d4af37]/40 text-slate-300 hover:text-[#d4af37] font-mono text-[9px] uppercase py-1.5 rounded cursor-pointer transition-all"
          >
            <ChevronRight className="w-3 h-3" /> +1 Week
          </button>
        </div>

        {/* Free XP */}
        <button
          onClick={() => onAddFreeXp(100)}
          className="w-full flex items-center justify-center gap-1.5 bg-[#d4af37]/10 border border-[#d4af37]/30 hover:border-[#d4af37]/60 text-[#d4af37] font-mono text-[9px] uppercase py-1.5 rounded cursor-pointer transition-all"
        >
          <Sparkles className="w-3 h-3" /> Grant +100 XP
        </button>

        {/* Resets */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
          <button
            onClick={onResetToMockup}
            className="flex items-center justify-center gap-1 bg-[#1a1a2e] border border-white/10 hover:border-blue-400/40 text-slate-300 hover:text-blue-400 font-mono text-[9px] uppercase py-1.5 rounded cursor-pointer transition-all"
          >
            <RotateCcw className="w-3 h-3" /> Mockup
          </button>
          <button
            onClick={onHardReset}
            className="flex items-center justify-center gap-1 bg-[#1a1a2e] border border-white/10 hover:border-rose-500/40 text-slate-300 hover:text-rose-400 font-mono text-[9px] uppercase py-1.5 rounded cursor-pointer transition-all"
          >
            <Trash2 className="w-3 h-3" /> Wipe
          </button>
        </div>
      </div>
    </div>
  );
}
