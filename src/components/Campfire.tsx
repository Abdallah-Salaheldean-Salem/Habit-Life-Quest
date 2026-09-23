/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Flame, Check, Moon, Plus, X } from 'lucide-react';
import { Quest, LedgerEntry, UserClass, STATS } from '../types';
import { DayPhase, calculateQuestXp, REFLECTION_XP } from '../utils/logic';

interface CampfireProps {
  /** The active campfire-phase quests (the ritual's steps). */
  quests: Quest[];
  currentDate: string;
  phase: DayPhase;
  userClass: UserClass;
  isLoggedToday: (questId: string) => boolean;
  onToggle: (q: Quest) => void;
  /** Today's reflection ledger entry, if the day has been banked. */
  todaysReflection?: LedgerEntry;
  /** Save (or, with empty text, clear) today's reflection into a stat. */
  onReflect: (text: string, stat: 'spirit' | 'mind') => void;
  /** Add a step to the ritual (one step = a single checkbox, several = a checklist). */
  onAddStep: (title: string) => void;
  /** Remove a step from the ritual. */
  onDeleteStep: (questId: string) => void;
}

/**
 * The Campfire — the evening wind-down. It takes over after 8 PM: the steps are
 * recovery (reading, prepping tomorrow, screens down), and the micro-reflection
 * "banks" the day by logging one win into Spirit or Mind. Skipping it costs
 * nothing. Keep it to one step for a single checkbox, or add several.
 */
export default function Campfire({
  quests,
  currentDate,
  phase,
  userClass,
  isLoggedToday,
  onToggle,
  todaysReflection,
  onReflect,
  onAddStep,
  onDeleteStep,
}: CampfireProps) {
  const prominent = phase === 'campfire';
  const banked = Boolean(todaysReflection);
  const [text, setText] = useState('');
  const [reflectStat, setReflectStat] = useState<'spirit' | 'mind'>('spirit');
  const [draft, setDraft] = useState('');

  // Only surface it in the evening, or as a slim reminder when steps exist.
  if (!prominent && quests.length === 0) return null;

  const bank = () => {
    const t = text.trim();
    if (!t) return;
    onReflect(t, reflectStat);
    setText('');
  };

  const addStep = () => {
    if (!draft.trim()) return;
    onAddStep(draft);
    setDraft('');
  };

  const banner = (
    <div className="mb-3 flex items-center justify-between border-b border-orange-500/15 pb-2">
      <div className="flex items-center gap-2">
        <Flame className={`text-orange-400 ${prominent ? 'h-5 w-5' : 'h-4 w-4'}`} />
        <h3 className={`font-serif tracking-wide text-orange-200 ${prominent ? 'text-lg' : 'text-sm'}`}>
          The Campfire
        </h3>
      </div>
      {!prominent && (
        <span className="font-mono text-[9px] uppercase tracking-wider text-orange-400/70">
          opens after 8 PM
        </span>
      )}
    </div>
  );

  return (
    <div
      className={`mb-6 rounded-xl border p-4 transition-all ${
        prominent
          ? 'border-orange-500/40 bg-gradient-to-b from-orange-600/12 to-transparent shadow-[0_0_28px_rgba(234,88,12,0.14)]'
          : 'border-orange-500/20 bg-orange-500/5'
      }`}
    >
      {banner}

      {prominent && (
        <p className="mb-3 font-serif text-[13px] italic leading-snug text-orange-100/70">
          Rest at the fire. Wind down, then bank the day with one line about what went right.
        </p>
      )}

      {quests.length > 0 && (
        <div className="mb-3 space-y-2">
          {quests.map((q) => {
            const done = isLoggedToday(q.id);
            const config = STATS[q.stat];
            const xp = calculateQuestXp(q.difficulty, q.type, q.stat, userClass);
            return (
              <div
                key={q.id}
                className={`flex items-center gap-2 rounded-lg border px-2 transition-all ${
                  done ? 'border-white/5 bg-black/20 opacity-60' : 'border-orange-500/20 bg-black/20'
                }`}
              >
                <button onClick={() => onToggle(q)} className="flex flex-1 items-center gap-3 py-2 text-left">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      done ? 'border-orange-400 bg-orange-400/90' : 'border-orange-500/50'
                    }`}
                  >
                    {done && <Check className="h-3 w-3 text-black" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${done ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                      {q.title}
                    </span>
                    <span className={`font-mono text-[9px] uppercase tracking-wider ${config.textClass}`}>
                      {config.name} · {xp} XP
                    </span>
                  </span>
                </button>
                {prominent && (
                  <button
                    onClick={() => onDeleteStep(q.id)}
                    className="shrink-0 p-1 text-slate-600 hover:text-rose-400"
                    title="Remove this step"
                    aria-label="Remove step"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add-step input — dials in the ritual's granularity. */}
      {prominent && (
        <div className="mb-3 flex items-center gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addStep();
              }
            }}
            maxLength={60}
            placeholder={quests.length === 0 ? 'e.g. Read, screens down' : 'Add another step…'}
            className="min-w-0 flex-1 rounded-md border border-orange-500/20 bg-black/30 px-2.5 py-1.5 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-orange-400/50"
          />
          <button
            onClick={addStep}
            disabled={!draft.trim()}
            className="flex items-center gap-1 rounded-md border border-orange-400/40 bg-orange-500/10 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-orange-200 transition-all hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3 w-3" /> Step
          </button>
        </div>
      )}

      {/* Micro-reflection — the "bank" action. Shown in the evening. */}
      {prominent && (
        <div className="rounded-lg border border-orange-500/20 bg-black/25 p-3">
          {banked ? (
            <div className="flex items-start gap-2">
              <Moon className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-orange-300">
                  Day banked · +{REFLECTION_XP} {STATS[todaysReflection!.stat].name} XP
                </p>
                <p className="mt-1 break-words font-serif text-[13px] italic text-slate-200">
                  “{todaysReflection!.questTitle.replace(/^Campfire:\s*/, '')}”
                </p>
                <button
                  onClick={() => onReflect('', todaysReflection!.stat as 'spirit' | 'mind')}
                  className="mt-1.5 font-mono text-[9px] uppercase tracking-wider text-slate-500 hover:text-orange-300"
                >
                  Undo
                </button>
              </div>
            </div>
          ) : (
            <>
              <label className="mb-1.5 block font-mono text-[9px] font-bold uppercase tracking-wider text-orange-300">
                One win from today
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                maxLength={200}
                placeholder="What went right today…"
                className="w-full resize-none rounded-md border border-orange-500/20 bg-black/40 px-2.5 py-1.5 font-serif text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-orange-400/50"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {(['spirit', 'mind'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setReflectStat(s)}
                      className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider transition-all ${
                        reflectStat === s
                          ? `${STATS[s].textClass} border-current bg-white/5`
                          : 'border-white/10 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {STATS[s].name}
                    </button>
                  ))}
                </div>
                <button
                  onClick={bank}
                  disabled={!text.trim()}
                  className="rounded-md border border-orange-400/40 bg-orange-500/15 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-orange-200 transition-all hover:bg-orange-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Bank the day
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
