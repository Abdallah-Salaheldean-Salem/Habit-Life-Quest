/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Sparkles, Trophy } from 'lucide-react';
import { Quest, StatType, QuestDifficulty, QuestType, STATS, UserClass } from '../types';
import { calculateQuestXp } from '../utils/logic';

interface AddQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (quest: Omit<Quest, 'id' | 'createdAt' | 'active'>) => void;
  userClass: UserClass;
}

export default function AddQuestModal({ isOpen, onClose, onAdd, userClass }: AddQuestModalProps) {
  const [title, setTitle] = useState('');
  const [stat, setStat] = useState<StatType>('body');
  const [type, setType] = useState<QuestType>('daily');
  const [difficulty, setDifficulty] = useState<QuestDifficulty>('normal');
  const [target, setTarget] = useState(3); // Weekly default target completions

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({
      title: title.trim(),
      stat,
      type,
      difficulty,
      target: type === 'weekly' ? target : 1,
    });

    // Reset state
    setTitle('');
    setStat('body');
    setType('daily');
    setDifficulty('normal');
    setTarget(3);
    onClose();
  };

  const estimatedXp = calculateQuestXp(difficulty, type, stat, userClass);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#15152a] border border-[#d4af37]/30 rounded-lg p-6 max-w-md w-full shadow-[0_0_25px_rgba(212,175,55,0.08)] relative animate-fade-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-[#d4af37] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
 
        {/* Header */}
        <div className="mb-6 text-center">
          <Trophy className="w-7 h-7 text-[#d4af37] mx-auto mb-2" />
          <h3 className="font-serif text-lg font-bold text-[#d4af37] uppercase tracking-wider">
            Draft a New Quest
          </h3>
          <p className="font-mono text-[9px] text-slate-500 uppercase">
            Define your effort to grow your portrait
          </p>
        </div>
 
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">
              Quest Objective
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Read 20 pages, Gym workout..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#1a1a2e] border border-white/5 focus:border-[#d4af37]/50 rounded-md py-2 px-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all font-sans"
            />
          </div>
 
          {/* Stat Category */}
          <div>
            <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">
              Aura / Aspect
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {(Object.keys(STATS) as StatType[]).map((s) => {
                const config = STATS[s];
                const isSelected = stat === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStat(s)}
                    className={`flex flex-col items-center justify-center p-2 rounded-md border transition-all text-center cursor-pointer ${
                      isSelected
                        ? 'border-[#d4af37]/60 bg-[#d4af37]/10'
                        : 'border-white/5 hover:border-white/10 bg-[#1a1a2e]'
                    }`}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full mb-1.5"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="font-sans text-[8px] font-semibold text-slate-300 block capitalize">
                      {s}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
 
          {/* Quest Type */}
          <div>
            <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">
              Rhythm & Frequency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['daily', 'weekly', 'milestone'] as QuestType[]).map((t) => {
                const isSelected = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-1.5 px-2 rounded-md border font-mono text-[9px] uppercase tracking-wider transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-[#d4af37]/15 border-[#d4af37]/50 text-[#d4af37]'
                        : 'bg-[#1a1a2e] border-white/5 text-slate-400 hover:border-white/10'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
 
          {/* Weekly Target Comps (Conditional) */}
          {type === 'weekly' && (
            <div className="bg-[#1a1a2e] border border-white/5 p-3 rounded-md">
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono text-[10px] text-slate-400 uppercase">
                  Completions Required
                </span>
                <span className="font-mono text-[10px] text-[#d4af37] font-bold">
                  {target}× per week
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="7"
                value={target}
                onChange={(e) => setTarget(parseInt(e.target.value))}
                className="w-full accent-[#d4af37] cursor-pointer"
              />
              <span className="font-sans text-[8px] text-slate-500 block mt-1">
                Tracked from Monday to Sunday. Set how many days this week you aim to complete this.
              </span>
            </div>
          )}
 
          {/* Difficulty */}
          <div>
            <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">
              Difficulty Tier
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'normal', 'hard'] as QuestDifficulty[]).map((d) => {
                const isSelected = difficulty === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-1.5 px-2 rounded-md border font-sans text-[10px] uppercase font-semibold transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-[#d4af37]/15 border-[#d4af37]/50 text-[#d4af37]'
                        : 'bg-[#1a1a2e] border-white/5 text-slate-400 hover:border-white/10'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
 
          {/* Quest XP Summary */}
          <div className="bg-[#1a1a2e] border border-white/5 rounded-md p-3 flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#d4af37]" />
              <span className="font-mono text-[10px] text-slate-400 uppercase">
                Bounty Value:
              </span>
            </div>
            <div className="font-mono text-xs font-bold text-emerald-400">
              +{estimatedXp} XP{' '}
              {STATS[stat].name === 'Mind' && userClass === 'scholar' && (
                <span className="text-[9px] text-[#d4af37] font-normal">
                  (+20% Affinity!)
                </span>
              )}
              {STATS[stat].name === 'Body' && userClass === 'warrior' && (
                <span className="text-[9px] text-[#d4af37] font-normal">
                  (+20% Affinity!)
                </span>
              )}
              {STATS[stat].name === 'Spirit' && userClass === 'monk' && (
                <span className="text-[9px] text-[#d4af37] font-normal">
                  (+20% Affinity!)
                </span>
              )}
              {STATS[stat].name === 'Career' && userClass === 'guildmaster' && (
                <span className="text-[9px] text-[#d4af37] font-normal">
                  (+20% Affinity!)
                </span>
              )}
              {STATS[stat].name === 'Hobby' && userClass === 'bard' && (
                <span className="text-[9px] text-[#d4af37] font-normal">
                  (+20% Affinity!)
                </span>
              )}
            </div>
          </div>
 
          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-white/5 text-slate-400 font-mono text-[10px] uppercase tracking-wider py-2.5 rounded-md hover:bg-[#1a1a2e] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-[#aa7c11] to-[#d4af37] hover:from-[#d4af37] hover:to-[#f3e5ab] text-slate-950 font-sans font-bold text-xs uppercase tracking-widest py-2.5 rounded-md shadow-lg transition-all cursor-pointer"
            >
              Commit Quest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
