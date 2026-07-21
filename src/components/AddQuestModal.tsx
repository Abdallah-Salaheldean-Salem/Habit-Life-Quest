/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import {
  Quest,
  QuestDifficulty,
  QuestType,
  StatType,
  STATS,
  UserClass,
} from '../types';
import { calculateQuestXp } from '../utils/logic';

interface AddQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (quest: Omit<Quest, 'id' | 'createdAt' | 'active'>) => void;
  userClass: UserClass;
}

const DIFFICULTIES: QuestDifficulty[] = ['easy', 'normal', 'hard'];
const TYPES: QuestType[] = ['daily', 'weekly', 'milestone'];

export default function AddQuestModal({ isOpen, onClose, onAdd, userClass }: AddQuestModalProps) {
  const [title, setTitle] = useState('');
  const [stat, setStat] = useState<StatType>('body');
  const [difficulty, setDifficulty] = useState<QuestDifficulty>('normal');
  const [type, setType] = useState<QuestType>('daily');
  const [target, setTarget] = useState(3);

  if (!isOpen) return null;

  const xpPreview = calculateQuestXp(difficulty, type, stat, userClass);

  const reset = () => {
    setTitle('');
    setStat('body');
    setDifficulty('normal');
    setType('daily');
    setTarget(3);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd({
      title: trimmed,
      stat,
      difficulty,
      type,
      target: type === 'weekly' ? Math.max(1, target) : 1,
    });
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#050510]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#15152a] border border-[#d4af37]/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.08)] animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif text-lg font-bold text-[#d4af37] uppercase tracking-widest">Draft a Quest</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-[#d4af37] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* TITLE */}
          <div>
            <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold">
              Quest Title
            </label>
            <input
              type="text"
              required
              maxLength={60}
              autoFocus
              placeholder="e.g. Meditate for 10 minutes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#1a1a2e] border border-white/5 focus:border-[#d4af37]/50 rounded-lg py-3 px-4 text-sm text-[#e0e0e0] placeholder-slate-600 outline-none transition-all font-sans"
            />
          </div>

          {/* STAT */}
          <div>
            <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold">
              Stat
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(STATS) as StatType[]).map((s) => {
                const config = STATS[s];
                const active = stat === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStat(s)}
                    className="p-2.5 rounded-lg border text-center font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                    style={
                      active
                        ? { backgroundColor: `${config.color}20`, color: config.color, borderColor: `${config.color}80` }
                        : { borderColor: 'rgba(255,255,255,0.06)', color: '#94a3b8' }
                    }
                  >
                    {config.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TYPE */}
          <div>
            <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold">
              Cadence
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`p-2.5 rounded-lg border text-center font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                    type === t
                      ? 'border-[#d4af37]/60 bg-[#d4af37]/10 text-[#d4af37]'
                      : 'border-white/5 text-slate-400 hover:border-white/15'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* DIFFICULTY */}
          <div>
            <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold">
              Difficulty
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`p-2.5 rounded-lg border text-center font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                    difficulty === d
                      ? 'border-[#d4af37]/60 bg-[#d4af37]/10 text-[#d4af37]'
                      : 'border-white/5 text-slate-400 hover:border-white/15'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* WEEKLY TARGET */}
          {type === 'weekly' && (
            <div>
              <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold">
                Weekly Target
              </label>
              <input
                type="number"
                min={1}
                max={7}
                value={target}
                onChange={(e) => setTarget(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-[#1a1a2e] border border-white/5 focus:border-[#d4af37]/50 rounded-lg py-3 px-4 text-sm text-[#e0e0e0] outline-none transition-all font-mono"
              />
              <p className="font-mono text-[9px] text-slate-500 mt-1.5 uppercase">Times per week to satisfy this quest</p>
            </div>
          )}

          {/* XP PREVIEW + SUBMIT */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
              Reward: <span className="text-[#d4af37] font-bold">{xpPreview} XP</span> per completion
            </span>
            <button
              type="submit"
              className="bg-gradient-to-r from-[#aa7c11] to-[#d4af37] hover:from-[#d4af37] hover:to-[#f3e5ab] text-[#050510] font-sans font-bold text-xs uppercase tracking-widest py-2.5 px-6 rounded-md shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
