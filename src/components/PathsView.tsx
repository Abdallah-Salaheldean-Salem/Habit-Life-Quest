/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Plus, Lock, Check, Pencil, Hammer, GitBranch, ScrollText, Feather, Upload, FileText, X } from 'lucide-react';
import { CustomPath, PathNode, QuestDraft, STATS, UserClass } from '../types';
import { TIER_LABEL, TIER_NAME } from '../data/lifeTree';
import { MAX_PATHS, MAX_TIERS, nodeStatus, pathFrontier, pathNodeToDraft, pathPercent, PathNodeStatus } from '../utils/paths';
import { importPaths, describeImport } from '../utils/pathImport';
import { buildPathImportGuide } from '../utils/pathTemplate';

// ---------------------------------------------------------
// MY PATHS — user-forged skill trees.
// Each path is drawn as an ascent: a trunk in the path's stat colour with
// tier markers I → ★, the same node cards, mastery checks and locked-tier
// teasers as the Life Skill Tree. A locked node shows its title (you wrote
// it) but can't go on the board until its tier is revealed.
// ---------------------------------------------------------

interface Props {
  paths: CustomPath[];
  masteredNodeIds: Set<string>;
  activeNodeIds: Set<string>;
  onAddQuest: (q: QuestDraft) => void;
  onForge: () => void;
  onEdit: (path: CustomPath) => void;
  /** Add paths read from an import file. */
  onImportPaths: (paths: CustomPath[]) => void;
  userClass?: UserClass;
}

/**
 * Template + Import — the same pair as the task importer elsewhere: Template
 * downloads an AI-ready Markdown guide; Import reads the JSON it produces and
 * merges it in, reporting what happened in a banner.
 */
