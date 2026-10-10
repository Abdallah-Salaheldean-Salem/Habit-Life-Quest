/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Lock, Trash2, Plus, GitBranch, ScrollText, Feather, ChevronDown, ChevronRight, Hammer } from 'lucide-react';
import { CustomPath, PathNode, QuestDifficulty, QuestType, StatType, STATS } from '../types';
import { BRANCH_ORDER, TIER_LABEL, TIER_NAME } from '../data/lifeTree';
import {
  MAX_NODES_PER_TIER,
  MAX_TIERS,
  NAME_MAX,
  TITLE_MAX,
  PATH_TEMPLATES,
  blankPath,
  forkBranch,
  newPathNode,
  pathFromTemplate,
  protectMastered,
  validatePath,
} from '../utils/paths';

// ---------------------------------------------------------
// FORGE A PATH — create or reforge a custom skill tree.
// Creating starts with a choice (fork a branch / template / blank) so a
// usable path exists in seconds; the editor then lets you inscribe nodes per
// tier. Mastered nodes are sealed: rewordable, never deletable.
// ---------------------------------------------------------

interface Props {
  /** The path being reforged, or undefined to forge a new one. */
  editing?: CustomPath;
  masteredNodeIds: Set<string>;
  /** Pre-selected stat for a blank path (the class's bonus stat). */
  defaultStat: StatType;
  onSave: (path: CustomPath) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const TYPES: QuestType[] = ['daily', 'weekly', 'milestone'];
const DIFFICULTIES: QuestDifficulty[] = ['easy', 'normal', 'hard'];

const inputCls =
  'w-full bg-[#1a1a2e] border border-white/5 focus:border-[#d4af37]/50 rounded-lg py-2.5 px-3 text-sm text-[#e0e0e0] placeholder-slate-600 outline-none transition-all font-sans';
const labelCls = 'block font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold';

function NodeEditor({
  node,
  color,
  sealed,
  onChange,
  onRemove,
}: {
  node: PathNode;
  color: string;
  sealed: boolean;
  onChange: (patch: Partial<PathNode>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(!node.title);
  return (
    <div className="bg-[#1a1a2e] border border-white/5 rounded-md p-2" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="p-0.5 text-slate-500 hover:text-slate-300 cursor-pointer shrink-0"
          title={open ? 'Collapse' : 'Expand'}
        >
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <input
          type="text"
          maxLength={TITLE_MAX}
          placeholder="Name this node…"
          value={node.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="flex-1 min-w-0 bg-transparent text-[12px] font-semibold outline-none placeholder-slate-600"
          style={{ color }}
        />
        {sealed ? (
          <span title="Mastered — sealed. You can reword it, but not remove it." className="p-1 shrink-0">
            <Lock className="w-3.5 h-3.5 text-[#d4af37]" />
          </span>
        ) : (
          <button type="button" onClick={onRemove} className="p-1 text-slate-600 hover:text-rose-400 cursor-pointer shrink-0" title="Remove node">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 pl-5 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onChange({ type: t, target: t === 'weekly' ? Math.max(node.target, 2) : 1 })}
                className={`px-2 py-1 rounded font-mono text-[9px] uppercase tracking-wider border cursor-pointer transition-all ${
                  node.type === t ? 'border-[#d4af37]/50 text-[#d4af37] bg-[#d4af37]/10' : 'border-white/5 text-slate-500 hover:text-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
            <span className="w-px bg-white/5 mx-0.5" />
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onChange({ difficulty: d })}
                className={`px-2 py-1 rounded font-mono text-[9px] uppercase tracking-wider border cursor-pointer transition-all ${
                  node.difficulty === d ? 'border-[#d4af37]/50 text-[#d4af37] bg-[#d4af37]/10' : 'border-white/5 text-slate-500 hover:text-slate-300'
                }`}
              >
                {d}
              </button>
            ))}
            {node.type === 'weekly' && (
              <label className="flex items-center gap-1 font-mono text-[9px] text-slate-500 uppercase">
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={node.target}
                  onChange={(e) => onChange({ target: Math.min(7, Math.max(1, Number(e.target.value) || 1)) })}
                  className="w-10 bg-[#0c0c1b] border border-white/10 rounded px-1 py-0.5 text-[10px] text-slate-200 outline-none"
                />
                ×/wk
              </label>
            )}
          </div>
          <textarea
            rows={2}
            maxLength={280}
            placeholder="Why it matters, and what counts as unlocked…"
            value={node.description ?? ''}
            onChange={(e) => onChange({ description: e.target.value })}
            className="w-full bg-[#0c0c1b] border border-white/5 focus:border-[#d4af37]/40 rounded py-1.5 px-2 text-[11px] text-slate-300 placeholder-slate-600 outline-none resize-none leading-relaxed"
          />
        </div>
      )}
    </div>
  );
}

export default function ForgePathModal({ editing, masteredNodeIds, defaultStat, onSave, onDelete, onClose }: Props) {
  const now = () => new Date().toISOString();
  const [draft, setDraft] = useState<CustomPath | null>(editing ? { ...editing, nodes: editing.nodes.map((n) => ({ ...n })) } : null);
  const [error, setError] = useState<string | null>(null);

  const patchNode = (id: string, patch: Partial<PathNode>) =>
    setDraft((d) => (d ? { ...d, nodes: d.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) } : d));
  const removeNode = (id: string) => setDraft((d) => (d ? { ...d, nodes: d.nodes.filter((n) => n.id !== id) } : d));
  const addNode = (tier: number) => setDraft((d) => (d ? { ...d, nodes: [...d.nodes, newPathNode(tier)] } : d));

  const handleSave = () => {
    if (!draft) return;
    const cleaned: CustomPath = {
      ...draft,
      name: draft.name.trim(),
      purpose: draft.purpose?.trim() || undefined,
      nodes: draft.nodes.map((n) => ({ ...n, title: n.title.trim(), description: n.description?.trim() || undefined })),
      updatedAt: now(),
    };
    const problem = validatePath(cleaned);
    if (problem) {
      setError(problem);
      return;
    }
    onSave(protectMastered(editing, cleaned, masteredNodeIds));
  };

  // ---------- Step 1: choose a starting point (new paths only) ----------
  if (!draft) {
    return (
      <div className="fixed inset-0 bg-[#050510]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-lg bg-[#15152a] border border-[#d4af37]/20 rounded-2xl p-5 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.08)] animate-fade-in">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-serif text-lg font-bold text-[#d4af37] uppercase tracking-widest">Forge a Path</h2>
            <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-[#d4af37] transition-colors cursor-pointer" title="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="font-sans text-xs text-slate-400 mb-6 leading-relaxed">Choose where to begin. Everything can be reshaped after.</p>

          <div className="space-y-5">
            <div>
              <div className={labelCls}>
                <GitBranch className="w-3 h-3 inline -mt-0.5 mr-1" /> Fork a branch
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {BRANCH_ORDER.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDraft(forkBranch(s, `My ${STATS[s].name} Path`, now()))}
                    className="p-2.5 rounded-lg border text-center font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer hover:bg-white/5"
                    style={{ color: STATS[s].color, borderColor: `${STATS[s].color}50` }}
                  >
                    {STATS[s].name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className={labelCls}>
                <ScrollText className="w-3 h-3 inline -mt-0.5 mr-1" /> From a template
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PATH_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.key}
                    type="button"
                    onClick={() => setDraft(pathFromTemplate(tpl, now()))}
                    className="text-left bg-[#1a1a2e] hover:bg-[#1e1e36] border border-white/5 rounded-lg p-3 cursor-pointer transition-all"
                    style={{ borderLeftColor: STATS[tpl.stat].color, borderLeftWidth: 3 }}
                  >
                    <div className="font-serif text-[12px] font-bold" style={{ color: STATS[tpl.stat].color }}>
                      {tpl.name}
                    </div>
                    <div className="font-sans text-[10px] text-slate-500 mt-1 leading-snug">{tpl.purpose}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDraft(blankPath(now(), { stat: defaultStat }))}
              className="w-full border border-dashed border-white/10 hover:border-[#d4af37]/40 rounded-lg p-3 text-left cursor-pointer transition-all"
            >
              <div className="font-mono text-[10px] text-slate-200 uppercase tracking-wider font-bold">
                <Feather className="w-3 h-3 inline -mt-0.5 mr-1 text-[#d4af37]" /> Start blank
              </div>
              <div className="font-sans text-[10px] text-slate-500 mt-1">Name it and inscribe your first node. Deeper tiers can wait until you get there.</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Step 2: the editor ----------
  const color = STATS[draft.stat].color;
  return (
    <div className="fixed inset-0 bg-[#050510]/80 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#15152a] border border-[#d4af37]/20 rounded-2xl p-5 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.08)] animate-fade-in my-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif text-lg font-bold text-[#d4af37] uppercase tracking-widest">{editing ? 'Reforge Path' : 'Forge a Path'}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-[#d4af37] transition-colors cursor-pointer" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className={labelCls}>Path Name</label>
            <input
              type="text"
              maxLength={NAME_MAX}
              autoFocus={!editing}
              placeholder="e.g. The Engineer’s Ascent"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              Purpose <span className="text-slate-600 lowercase tracking-normal">· optional</span>
            </label>
            <input
              type="text"
              maxLength={120}
              placeholder="What this path builds toward"
              value={draft.purpose ?? ''}
              onChange={(e) => setDraft({ ...draft, purpose: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Stat</label>
            <div className="grid grid-cols-5 gap-1.5">
              {BRANCH_ORDER.map((s) => {
                const active = draft.stat === s;
                const c = STATS[s].color;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDraft({ ...draft, stat: s })}
                    className="py-2 rounded-lg border text-center font-mono text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                    style={active ? { backgroundColor: `${c}20`, color: c, borderColor: `${c}80` } : { borderColor: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}
                  >
                    {STATS[s].name}
                  </button>
                );
              })}
            </div>
            <p className="font-sans text-[10px] text-slate-600 mt-1.5">Sets the colour and which class earns bonus XP on this path.</p>
          </div>

          {/* Tiers */}
          <div>
            <label className={labelCls}>Nodes</label>
            <div className="relative pl-6 space-y-3">
              <div className="absolute left-2 top-1 bottom-1 w-px" style={{ backgroundColor: `${color}40` }} />
              {Array.from({ length: MAX_TIERS }, (_, i) => i + 1).map((tier) => {
                const nodes = draft.nodes.filter((n) => n.tier === tier);
                const full = nodes.length >= MAX_NODES_PER_TIER;
                return (
                  <div key={tier} className="relative">
                    <span
                      className="absolute -left-6 top-0 w-4 h-4 rounded-full border bg-[#050510] flex items-center justify-center font-mono text-[7px] font-bold"
                      style={{ borderColor: nodes.length ? color : 'rgba(255,255,255,0.15)', color: nodes.length ? color : '#475569' }}
                    >
                      {TIER_LABEL[tier]}
                    </span>
                    <div className="font-mono text-[8px] text-slate-500 uppercase tracking-widest mb-1.5 pt-0.5">
                      {TIER_NAME[tier]}
                      {tier === 1 && <span className="normal-case tracking-normal text-slate-600"> · always open</span>}
                    </div>
                    <div className="space-y-1.5">
                      {nodes.map((n) => (
                        <NodeEditor
                          key={n.id}
                          node={n}
                          color={color}
                          sealed={masteredNodeIds.has(n.id)}
                          onChange={(p) => patchNode(n.id, p)}
                          onRemove={() => removeNode(n.id)}
                        />
                      ))}
                      {!full && (
                        <button
                          type="button"
                          onClick={() => addNode(tier)}
                          className="w-full border border-dashed border-white/10 hover:border-[#d4af37]/40 text-slate-500 hover:text-[#d4af37] rounded-md py-1.5 font-mono text-[9px] uppercase tracking-wider cursor-pointer transition-all inline-flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Inscribe a {TIER_LABEL[tier]} node
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="font-sans text-[10px] text-slate-600 mt-2 leading-snug">
              Up to {MAX_NODES_PER_TIER} nodes a tier. A tier reveals once you master any node in the tier below it.
            </p>
          </div>

          {error && <p className="font-sans text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            {editing ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Abandon "${editing.name}"? Quests already on your board — and all their XP — stay.`)) onDelete(editing.id);
                }}
                className="border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-mono text-[10px] uppercase tracking-wider py-2.5 px-3 rounded-md cursor-pointer transition-colors"
              >
                Abandon
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraft(null);
                  setError(null);
                }}
                className="border border-white/5 text-slate-400 font-mono text-[10px] uppercase tracking-wider py-2.5 px-3 rounded-md hover:bg-[#1a1a2e] transition-colors cursor-pointer"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-[#aa7c11] to-[#d4af37] hover:from-[#d4af37] hover:to-[#f3e5ab] text-[#050510] font-sans font-bold text-xs uppercase tracking-widest py-2.5 rounded-md shadow-lg transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <Hammer className="w-3.5 h-3.5" /> {editing ? 'Seal Changes' : 'Forge Path'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
