/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ShieldAlert, X, Lock, LifeBuoy, Wind, ShieldCheck, Flame } from 'lucide-react';
import { Debuff, TriggerEvent, CueRemoval } from '../types';
import { daysBetween, getAppWideStreak } from '../utils/logic';
import { uid } from '../utils/id';
import { needsMedicalNotice, containsDistress, CRISIS_RESOURCES } from '../utils/safety';

// Points for resisting a single cue — lighter than a full urge-surf (+50),
// which is the deeper, effortful version of the same win.
const RESIST_XP = 20;

/** A resisted cue is any logged trigger the user did NOT act on. */
const isResisted = (t: TriggerEvent) => t.acted === false;

interface DebuffPanelProps {
  debuffs: Debuff[];
  triggerEvents: TriggerEvent[];
  currentDate: string;
  localOnly: boolean;
  onToggleLocalOnly: () => void;
  onAddDebuff: (name: string, lapsePlan: string, needsMedical: boolean) => void;
  onUpdateDebuff: (id: string, patch: Partial<Debuff>) => void;
  onDeleteDebuff: (id: string) => void;
  onAddTrigger: (t: Omit<TriggerEvent, 'id'>) => void;
  grantXp: (amount: number, note: string) => void;
  showToast: (msg: string) => void;
}

const MOODS = ['restless', 'anxious', 'bored', 'tired', 'lonely', 'stressed'];