function useImportExport(paths: CustomPath[], onImportPaths: (p: CustomPath[]) => void, userClass?: UserClass) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const { paths: added, summary } = importPaths(paths, data, new Date().toISOString());
      if (added.length) onImportPaths(added);
      setMsg({ ok: summary.added > 0, text: describeImport(summary) });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof SyntaxError ? 'That file isn’t valid JSON.' : (err as Error).message });
    }
  };

  const downloadTemplate = () => {
    const md = buildPathImportGuide(paths, (typeof document !== 'undefined' && document.title) || 'Habit Quest', userClass);
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'habit-quest_path-import-template.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const fileInput = (
    <input ref={inputRef} type="file" accept=".json,application/json" onChange={handleFile} className="hidden" />
  );
  const buttons = (
    <>
      <button
        id="path-template-btn"
        type="button"
        onClick={downloadTemplate}
        title="Download a template + guide you can give to an AI to prepare an import file"
        className="shrink-0 border border-white/10 hover:border-white/25 text-slate-300 hover:text-white font-mono text-[9px] uppercase tracking-wider py-1.5 px-3 rounded cursor-pointer transition-all inline-flex items-center gap-1.5"
      >
        <FileText className="w-3 h-3" /> Template
      </button>
      <button
        id="path-import-btn"
        type="button"
        onClick={() => inputRef.current?.click()}
        title="Import paths from a .json file"
        className="shrink-0 border border-sky-500/30 hover:bg-sky-500/10 text-sky-300 font-mono text-[9px] uppercase tracking-wider py-1.5 px-3 rounded cursor-pointer transition-all inline-flex items-center gap-1.5"
      >
        <Upload className="w-3 h-3" /> Import
      </button>
    </>
  );
  const banner = msg && (
    <div
      id="path-import-result"
      className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-3 py-2 font-mono text-[10px] ${
        msg.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
      }`}
    >
      <span>{msg.text}</span>
      <button type="button" onClick={() => setMsg(null)} className="shrink-0 opacity-70 hover:opacity-100 cursor-pointer" title="Dismiss">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
  return { fileInput, buttons, banner };
}

function PathNodeCard({
  node,
  path,
  status,
  onAddQuest,
}: {
  node: PathNode;
  path: CustomPath;
  status: PathNodeStatus;
  onAddQuest: (q: QuestDraft) => void;
}) {
  const color = STATS[path.stat].color;
  const locked = status === 'locked';
  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => onAddQuest(pathNodeToDraft(node, path))}
      title={locked ? 'Sealed — master a node in the tier below to reveal it.' : `${node.description ?? ''}\n\nTap to add this quest.`.trim()}
      className={`w-full text-left border border-white/5 rounded-md p-2 transition-all group ${
        locked ? 'bg-[#0c0c1b]/60 border-dashed cursor-not-allowed' : 'bg-[#1a1a2e] hover:bg-[#1e1e36] active:bg-[#1e1e36] cursor-pointer'
      }`}
      style={{ borderLeftColor: locked ? 'rgba(255,255,255,0.08)' : color, borderLeftWidth: 3, borderLeftStyle: 'solid' }}
    >
      <div className="flex items-start justify-between gap-1.5">
        <h5 className={`font-semibold text-[11px] leading-tight ${locked ? 'text-slate-600' : ''}`} style={locked ? undefined : { color }}>
          {node.title}
        </h5>
        {status === 'mastered' ? (
          <Check className="w-3 h-3 text-[#d4af37] shrink-0 mt-0.5" />
        ) : locked ? (
          <Lock className="w-3 h-3 text-slate-700 shrink-0 mt-0.5" />
        ) : (
          <Plus className="w-3 h-3 text-slate-600 group-hover:text-white shrink-0 mt-0.5" />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1 mt-1 font-mono text-[7px] text-slate-500 uppercase tracking-wide">
        <span>{node.type}</span>
        <span>·</span>
        <span>{node.difficulty}</span>
        {node.type === 'weekly' && (
          <>
            <span>·</span>
            <span>{node.target}×/wk</span>
          </>
        )}
        {status === 'mastered' && <span className="text-[#d4af37] normal-case">· mastered</span>}
        {status === 'active' && <span className="text-emerald-400/70 normal-case">· on board</span>}
        {locked && <span className="text-slate-600 normal-case">· sealed</span>}
      </div>
    </button>
  );
}

function PathColumn({
  path,
  masteredNodeIds,
  activeNodeIds,
  onAddQuest,
  onEdit,
}: {
  path: CustomPath;
  masteredNodeIds: Set<string>;
  activeNodeIds: Set<string>;
  onAddQuest: (q: QuestDraft) => void;
  onEdit: (p: CustomPath) => void;
}) {
  const config = STATS[path.stat];
  const frontier = pathFrontier(path, masteredNodeIds);
  const percent = pathPercent(path, masteredNodeIds);
  const tiers = Array.from({ length: MAX_TIERS }, (_, i) => i + 1).filter((t) => path.nodes.some((n) => n.tier === t));
  const capstoneDone = path.nodes.some((n) => n.tier === MAX_TIERS && masteredNodeIds.has(n.id));
  // The first sealed tier gets the "how to reveal" hint.
  const firstSealed = tiers.find((t) => t > frontier);

  return (
    <div className="bg-[#0f0f22] border border-white/5 rounded-lg p-4" style={{ borderTopColor: `${config.color}80`, borderTopWidth: 2 }}>
      {/* Path header */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <h4 className="font-serif text-sm font-bold uppercase tracking-widest truncate" style={{ color: config.color }}>
            {path.name}
          </h4>
          <p className="font-mono text-[8px] text-slate-600 uppercase tracking-wider mt-0.5">
            {config.name} path · {path.nodes.length} node{path.nodes.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onEdit(path)}
          className="p-1.5 text-slate-500 hover:text-[#d4af37] transition-colors cursor-pointer shrink-0"
          title="Reforge this path"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
      {path.purpose && <p className="font-sans text-[11px] text-slate-400 italic leading-snug mb-2">“{path.purpose}”</p>}

      {/* Progress */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-1 bg-[#1a1a2e] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: config.color }} />
        </div>
        <span className="font-mono text-[8px] text-slate-500">{capstoneDone ? '★ SEALED' : `${percent}%`}</span>
      </div>

      {/* The ascent: a trunk with tier markers */}
      <div className="relative pl-6">
        <div className="absolute left-2 top-1 bottom-1 w-px" style={{ backgroundColor: `${config.color}40` }} />
        <div className="space-y-3">
          {tiers.map((tier) => {
            const nodes = path.nodes.filter((n) => n.tier === tier);
            const revealed = tier <= frontier;
            const cleared = nodes.some((n) => masteredNodeIds.has(n.id));
            return (
              <div key={tier} className="relative">
                <span
                  className="absolute -left-6 top-0 w-4 h-4 rounded-full border bg-[#050510] flex items-center justify-center font-mono text-[7px] font-bold"
                  style={
                    revealed
                      ? { borderColor: config.color, color: cleared ? '#050510' : config.color, backgroundColor: cleared ? config.color : '#050510' }
                      : { borderColor: 'rgba(255,255,255,0.15)', color: '#475569' }
                  }
                >
                  {revealed ? TIER_LABEL[tier] : <Lock className="w-2 h-2" />}
                </span>
                <div className="font-mono text-[7px] uppercase tracking-widest mb-1.5 pt-0.5" style={{ color: revealed ? '#64748b' : '#334155' }}>
                  {TIER_LABEL[tier]} · {TIER_NAME[tier]}
                  {tier === firstSealed && (
                    <span className="normal-case tracking-normal"> — master a {TIER_NAME[frontier]} node to reveal</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {nodes.map((n) => (
                    <PathNodeCard
                      key={n.id}
                      node={n}
                      path={path}
                      status={nodeStatus(n, path, masteredNodeIds, activeNodeIds)}
                      onAddQuest={onAddQuest}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function PathsView({ paths, masteredNodeIds, activeNodeIds, onAddQuest, onForge, onEdit, onImportPaths, userClass }: Props) {
  const { fileInput, buttons, banner } = useImportExport(paths, onImportPaths, userClass);

  if (paths.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        {fileInput}
        {banner}
        <div className="w-12 h-12 mx-auto rounded-full border border-[#d4af37]/30 bg-[#1a1a2e] flex items-center justify-center mb-4">
          <Hammer className="w-5 h-5 text-[#d4af37]" />
        </div>
        <h3 className="font-serif text-base font-bold text-[#d4af37] uppercase tracking-widest">Forge Your Own Path</h3>
        <p className="font-sans text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
          The Life Skill Tree is the road everyone walks. A Path is yours — a degree, a memorisation, a comeback, a venture.
          It plays by the same rules: master a node and the next tier reveals itself.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-6 max-w-xl mx-auto text-left">
          {[
            { icon: GitBranch, title: 'Fork a branch', body: 'Copy Body, Mind, Career, Spirit or Hobby and make it yours.' },
            { icon: ScrollText, title: 'Start from a template', body: 'Degree, Memorisation, Comeback, or Venture.' },
            { icon: Feather, title: 'Start blank', body: 'Inscribe just your first node. Add deeper tiers as you climb.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-[#1a1a2e] border border-white/5 rounded-lg p-3">
              <Icon className="w-3.5 h-3.5 text-[#d4af37] mb-1.5" />
              <div className="font-mono text-[9px] text-slate-200 uppercase tracking-wider font-bold">{title}</div>
              <div className="font-sans text-[10px] text-slate-500 mt-1 leading-snug">{body}</div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onForge}
          className="mt-6 bg-gradient-to-r from-[#aa7c11] to-[#d4af37] hover:from-[#d4af37] hover:to-[#f3e5ab] text-[#050510] font-sans font-bold text-xs uppercase tracking-widest py-2.5 px-6 rounded-md shadow-lg transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <Hammer className="w-3.5 h-3.5" /> Forge a Path
        </button>
        <div className="mt-4 flex items-center justify-center gap-2">{buttons}</div>
        <p className="font-sans text-[10px] text-slate-600 mt-2 max-w-sm mx-auto leading-snug">
          Or download the template, hand it to an AI with your goal, and import the path it writes.
        </p>
      </div>
    );
  }

  return (
    <div>
      {fileInput}
      {banner}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <p className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">
          Tap a revealed node to add it to your board · {paths.length}/{MAX_PATHS} paths
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
        {buttons}
        {paths.length < MAX_PATHS && (
          <button
            type="button"
            onClick={onForge}
            className="shrink-0 border border-[#d4af37]/40 hover:bg-[#d4af37]/10 text-[#d4af37] font-mono text-[9px] uppercase tracking-wider py-1.5 px-3 rounded cursor-pointer transition-all inline-flex items-center gap-1.5"
          >
            <Hammer className="w-3 h-3" /> Forge a Path
          </button>
        )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paths.map((p) => (
          <PathColumn
            key={p.id}
            path={p}
            masteredNodeIds={masteredNodeIds}
            activeNodeIds={activeNodeIds}
            onAddQuest={onAddQuest}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}
