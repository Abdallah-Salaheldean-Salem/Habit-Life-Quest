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
  const [description, setDescription] = useState('');
  const [stat, setStat] = useState<StatType>('body');
  const [difficulty, setDifficulty] = useState<QuestDifficulty>('normal');
  const [type, setType] = useState<QuestType>('daily');
  const [target, setTarget] = useState(3);
  const [cue, setCue] = useState('');
  const [location, setLocation] = useState('');
  const [minVersion, setMinVersion] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const xpPreview = calculateQuestXp(difficulty, type, stat, userClass);
  // An implementation intention is required for daily quests — a vague daily
  // quest is one that quietly fails.
  const intentionRequired = type === 'daily';

  const reset = () => {
    setTitle('');
    setDescription('');
    setStat('body');
    setDifficulty('normal');
    setType('daily');
    setTarget(3);
    setCue('');
    setLocation('');
    setMinVersion('');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const c = cue.trim();
    const l = location.trim();
    const m = minVersion.trim();

    if (intentionRequired && (!c || !l || !m)) {
      setError('A daily quest needs a cue, a place, and a minimum version — that’s what makes it stick.');
      return;
    }

    const desc = description.trim();
    const intention = c && l && m ? { cue: c, location: l, minVersion: m } : undefined;

    onAdd({
      title: trimmed,
      stat,
      difficulty,
      type,
      target: type === 'weekly' ? Math.max(1, target) : 1,
      ...(desc ? { description: desc } : {}),
      ...(intention ? { intention } : {}),
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

          {/* DESCRIPTION (optional) */}
          <div>
            <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold">
              Notes <span className="text-slate-600 lowercase tracking-normal">· optional</span>
            </label>
            <textarea
              maxLength={280}
              rows={2}
              placeholder="Guidance, the unlock criteria, or why this matters…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#1a1a2e] border border-white/5 focus:border-[#d4af37]/50 rounded-lg py-2.5 px-4 text-sm text-[#e0e0e0] placeholder-slate-600 outline-none transition-all font-sans resize-none leading-relaxed"
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

          {/* IMPLEMENTATION INTENTION */}
          <div className="pt-1">
            <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold">
              The intention{' '}
              {intentionRequired ? (
                <span className="text-rose-400 tracking-normal">· required</span>
              ) : (
                <span className="text-slate-600 lowercase tracking-normal">· optional, but it works</span>
              )}
            </label>
            <div className="bg-[#1a1a2e] border border-white/5 rounded-lg p-4 space-y-3 text-sm text-[#e0e0e0] leading-relaxed">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-400">When</span>
                <input
                  type="text"
                  placeholder="after I finish dinner"
                  value={cue}
                  onChange={(e) => setCue(e.target.value)}
                  className="flex-1 min-w-[140px] bg-[#050510]/60 border border-white/5 focus:border-[#d4af37]/50 rounded-md py-1.5 px-3 text-sm text-[#f3e5ab] placeholder-slate-600 outline-none transition-all"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-400">at</span>
                <input
                  type="text"
                  placeholder="the living-room chair"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="flex-1 min-w-[140px] bg-[#050510]/60 border border-white/5 focus:border-[#d4af37]/50 rounded-md py-1.5 px-3 text-sm text-[#f3e5ab] placeholder-slate-600 outline-none transition-all"
                />
                <span className="text-slate-400">, I will {title.trim() ? `“${title.trim()}”` : 'do this quest'}.</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
                <span className="text-slate-400">On a bad day, the minimum is</span>
                <input
                  type="text"
                  placeholder="one page"
                  value={minVersion}
                  onChange={(e) => setMinVersion(e.target.value)}
                  className="flex-1 min-w-[120px] bg-[#050510]/60 border border-emerald-500/20 focus:border-emerald-500/50 rounded-md py-1.5 px-3 text-sm text-emerald-300 placeholder-slate-600 outline-none transition-all"
                />
              </div>
            </div>
            <p className="font-mono text-[9px] text-slate-500 mt-1.5 leading-relaxed">
              A cue + a place roughly doubles follow-through. The minimum is your never-zero fallback — done on a bad
              day it still keeps the streak.
            </p>
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

          {/* Validation message */}
          {error && (
            <p className="font-mono text-[10px] text-rose-400 leading-relaxed bg-rose-500/5 border border-rose-500/20 rounded-md py-2 px-3">
              {error}
            </p>
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