function CrisisBox() {
  return (
    <div className="bg-[#0c0c1b] border border-rose-500/25 rounded-lg p-3 mt-2">
      <p className="font-sans text-[11px] text-rose-300 leading-relaxed mb-2">
        If you might be in danger or thinking about harming yourself, please reach out — you deserve support from a
        real person right now.
      </p>
      <ul className="space-y-1">
        {CRISIS_RESOURCES.map((r) => (
          <li key={r.name} className="font-mono text-[10px] text-slate-300 flex justify-between gap-3">
            <span className="text-slate-500">{r.region}</span>
            <span className="text-right">
              {r.name} · <span className="text-rose-300">{r.contact}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MedicalNotice() {
  return (
    <div className="bg-amber-500/8 border border-amber-500/30 rounded-lg p-3 flex gap-2.5 items-start mt-2">
      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <p className="font-sans text-[11px] text-amber-200/90 leading-relaxed">
        Withdrawal from alcohol or benzodiazepines can be <b className="text-amber-100">medically dangerous</b> —
        seizures, delirium tremens. Please talk to a doctor before cutting down. This app tracks behavior; it doesn't
        treat anything, and it isn't a substitute for medical care.
      </p>
    </div>
  );
}

// ---- Mapping stage ----
function MappingCard({
  debuff,
  events,
  currentDate,
  onUpdateDebuff,
  onAddTrigger,
  grantXp,
  showToast,
}: {
  debuff: Debuff;
  events: TriggerEvent[];
  currentDate: string;
  onUpdateDebuff: DebuffPanelProps['onUpdateDebuff'];
  onAddTrigger: DebuffPanelProps['onAddTrigger'];
  grantXp: DebuffPanelProps['grantXp'];
  showToast: DebuffPanelProps['showToast'];
}) {
  const [logOpen, setLogOpen] = useState(false);
  const [place, setPlace] = useState('');
  const [mood, setMood] = useState('restless');
  const [precededBy, setPrecededBy] = useState('');
  const [acted, setActed] = useState(true);
  const [intensity, setIntensity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [fn, setFn] = useState(debuff.function || '');
  const [replacement, setReplacement] = useState(debuff.replacement || '');

  const day = Math.max(0, daysBetween(debuff.createdAt, currentDate));
  const canAdvance = fn.trim().length > 0 && replacement.trim().length > 0;

  // Pattern report — surfaces once there's enough logged to see the shape.
  const topOf = (vals: string[]): { label: string; count: number } | null => {
    const counts = new Map<string, number>();
    vals.forEach((v) => v && counts.set(v, (counts.get(v) || 0) + 1));
    let best: { label: string; count: number } | null = null;
    counts.forEach((count, label) => {
      if (!best || count > best.count) best = { label, count };
    });
    return best;
  };
  const showReport = events.length >= 3;
  const topMood = showReport ? topOf(events.map((e) => e.mood)) : null;
  const topPlace = showReport ? topOf(events.map((e) => e.place)) : null;
  const actedCount = events.filter((e) => e.acted).length;
  const avgIntensity = events.length ? events.reduce((s, e) => s + e.intensity, 0) / events.length : 0;

  const submitTrigger = () => {
    if (!place.trim()) {
      showToast('Where were you? Add a place.');
      return;
    }
    if (containsDistress(precededBy) || containsDistress(place)) {
      showToast('It sounds like a hard moment — please see the support resources at the top.');
      onAddTrigger({ debuffId: debuff.id, at: currentDate, place: place.trim(), mood, precededBy: precededBy.trim(), acted, intensity });
      // No XP for a distress entry.
    } else {
      onAddTrigger({ debuffId: debuff.id, at: currentDate, place: place.trim(), mood, precededBy: precededBy.trim(), acted, intensity });
      grantXp(10, 'Trigger logged');
    }
    setPlace('');
    setPrecededBy('');
    setLogOpen(false);
  };

  return (
    <div className="bg-[#1a1a2e] border border-white/5 rounded-lg p-3.5">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-serif text-sm font-bold text-slate-200">{debuff.name}</h4>
        <span className="font-mono text-[9px] uppercase tracking-wider text-blue-400 border border-blue-500/40 bg-blue-500/10 rounded-full px-2 py-0.5 shrink-0">
          Mapping · day {day}/14
        </span>
      </div>
      {debuff.needsMedicalNotice && <MedicalNotice />}
      <p className="font-mono text-[10px] text-slate-500 mt-2 leading-relaxed">
        Two weeks of logging only — no quit plan yet. The triggers are never what you assume.{' '}
        <span className="text-slate-400">{events.length} logged.</span>
      </p>

      <button
        type="button"
        onClick={() => setLogOpen((o) => !o)}
        className="mt-2 w-full border border-white/10 hover:border-[#d4af37]/40 text-slate-300 hover:text-[#d4af37] font-mono text-[10px] uppercase tracking-wider py-1.5 rounded transition-all"
      >
        Log a trigger {logOpen ? '▲' : '▾'}
      </button>

      {logOpen && (
        <div className="mt-2 space-y-2 bg-[#0c0c1b]/60 border border-white/5 rounded p-2.5">
          <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Place (bed, desk, kitchen…)"
            className="w-full bg-[#1a1a2e] border border-white/10 rounded px-2 py-1.5 text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:border-[#d4af37]/40" />
          <div className="flex flex-wrap gap-1">
            {MOODS.map((m) => (
              <button key={m} type="button" onClick={() => setMood(m)}
                className={`font-mono text-[8px] uppercase px-1.5 py-1 rounded border ${mood === m ? 'text-[#d4af37] border-[#d4af37]/50 bg-[#d4af37]/10' : 'text-slate-500 border-white/10'}`}>
                {m}
              </button>
            ))}
          </div>
          <input value={precededBy} onChange={(e) => setPrecededBy(e.target.value)} placeholder="What happened right before?"
            className="w-full bg-[#1a1a2e] border border-white/10 rounded px-2 py-1.5 text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:border-[#d4af37]/40" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[9px] text-slate-500 uppercase">Intensity</span>
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} type="button" onClick={() => setIntensity(i as 1 | 2 | 3 | 4 | 5)}
                  className={`w-4 h-4 rounded border text-[8px] ${intensity >= i ? 'bg-rose-500/70 border-rose-400' : 'border-white/20'}`} />
              ))}
            </div>
            <button type="button" onClick={() => setActed((a) => !a)}
              className={`font-mono text-[9px] uppercase px-2 py-1 rounded border ${acted ? 'text-rose-400 border-rose-500/40 bg-rose-500/10' : 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'}`}>
              {acted ? 'acted' : 'resisted'}
            </button>
          </div>
          <button type="button" onClick={submitTrigger}
            className="w-full bg-[#d4af37]/90 hover:bg-[#d4af37] text-[#050510] font-mono text-[9px] font-bold uppercase tracking-wider py-1.5 rounded">
            Log it
          </button>
        </div>
      )}

      {showReport && (
        <div className="mt-3 bg-[#0c0c1b]/60 border border-blue-500/20 rounded-lg p-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-blue-400 mb-1.5">
            {day >= 14 ? 'Your two-week map' : 'What the map shows so far'}
          </p>
          <ul className="space-y-1 font-mono text-[10px] text-slate-400">
            {topMood && (
              <li>Most often when you feel <span className="text-slate-200">{topMood.label}</span> <span className="text-slate-600">({topMood.count}×)</span></li>
            )}
            {topPlace && (
              <li>Usually at <span className="text-slate-200">{topPlace.label}</span> <span className="text-slate-600">({topPlace.count}×)</span></li>
            )}
            <li>Acted on <span className="text-rose-300">{actedCount}</span> of <span className="text-slate-200">{events.length}</span> · avg intensity <span className="text-slate-200">{avgIntensity.toFixed(1)}</span></li>
          </ul>
          <p className="font-serif italic text-[11px] text-slate-500 mt-1.5 leading-relaxed">
            The trigger is rarely the thing itself — it's the {topMood ? topMood.label : 'feeling'} underneath. Name what it's really for below.
          </p>
        </div>
      )}

      {/* Advance to active — needs function + replacement (14 days recommended) */}
      <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
        <p className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">Before a quit plan: name the job</p>
        <input value={fn} onChange={(e) => setFn(e.target.value)} placeholder="What job is this doing for you? (boredom, sleep onset…)"
          className="w-full bg-[#0c0c1b]/60 border border-white/10 rounded px-2 py-1.5 text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:border-[#d4af37]/40" />
        <input value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder="What could serve that same need instead?"
          className="w-full bg-[#0c0c1b]/60 border border-emerald-500/20 rounded px-2 py-1.5 text-[11px] text-emerald-200 placeholder-slate-600 outline-none focus:border-emerald-500/50" />
        <button type="button" disabled={!canAdvance}
          onClick={() => {
            onUpdateDebuff(debuff.id, { function: fn.trim(), replacement: replacement.trim(), stage: 'active', cleanSince: currentDate });
            showToast(`${debuff.name}: active. Focus on removing cues.`);
          }}
          className={`w-full font-mono text-[9px] font-bold uppercase tracking-wider py-1.5 rounded transition-all ${canAdvance ? 'bg-gradient-to-r from-[#aa7c11] to-[#d4af37] text-[#050510]' : 'bg-[#1a1a2e] text-slate-600 cursor-not-allowed'}`}>
          Begin active stage
        </button>
        {day < 14 && <p className="font-mono text-[8px] text-slate-600">14 days of mapping is recommended before this.</p>}
      </div>
    </div>
  );
}

// ---- Intensity picker (1–5 dots) ----
function IntensityDots({ value, onChange }: { value: 1 | 2 | 3 | 4 | 5; onChange: (v: 1 | 2 | 3 | 4 | 5) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i as 1 | 2 | 3 | 4 | 5)}
          className={`w-6 h-6 rounded-full border text-[10px] font-mono transition-all ${value >= i ? 'bg-rose-500/70 border-rose-400 text-[#050510]' : 'border-white/20 text-slate-600'}`}>
          {i}
        </button>
      ))}
    </div>
  );
}

