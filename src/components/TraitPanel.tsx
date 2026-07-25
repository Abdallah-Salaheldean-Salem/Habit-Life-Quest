/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, X, Sparkles, Check } from 'lucide-react';
import { Quest, TraitGoal, TraitId, TraitCheckin, TRAITS } from '../types';
import { daysBetween } from '../utils/logic';

const CHECKIN_DAYS = 42; // six weeks — long enough for a real slope

interface TraitPanelProps {
  traitGoals: TraitGoal[];
  quests: Quest[];
  currentDate: string;
  onAddGoal: (trait: TraitId, facet: string, role: string, questIds: string[]) => void;
  onUpdateGoal: (id: string, patch: Partial<TraitGoal>) => void;
  onDeleteGoal: (id: string) => void;
  onAddCheckin: (goalId: string, score: 1 | 2 | 3 | 4 | 5) => void;
  showToast: (msg: string) => void;
}

// ---- Slope chart: the six-week measurements over time ----
function SlopeChart({ checkins }: { checkins: TraitCheckin[] }) {
  if (checkins.length === 0) return null;
  const first = checkins[0].score;
  const last = checkins[checkins.length - 1].score;
  const delta = last - first;
  return (
    <div className="mt-2">
      <div className="flex justify-between font-mono text-[9px] uppercase tracking-wider text-slate-500 mb-1.5">
        <span>Six-week slope</span>
        <span className={delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-500'}>
          {delta > 0 ? '+' : ''}{delta} over {checkins.length}
        </span>
      </div>
      <div className="flex items-end gap-1 h-10 bg-[#0c0c1b] border border-white/5 rounded p-1.5">
        {checkins.map((c) => (
          <div key={c.id} className="flex-1 min-w-0 h-full flex items-end justify-center" title={`${c.at}: ${c.score}/5`}>
            <div className="w-full max-w-[12px] rounded-sm bg-gradient-to-t from-[#aa7c11] to-[#d4af37]" style={{ height: `${(c.score / 5) * 100}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- One trait goal ----
function GoalCard({
  goal,
  quests,
  currentDate,
  onDeleteGoal,
  onAddCheckin,
}: {
  goal: TraitGoal;
  quests: Quest[];
  currentDate: string;
  onDeleteGoal: TraitPanelProps['onDeleteGoal'];
  onAddCheckin: TraitPanelProps['onAddCheckin'];
}) {
  const [score, setScore] = useState<1 | 2 | 3 | 4 | 5>(3);
  const trait = TRAITS[goal.trait];
  const bound = quests.filter((q) => goal.questIds.includes(q.id));
  const lastAt = goal.checkins.length ? goal.checkins[goal.checkins.length - 1].at : goal.createdAt;
  const sinceLast = Math.max(0, daysBetween(lastAt, currentDate));
  const due = sinceLast >= CHECKIN_DAYS;
  const daysUntil = Math.max(0, CHECKIN_DAYS - sinceLast);

  return (
    <div className="bg-[#1a1a2e] border border-white/5 rounded-lg p-3.5 relative">
      <button type="button" onClick={() => onDeleteGoal(goal.id)}
        className="absolute top-2 right-2 p-1 text-slate-700 hover:text-rose-400" title="Remove trait goal">
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-center gap-2 pr-6">
        <h4 className="font-serif text-sm font-bold text-slate-200">{goal.facet}</h4>
        <span className="font-mono text-[8px] uppercase tracking-wider text-[#d4af37] border border-[#d4af37]/40 bg-[#d4af37]/10 rounded-full px-2 py-0.5 shrink-0">
          {trait.name}
        </span>
      </div>
      <p className="font-serif italic text-[12px] text-slate-400 mt-1 leading-relaxed">“{goal.role}”</p>

      {/* The role you rehearse — the bound quests */}
      <div className="mt-2.5">
        <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500 mb-1">Rehearsed through</p>
        <div className="flex flex-wrap gap-1">
          {bound.length === 0 && <span className="font-mono text-[9px] text-rose-400/70">bound quests were removed</span>}
          {bound.map((q) => (
            <span key={q.id} className="font-mono text-[9px] text-slate-300 bg-[#0c0c1b]/70 border border-white/10 rounded px-2 py-0.5">
              {q.title}
            </span>
          ))}
        </div>
      </div>

      <SlopeChart checkins={goal.checkins} />

      {/* Six-week check-in */}
      <div className="mt-3 pt-3 border-t border-white/5">
        {due ? (
          <>
            <p className="font-serif text-[13px] text-slate-200">Six weeks on — how {goal.facet.toLowerCase()} do you feel now?</p>
            <p className="font-mono text-[9px] text-slate-500 mt-0.5 mb-2">Rate the trait, not today's mood. Slow is the point.</p>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button key={i} type="button" onClick={() => setScore(i as 1 | 2 | 3 | 4 | 5)}
                    className={`w-6 h-6 rounded-full border text-[10px] font-mono transition-all ${score >= i ? 'bg-[#d4af37]/70 border-[#d4af37] text-[#050510]' : 'border-white/20 text-slate-600'}`}>
                    {i}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => onAddCheckin(goal.id, score)}
                className="bg-gradient-to-r from-[#aa7c11] to-[#d4af37] text-[#050510] font-mono text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 rounded">
                Log check-in
              </button>
            </div>
          </>
        ) : (
          <p className="font-mono text-[10px] text-slate-500">
            Next check-in in <span className="text-slate-300">{daysUntil} day{daysUntil === 1 ? '' : 's'}</span>
            {goal.checkins.length === 0 && <span className="text-slate-600"> · keep rehearsing the role</span>}
          </p>
        )}
      </div>
    </div>
  );
}

export default function TraitPanel(props: TraitPanelProps) {
  const { traitGoals, quests, currentDate, onDeleteGoal, onAddCheckin } = props;
  const [addOpen, setAddOpen] = useState(false);
  const [trait, setTrait] = useState<TraitId>('conscientiousness');
  const [facet, setFacet] = useState<string>(TRAITS.conscientiousness.facets[0]);
  const [role, setRole] = useState('');
  const [picked, setPicked] = useState<string[]>([]);

  const activeQuests = quests.filter((q) => q.active);
  const canForge = facet.trim().length > 0 && role.trim().length > 0 && picked.length >= 2;

  const selectTrait = (t: TraitId) => {
    setTrait(t);
    setFacet(TRAITS[t].facets[0]);
  };
  const togglePick = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = () => {
    if (!canForge) {
      props.showToast('Pick a facet, name the role, and bind at least two habits.');
      return;
    }
    props.onAddGoal(trait, facet, role.trim(), picked);
    setRole('');
    setPicked([]);
    setAddOpen(false);
  };

  return (
    <div id="traits-panel" className="bg-[#15152a] border border-[#d4af37]/20 rounded-lg p-5 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
      <div className="flex justify-between items-center mb-1">
        <div>
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#d4af37]" /> Traits
          </span>
          <p className="font-mono text-[9px] text-slate-600 uppercase tracking-wider mt-0.5">The person you're becoming</p>
        </div>
        <button type="button" onClick={() => setAddOpen((o) => !o)} className="p-1.5 text-slate-500 hover:text-[#d4af37] transition-colors" title="Set a trait goal">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {addOpen && (
        <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-3 my-3 space-y-3">
          {/* Trait */}
          <div>
            <label className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">Trait to strengthen</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {(Object.keys(TRAITS) as TraitId[]).map((t) => (
                <button key={t} type="button" onClick={() => selectTrait(t)}
                  className={`font-mono text-[9px] px-2 py-1 rounded border ${trait === t ? 'text-[#d4af37] border-[#d4af37]/50 bg-[#d4af37]/10' : 'text-slate-500 border-white/10'}`}>
                  {TRAITS[t].name}
                </button>
              ))}
            </div>
            <p className="font-serif italic text-[11px] text-slate-500 mt-1.5 leading-relaxed">{TRAITS[trait].blurb}</p>
          </div>

          {/* Facet */}
          <div>
            <label className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">Facet</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {TRAITS[trait].facets.map((f) => (
                <button key={f} type="button" onClick={() => setFacet(f)}
                  className={`font-mono text-[9px] px-2 py-1 rounded border ${facet === f ? 'text-emerald-300 border-emerald-500/50 bg-emerald-500/10' : 'text-slate-500 border-white/10'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">The role you'll rehearse</label>
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="I am someone who finishes what I start."
              className="w-full mt-1 bg-[#0c0c1b]/60 border border-white/10 rounded px-2 py-1.5 text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:border-[#d4af37]/40" />
          </div>

          {/* Bind quests */}
          <div>
            <label className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">Bind at least two habits · {picked.length} chosen</label>
            <div className="mt-1 max-h-40 overflow-y-auto space-y-1 pr-1">
              {activeQuests.length === 0 && (
                <p className="font-mono text-[9px] text-slate-600">Add some quests first — a trait needs habits to grow through.</p>
              )}
              {activeQuests.map((q) => {
                const on = picked.includes(q.id);
                return (
                  <button key={q.id} type="button" onClick={() => togglePick(q.id)}
                    className={`w-full flex items-center gap-2 text-left rounded px-2 py-1.5 border transition-all ${on ? 'border-[#d4af37]/40 bg-[#d4af37]/5' : 'border-white/5 hover:border-white/15'}`}>
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-[#d4af37]/20 border-[#d4af37]/60 text-[#d4af37]' : 'border-white/20 text-transparent'}`}>
                      <Check className="w-2.5 h-2.5" />
                    </span>
                    <span className={`text-[11px] flex-1 min-w-0 truncate ${on ? 'text-slate-200' : 'text-slate-400'}`}>{q.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button type="button" onClick={submit} disabled={!canForge}
            className={`w-full font-mono text-[9px] font-bold uppercase tracking-wider py-1.5 rounded transition-all ${canForge ? 'bg-gradient-to-r from-[#aa7c11] to-[#d4af37] text-[#050510]' : 'bg-[#0c0c1b] text-slate-600 cursor-not-allowed'}`}>
            Forge trait goal
          </button>
        </div>
      )}

      {traitGoals.length === 0 && !addOpen && (
        <p className="font-mono text-[10px] text-slate-600 leading-relaxed mt-2">
          Nothing yet. A trait doesn't change by wanting it — you pick a facet, bind it to habits you already do, and let six weeks of repetition move the needle.
        </p>
      )}

      <div className="space-y-3 mt-3">
        {traitGoals.map((g) => (
          <GoalCard key={g.id} goal={g} quests={quests} currentDate={currentDate}
            onDeleteGoal={onDeleteGoal} onAddCheckin={onAddCheckin} />
        ))}
      </div>
    </div>
  );
}
