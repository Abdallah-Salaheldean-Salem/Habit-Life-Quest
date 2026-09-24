/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sunrise, Check, Plus, X } from 'lucide-react';
import { Quest, LedgerEntry, UserClass, STATS } from '../types';
import { DayPhase, calculateQuestXp, isDawnRitualComplete } from '../utils/logic';

interface DawnRitualProps {
  /** The active dawn-phase quests (the ritual's steps). */
  quests: Quest[];
  ledger: LedgerEntry[];
  currentDate: string;
  phase: DayPhase;
  userClass: UserClass;
  isLoggedToday: (questId: string) => boolean;
  onToggle: (q: Quest) => void;
  /** Add a step to the ritual (one step = a single checkbox, several = a checklist). */
  onAddStep: (title: string) => void;
  /** Remove a step from the ritual. */
  onDeleteStep: (questId: string) => void;
}

/**
 * The Dawn Ritual — the morning "loadout". Finishing every step grants a +10%
 * XP buff on all other quests that day. Front-and-center before 9 AM, then it
 * recedes to a slim buff chip. You choose the granularity: keep it to one step
 * for a single "Morning Routine" checkbox, or add several for a checklist.
 */
export default function DawnRitual({
  quests,
  ledger,
  currentDate,
  phase,
  userClass,
  isLoggedToday,
  onToggle,
  onAddStep,
  onDeleteStep,
}: DawnRitualProps) {
  const [draft, setDraft] = useState('');
  const prominent = phase === 'dawn';

  // Nothing set up yet: only offer setup in the morning, and stay out of the
  // way the rest of the day.
  if (quests.length === 0 && !prominent) return null;

  const complete = isDawnRitualComplete(quests, ledger, currentDate);
  const doneCount = quests.filter((q) => isLoggedToday(q.id)).length;

  // Ritual done and the morning has passed → collapse to a slim buff chip.
  if (complete && !prominent) {
    return (
      <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2">
        <Sunrise className="h-3.5 w-3.5 text-amber-400" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
          Dawn Buff active · +10% XP on every quest today
        </span>
      </div>
    );
  }

  const submit = () => {
    if (!draft.trim()) return;
    onAddStep(draft);
    setDraft('');
  };

  return (
    <div
      className={`mb-6 rounded-xl border p-4 transition-all ${
        prominent
          ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-transparent shadow-[0_0_24px_rgba(245,158,11,0.12)]'
          : 'border-amber-500/20 bg-amber-500/5'
      }`}
    >
      <div className="mb-3 flex items-center justify-between border-b border-amber-500/15 pb-2">
        <div className="flex items-center gap-2">
          <Sunrise className={`text-amber-400 ${prominent ? 'h-5 w-5' : 'h-4 w-4'}`} />
          <h3 className={`font-serif tracking-wide text-amber-200 ${prominent ? 'text-lg' : 'text-sm'}`}>
            Dawn Ritual
          </h3>
        </div>
        {quests.length > 0 && (
          <span className="font-mono text-[9px] uppercase tracking-wider text-amber-400/80">
            {doneCount} of {quests.length} done
          </span>
        )}
      </div>

      {prominent && (
        <p className="mb-3 font-serif text-[13px] italic leading-snug text-amber-100/70">
          {quests.length === 0
            ? 'Set up your morning loadout. Add one step for a single checkbox, or a few for a checklist.'
            : (
              <>
                Build your momentum. Finish the ritual to earn a{' '}
                <span className="font-bold not-italic text-amber-300">+10% XP buff</span> on everything
                else today.
              </>
            )}
        </p>
      )}

      {quests.length > 0 && (
        <div className="space-y-2">
          {quests.map((q) => {
            const done = isLoggedToday(q.id);
            const config = STATS[q.stat];
            const xp = calculateQuestXp(q.difficulty, q.type, q.stat, userClass);
            return (
              <div
                key={q.id}
                className={`flex items-center gap-2 rounded-lg border px-2 transition-all ${
                  done ? 'border-white/5 bg-black/20 opacity-60' : 'border-amber-500/20 bg-black/20'
                }`}
              >
                <button
                  onClick={() => onToggle(q)}
                  className="flex flex-1 items-center gap-3 py-2 text-left"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      done ? 'border-amber-400 bg-amber-400/90' : 'border-amber-500/50'
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

      {/* Add-step input — how the user dials in the ritual's granularity. */}
      {prominent && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
            maxLength={60}
            placeholder={quests.length === 0 ? 'e.g. Drink a glass of water' : 'Add another step…'}
            className="min-w-0 flex-1 rounded-md border border-amber-500/20 bg-black/30 px-2.5 py-1.5 text-[13px] text-slate-100 placeholder-slate-600 outline-none focus:border-amber-400/50"
          />
          <button
            onClick={submit}
            disabled={!draft.trim()}
            className="flex items-center gap-1 rounded-md border border-amber-400/40 bg-amber-500/10 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200 transition-all hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3 w-3" /> Step
          </button>
        </div>
      )}

      {quests.length > 0 && (
        <div className="mt-3 border-t border-amber-500/15 pt-2 text-center">
          {complete ? (
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
              Ritual complete · Dawn Buff active (+10% XP)
            </span>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400/60">
              Finish {quests.length === 1 ? 'it' : `all ${quests.length}`} to unlock today's buff
            </span>
          )}
        </div>
      )}
    </div>
  );
}