// ---- Urge-surf timer: the therapeutic centerpiece ----
// A breathing pacer that helps the user ride the wave instead of acting on it.
// Captures intensity before and after so the decay can be charted.
function UrgeSurfer({
  onComplete,
  onCancel,
}: {
  onComplete: (before: 1 | 2 | 3 | 4 | 5, after: 1 | 2 | 3 | 4 | 5) => void;
  onCancel: () => void;
}) {
  const [phase, setPhase] = useState<'before' | 'surf' | 'after'>('before');
  const [before, setBefore] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [after, setAfter] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [elapsed, setElapsed] = useState(0);
  const [inhale, setInhale] = useState(true);
  const startRef = useRef(0);

  // Running clock while surfing.
  useEffect(() => {
    if (phase !== 'surf') return;
    startRef.current = Date.now();
    setElapsed(0);
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 250);
    return () => clearInterval(t);
  }, [phase]);

  // Breathing cadence — 5s in, 5s out.
  useEffect(() => {
    if (phase !== 'surf') return;
    setInhale(true);
    const t = setInterval(() => setInhale((v) => !v), 5000);
    return () => clearInterval(t);
  }, [phase]);

  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;

  return (
    <div className="mt-2 bg-[#0c0c1b]/80 border border-emerald-500/25 rounded-lg p-3.5">
      {phase === 'before' && (
        <>
          <p className="font-serif text-[13px] text-slate-200">How strong is the urge right now?</p>
          <p className="font-mono text-[9px] text-slate-500 mt-0.5 mb-2.5">You don't have to fight it — just watch it and breathe.</p>
          <div className="flex items-center justify-between gap-2">
            <IntensityDots value={before} onChange={setBefore} />
            <button type="button" onClick={() => setPhase('surf')}
              className="bg-emerald-500/90 hover:bg-emerald-400 text-[#050510] font-mono text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1">
              <Wind className="w-3 h-3" /> Start
            </button>
          </div>
          <button type="button" onClick={onCancel} className="mt-2 font-mono text-[8px] text-slate-600 hover:text-slate-400 uppercase tracking-wider">Cancel</button>
        </>
      )}

      {phase === 'surf' && (
        <div className="flex flex-col items-center text-center py-1">
          <div className="relative w-24 h-24 flex items-center justify-center my-1">
            <div
              className="absolute rounded-full bg-emerald-500/15 border border-emerald-400/40"
              style={{
                width: '100%',
                height: '100%',
                transform: `scale(${inhale ? 1 : 0.55})`,
                transition: 'transform 5000ms ease-in-out',
              }}
            />
            <span className="relative font-mono text-[10px] uppercase tracking-widest text-emerald-300">
              {inhale ? 'Breathe in' : 'Breathe out'}
            </span>
          </div>
          <p className="font-mono text-lg text-slate-300 tabular-nums mt-1">{mmss}</p>
          <p className="font-serif italic text-[12px] text-slate-400 mt-1.5 leading-relaxed max-w-[15rem]">
            The urge is a wave. It rises, crests, and falls on its own — you don't have to do anything but let it.
          </p>
          <button type="button" onClick={() => setPhase('after')}
            className="mt-3 w-full border border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-300 font-mono text-[9px] font-bold uppercase tracking-wider py-1.5 rounded">
            The wave has passed
          </button>
        </div>
      )}

      {phase === 'after' && (
        <>
          <p className="font-serif text-[13px] text-slate-200">And now — how strong is it?</p>
          <p className="font-mono text-[9px] text-slate-500 mt-0.5 mb-2.5">Notice the difference. That drop is the skill growing.</p>
          <div className="flex items-center justify-between gap-2">
            <IntensityDots value={after} onChange={setAfter} />
            <button type="button" onClick={() => onComplete(before, after)}
              className="bg-gradient-to-r from-[#aa7c11] to-[#d4af37] text-[#050510] font-mono text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 rounded">
              Rode it out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---- Decay chart: proof the urges shrink when surfed ----
function DecayChart({ surfs }: { surfs: TriggerEvent[] }) {
  const charted = surfs.filter((s) => typeof s.intensityAfter === 'number').slice(-12);
  if (charted.length === 0) return null;
  const drops = charted.map((s) => s.intensity - (s.intensityAfter as number));
  const avgDrop = drops.reduce((a, b) => a + b, 0) / drops.length;
  return (
    <div className="mt-3">
      <div className="flex justify-between font-mono text-[9px] uppercase tracking-wider text-slate-500 mb-1.5">
        <span>Urges surfed</span>
        <span className="text-emerald-400">−{avgDrop.toFixed(1)} avg drop</span>
      </div>
      <div className="flex items-end gap-1 h-12 bg-[#0c0c1b] border border-white/5 rounded p-1.5">
        {charted.map((s) => {
          const beforeH = (s.intensity / 5) * 100;
          const afterH = ((s.intensityAfter as number) / 5) * 100;
          return (
            <div key={s.id} className="flex-1 min-w-0 h-full flex items-end justify-center" title={`${s.intensity} → ${s.intensityAfter}`}>
              <div className="w-full max-w-[10px] rounded-sm bg-rose-500/30 relative flex items-end" style={{ height: `${beforeH}%` }}>
                <div className="w-full rounded-sm bg-emerald-400/80" style={{ height: `${(afterH / beforeH) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="font-mono text-[8px] text-slate-600 mt-1">rose = urge at its peak · green = what was left after you breathed</p>
    </div>
  );
}

// ---- Active stage ----
function ActiveCard({
  debuff,
  events,
  currentDate,
  onUpdateDebuff,
  onAddTrigger,
  grantXp,
  showToast,
}: {
  debuff: Debuff;
  events: TriggerEvent[];
  currentDate: string;
  onUpdateDebuff: DebuffPanelProps['onUpdateDebuff'];
  onAddTrigger: DebuffPanelProps['onAddTrigger'];
  grantXp: DebuffPanelProps['grantXp'];
  showToast: DebuffPanelProps['showToast'];
}) {
  const [removalText, setRemovalText] = useState('');
  const [lapseOpen, setLapseOpen] = useState(false);
  const [surfing, setSurfing] = useState(false);

  const current = Math.max(0, daysBetween(debuff.cleanSince, currentDate));
  const cumulative = debuff.totalCleanDays + current;
  const removals = debuff.cueRemovals;
  const removalsDone = removals.filter((r) => r.done).length;
  const removalPct = removals.length ? Math.round((removalsDone / removals.length) * 100) : 0;
  const surfs = events.filter((e) => e.precededBy === 'urge' && !e.acted);

  const addRemoval = () => {
    const t = removalText.trim();
    if (!t) return;
    const item: CueRemoval = { id: uid('cr'), text: t, done: false };
    onUpdateDebuff(debuff.id, { cueRemovals: [...removals, item] });
    setRemovalText('');
  };
  const toggleRemoval = (id: string) => {
    const next = removals.map((r) => (r.id === id ? { ...r, done: !r.done } : r));
    onUpdateDebuff(debuff.id, { cueRemovals: next });
    const item = next.find((r) => r.id === id);
    if (item?.done) grantXp(25, 'Cue removed');
  };
  const deleteRemoval = (id: string) => onUpdateDebuff(debuff.id, { cueRemovals: removals.filter((r) => r.id !== id) });

  const completeSurf = (before: 1 | 2 | 3 | 4 | 5, after: 1 | 2 | 3 | 4 | 5) => {
    onAddTrigger({ debuffId: debuff.id, at: currentDate, place: '', mood: '', precededBy: 'urge', acted: false, intensity: before, intensityAfter: after });
    setSurfing(false);
    grantXp(50, 'Urge surfed');
    const dropped = before - after;
    showToast(dropped > 0 ? `You rode it out — it fell ${dropped} point${dropped > 1 ? 's' : ''}. +50 XP.` : 'You rode it out. +50 XP — urges peak and pass.');
  };

  const confirmLapse = () => {
    onUpdateDebuff(debuff.id, { totalCleanDays: debuff.totalCleanDays + current, cleanSince: currentDate });
    onAddTrigger({ debuffId: debuff.id, at: currentDate, place: '', mood: '', precededBy: 'lapse', acted: true, intensity: 4 });
    grantXp(15, 'Lapse logged honestly');
    setLapseOpen(false);
    showToast('Logged. One lapse doesn’t erase your progress.');
  };

  // Quick win: a cue hit, you said no. One tap, points, no timer needed.
  const resistedToday = events.filter((e) => isResisted(e) && e.at === currentDate).length;
  const quickResist = () => {
    onAddTrigger({ debuffId: debuff.id, at: currentDate, place: '', mood: '', precededBy: 'cue', acted: false, intensity: 3 });
    grantXp(RESIST_XP, 'Cue resisted');
    showToast(`Cue resisted. +${RESIST_XP} XP — that's the rep that rewires it.`);
  };

  return (
    <div className="bg-[#1a1a2e] border border-white/5 rounded-lg p-3.5">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-serif text-sm font-bold text-slate-200">{debuff.name}</h4>
        <span className="font-mono text-[9px] uppercase tracking-wider text-[#d4af37] border border-[#d4af37]/40 bg-[#d4af37]/10 rounded-full px-2 py-0.5 shrink-0">
          Active
        </span>
      </div>
      {debuff.needsMedicalNotice && <MedicalNotice />}

      <div className="flex items-baseline gap-2 mt-2">
        <span className="font-mono text-2xl font-bold text-[#d4af37] tabular-nums">{current}</span>
        <span className="font-mono text-[11px] text-slate-400">
          days clean · <span className="text-[#f3e5ab]">{cumulative} total clean</span>
        </span>
      </div>
      <p className="font-mono text-[8px] text-slate-600 uppercase tracking-wider">the total never resets</p>

      {debuff.replacement && (
        <p className="font-mono text-[9px] text-slate-500 mt-2">
          need <span className="text-slate-400">{debuff.function}</span> → instead{' '}
          <span className="text-emerald-400">{debuff.replacement}</span>
        </p>
      )}

      {/* Cue removals — the metric you control */}
      <div className="mt-3">
        <div className="flex justify-between font-mono text-[9px] uppercase tracking-wider text-slate-500 mb-1">
          <span>Cue removals</span>
          <span>{removalsDone}/{removals.length}</span>
        </div>
        <div className="w-full bg-[#0c0c1b] h-1.5 rounded overflow-hidden border border-white/5">
          <div className="h-full bg-gradient-to-r from-[#aa7c11] to-[#d4af37]" style={{ width: `${removalPct}%` }} />
        </div>
        <div className="space-y-1.5 mt-2">
          {removals.map((r) => (
            <div key={r.id} className="flex items-center gap-2">
              <button type="button" onClick={() => toggleRemoval(r.id)}
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 text-emerald-400 ${r.done ? 'bg-emerald-500/15 border-emerald-500/50' : 'border-white/20 text-transparent'}`}>✓</button>
              <span className={`text-[11px] flex-1 min-w-0 break-words ${r.done ? 'line-through text-slate-500' : 'text-slate-300'}`}>{r.text}</span>
              <button type="button" onClick={() => deleteRemoval(r.id)} className="text-slate-600 hover:text-rose-400 shrink-0"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <input value={removalText} onChange={(e) => setRemovalText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRemoval(); } }}
              placeholder="a cue to remove from your surroundings…"
              className="flex-1 min-w-0 bg-[#0c0c1b]/60 border border-white/10 rounded px-2 py-1 text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:border-[#d4af37]/40" />
            <button type="button" onClick={addRemoval} className="text-slate-500 hover:text-[#d4af37] shrink-0"><Plus className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      <DecayChart surfs={surfs} />

      {surfing ? (
        <UrgeSurfer onComplete={completeSurf} onCancel={() => setSurfing(false)} />
      ) : (
        <div className="mt-3 space-y-2">
          <button type="button" onClick={quickResist}
            className="w-full bg-emerald-500/10 border border-emerald-500/40 hover:bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold uppercase tracking-wider py-2 rounded flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Resisted a cue
            <span className="text-[8px] text-emerald-400/80">+{RESIST_XP}</span>
            {resistedToday > 0 && (
              <span className="ml-1 text-[8px] text-slate-400 normal-case tracking-normal">· {resistedToday} today</span>
            )}
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSurfing(true)}
              className="flex-1 border border-white/10 hover:border-emerald-400/50 text-slate-300 hover:text-emerald-400 font-mono text-[9px] uppercase tracking-wider py-1.5 rounded flex items-center justify-center gap-1">
              <Wind className="w-3 h-3" /> Strong urge — surf it
            </button>
            <button type="button" onClick={() => setLapseOpen((o) => !o)}
              className="flex-1 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 font-mono text-[9px] uppercase tracking-wider py-1.5 rounded">
              I lapsed
            </button>
          </div>
        </div>
      )}

      {lapseOpen && (
        <div className="mt-2 bg-[#0c0c1b]/70 border border-rose-500/25 rounded-lg p-3">
          <p className="font-serif text-[13px] text-slate-200">One lapse. Let’s log what led to it.</p>
          <p className="font-mono text-[9px] text-slate-500 mt-0.5">No reset — your {cumulative} total clean days stay.</p>
          {debuff.lapsePlan && (
            <div className="bg-[#15152a] border-l-2 border-purple-400/60 rounded px-2.5 py-2 mt-2">
              <p className="font-mono text-[8px] text-slate-500 uppercase tracking-widest mb-1">Your own plan</p>
              <p className="font-serif italic text-[12px] text-slate-300">{debuff.lapsePlan}</p>
            </div>
          )}
          <button type="button" onClick={confirmLapse}
            className="w-full mt-2 border border-rose-500/30 hover:bg-rose-500/10 text-rose-300 font-mono text-[9px] uppercase tracking-wider py-1.5 rounded">
            Log it &amp; keep going
          </button>
        </div>
      )}
    </div>
  );
}

export default function DebuffPanel(props: DebuffPanelProps) {
  const { debuffs, triggerEvents, currentDate, localOnly, onToggleLocalOnly, onAddDebuff, onDeleteDebuff } = props;
  const resistsToday = triggerEvents.filter((t) => isResisted(t) && t.at === currentDate).length;
  const resistsTotal = triggerEvents.filter(isResisted).length;
  // Consecutive days (ending today, forgiving of a not-yet-acted today) with at
  // least one cue resisted — reuses the app-wide streak rule.
  const resistStreak = getAppWideStreak(
    Array.from(new Set(triggerEvents.filter(isResisted).map((t) => t.at))),
    currentDate,
  );
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [lapsePlan, setLapsePlan] = useState('');
  const [showCrisis, setShowCrisis] = useState(false);

  const medical = needsMedicalNotice(name);

  const submitAdd = () => {
    const n = name.trim();
    if (!n) return;
    if (containsDistress(lapsePlan) || containsDistress(n)) {
      setShowCrisis(true);
      return;
    }
    if (!lapsePlan.trim()) {
      props.showToast('Write your lapse plan first — it’s what you’ll read on a hard night.');
      return;
    }
    onAddDebuff(n, lapsePlan.trim(), medical);
    setName('');
    setLapsePlan('');
    setAddOpen(false);
  };

  return (
    <div id="debuffs-panel" className="bg-[#15152a] border border-[#d4af37]/20 rounded-lg p-5 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
      <div className="flex justify-between items-center mb-1">
        <div>
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Debuffs</span>
          <p className="font-mono text-[9px] text-slate-600 uppercase tracking-wider mt-0.5">Behaviors to remove</p>
        </div>
        <button type="button" onClick={() => setAddOpen((o) => !o)} className="p-1.5 text-slate-500 hover:text-[#d4af37] transition-colors" title="Track a debuff">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Always-reachable support + privacy */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <button type="button" onClick={() => setShowCrisis((s) => !s)} className="font-mono text-[9px] text-rose-400/80 hover:text-rose-300 flex items-center gap-1 uppercase tracking-wider">
          <LifeBuoy className="w-3 h-3" /> Need help now?
        </button>
        <button type="button" onClick={onToggleLocalOnly} title="Keep this module's data on this device only"
          className={`font-mono text-[8px] uppercase tracking-wider flex items-center gap-1 ${localOnly ? 'text-emerald-400' : 'text-slate-500'}`}>
          <Lock className="w-2.5 h-2.5" /> {localOnly ? 'On-device only' : 'Syncing'}
        </button>
      </div>
      {showCrisis && <CrisisBox />}

      {/* Cues resisted — the daily scoreboard */}
      {debuffs.length > 0 && (
        <div className="flex items-center gap-2.5 mb-3 bg-[#0c0c1b]/60 border border-emerald-500/20 rounded-lg px-3 py-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-mono text-xl font-bold text-emerald-400 tabular-nums">{resistsToday}</span>
            <span className="font-mono text-[10px] text-slate-400"> cue{resistsToday === 1 ? '' : 's'} resisted today</span>
          </div>
          {resistStreak > 0 && (
            <span className="flex items-center gap-0.5 font-mono text-[10px] text-[#d4af37] shrink-0" title={`${resistStreak}-day resist streak`}>
              <Flame className="w-3 h-3" /> {resistStreak}d
            </span>
          )}
          <div className="text-right shrink-0">
            <span className="font-mono text-[11px] text-[#f3e5ab] tabular-nums">{resistsTotal}</span>
            <span className="font-mono text-[8px] text-slate-600 uppercase tracking-wider"> all-time</span>
          </div>
        </div>
      )}

      {addOpen && (
        <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-3 mb-3 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="What are you removing? (e.g. infinite scroll)"
            className="w-full bg-[#0c0c1b]/60 border border-white/10 rounded px-2 py-1.5 text-[12px] text-slate-200 placeholder-slate-600 outline-none focus:border-[#d4af37]/40" />
          {medical && <MedicalNotice />}
          <div>
            <label className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">Your lapse plan · required</label>
            <textarea value={lapsePlan} onChange={(e) => setLapsePlan(e.target.value)} rows={2}
              placeholder="If I slip, I will… (you'll be shown these words on a hard night)"
              className="w-full mt-1 bg-[#0c0c1b]/60 border border-white/10 rounded px-2 py-1.5 text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:border-[#d4af37]/40 resize-none leading-relaxed" />
          </div>
          <p className="font-mono text-[8px] text-slate-600 leading-relaxed flex items-center gap-1">
            <Lock className="w-2.5 h-2.5 text-emerald-400/70" /> Kept on this device{localOnly ? '' : ' unless you turn syncing on'}. First comes 14 days of mapping — no quit plan yet.
          </p>
          <button type="button" onClick={submitAdd}
            className="w-full bg-gradient-to-r from-[#aa7c11] to-[#d4af37] text-[#050510] font-mono text-[9px] font-bold uppercase tracking-wider py-1.5 rounded">
            Start mapping
          </button>
        </div>
      )}

      {debuffs.length === 0 && !addOpen && (
        <p className="font-mono text-[10px] text-slate-600 leading-relaxed">
          Nothing here. A debuff is a behavior that’s automatic and doing a job — you map it before you fight it.
        </p>
      )}

      <div className="space-y-3">
        {debuffs.map((d) => {
          const events = triggerEvents.filter((t) => t.debuffId === d.id);
          return (
            <div key={d.id} className="relative">
              <button type="button" onClick={() => onDeleteDebuff(d.id)}
                className="absolute top-2 right-2 z-10 p-1 text-slate-700 hover:text-rose-400" title="Remove debuff">
                <X className="w-3.5 h-3.5" />
              </button>
              {d.stage === 'mapping' ? (
                <MappingCard debuff={d} events={events} currentDate={currentDate}
                  onUpdateDebuff={props.onUpdateDebuff} onAddTrigger={props.onAddTrigger} grantXp={props.grantXp} showToast={props.showToast} />
              ) : (
                <ActiveCard debuff={d} events={events} currentDate={currentDate}
                  onUpdateDebuff={props.onUpdateDebuff} onAddTrigger={props.onAddTrigger} grantXp={props.grantXp} showToast={props.showToast} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
