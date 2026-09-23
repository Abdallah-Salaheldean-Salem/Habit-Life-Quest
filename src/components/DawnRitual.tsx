/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sunrise, Check } from 'lucide-react';
import { Quest, LedgerEntry, UserClass, STATS } from '../types';
import { DayPhase, calculateQuestXp, isDawnRitualComplete } from '../utils/logic';

interface DawnRitualProps {
  /** The active dawn-phase quests. */
  quests: Quest[];
  ledger: LedgerEntry[];
  currentDate: string;
  phase: DayPhase;
  userClass: UserClass;
  isLoggedToday: (questId: string) => boolean;
  onToggle: (q: Quest) => void;
}

/**
 * The Dawn Ritual — the morning "loadout". Grouping early habits into one
 * ritual and finishing it grants a +10% XP buff on every other quest that day.
 * It's front-and-center before 9 AM, then recedes to a slim buff chip once the
 * board takes over. Missing it costs nothing — you simply play at base rates.
 */
export default function DawnRitual({
  quests,
  ledger,
  currentDate,
  phase,
  userClass,
  isLoggedToday,
  onToggle,
}: DawnRitualProps) {
  if (quests.length === 0) return null;

  const complete = isDawnRitualComplete(quests, ledger, currentDate);
  const doneCount = quests.filter((q) => isLoggedToday(q.id)).length;
  const prominent = phase === 'dawn';

  // Once the ritual's done and the morning has passed, collapse to a slim chip.
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
        <span className="font-mono text-[9px] uppercase tracking-wider text-amber-400/80">
          {doneCount} of {quests.length} done
        </span>
      </div>

      {prominent && (
        <p className="mb-3 font-serif text-[13px] italic leading-snug text-amber-100/70">
          Build your momentum. Finish the ritual to earn a{' '}
          <span className="font-bold not-italic text-amber-300">+10% XP buff</span> on everything
          else today.
        </p>
      )}

      <div className="space-y-2">
        {quests.map((q) => {
          const done = isLoggedToday(q.id);
          const config = STATS[q.stat];
          const xp = calculateQuestXp(q.difficulty, q.type, q.stat, userClass);
          return (
            <button
              key={q.id}
              onClick={() => onToggle(q)}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all ${
                done
                  ? 'border-white/5 bg-black/20 opacity-60'
                  : 'border-amber-500/20 bg-black/20 hover:border-amber-400/40'
              }`}
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
          );
        })}
      </div>

      <div className="mt-3 border-t border-amber-500/15 pt-2 text-center">
        {complete ? (
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
            Ritual complete · Dawn Buff active (+10% XP)
          </span>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400/60">
            Finish all {quests.length} to unlock today's buff
          </span>
        )}
      </div>
    </div>
  );
}
