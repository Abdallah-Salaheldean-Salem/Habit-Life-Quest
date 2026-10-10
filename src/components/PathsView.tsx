/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { Lock, Check, Pencil, Hammer, GitBranch, ScrollText, Feather, Upload, FileText, X } from 'lucide-react';
import { CustomPath, QuestDraft, STATS, UserClass } from '../types';
import { TIER_LABEL, TIER_NAME } from '../data/lifeTree';
import { MAX_PATHS, MAX_TIERS, nodeStatus, pathNodeToDraft, pathPercent, PathNodeStatus } from '../utils/paths';
import { importPaths, describeImport } from '../utils/pathImport';
import { buildPathImportGuide } from '../utils/pathTemplate';
import { layoutPathTree, LaidCard } from '../utils/pathLayout';

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
  const percent = pathPercent(path, masteredNodeIds);
  const capstoneDone = path.nodes.some((n) => n.tier === MAX_TIERS && masteredNodeIds.has(n.id));

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

      {/* The tree: the path is the root; tiers branch upward from it */}
      <PathTree path={path} masteredNodeIds={masteredNodeIds} activeNodeIds={activeNodeIds} onAddQuest={onAddQuest} />
    </div>
  );
}

/** Width of an element, kept current as it resizes (phone rotation, sidebar…). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(Math.floor(el.getBoundingClientRect().width));
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * A path drawn as a skill tree, matching the Life Skill Tree's spatial view:
 * node cards with tier badges, branch lines in the stat colour meeting at
 * junctions on a trunk, a glowing root, and a dashed tease for the first
 * sealed tier. Deeper tiers stay hidden until earned, exactly like the
 * built-in tree.
 */
function PathTree({
  path,
  masteredNodeIds,
  activeNodeIds,
  onAddQuest,
}: {
  path: CustomPath;
  masteredNodeIds: Set<string>;
  activeNodeIds: Set<string>;
  onAddQuest: (q: QuestDraft) => void;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const config = STATS[path.stat];
  const color = config.color;
  const layout = width ? layoutPathTree(path, masteredNodeIds, width) : null;
  const percent = pathPercent(path, masteredNodeIds);

  // A soft S-curve from a card's bottom-centre down to its junction.
  const branch = (c: LaidCard) => {
    const x1 = c.x + c.w / 2;
    const y1 = c.y + c.h;
    const { x: x2, y: y2 } = c.anchor;
    const my = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
  };

  return (
    <div ref={ref} className="w-full">
      {layout && (
        <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
          <svg className="absolute inset-0" width={layout.width} height={layout.height} style={{ pointerEvents: 'none' }} aria-hidden>
            {layout.trunk.map((t, i) => (
              <line
                key={`t${i}`}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={t.locked ? 'rgba(255,255,255,0.14)' : color}
                strokeOpacity={t.locked ? 1 : 0.5}
                strokeWidth={2}
                strokeDasharray={t.locked ? '4 5' : undefined}
              />
            ))}
            {layout.cards.map((c, i) => (
              <path
                key={`b${i}`}
                d={branch(c)}
                fill="none"
                stroke={c.kind === 'locked' ? 'rgba(255,255,255,0.14)' : color}
                strokeOpacity={c.kind === 'locked' ? 1 : 0.45}
                strokeWidth={2}
                strokeDasharray={c.kind === 'locked' ? '4 5' : undefined}
              />
            ))}
            {layout.hubs.map((h, i) => (
              <circle
                key={`h${i}`}
                cx={h.x}
                cy={h.y}
                r={4}
                fill="#050510"
                stroke={h.locked ? 'rgba(255,255,255,0.2)' : color}
                strokeWidth={2}
              />
            ))}
          </svg>

          {layout.cards.map((c) =>
            c.kind === 'locked' ? (
              <div
                key={`locked-${c.tier}`}
                className="absolute rounded-lg border border-dashed border-white/10 bg-[#0c0c1b] flex flex-col items-center justify-center text-center px-2"
                style={{ left: c.x, top: c.y, width: c.w, height: c.h }}
              >
                <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-[#050510] border border-white/15 flex items-center justify-center">
                  <Lock className="w-2 h-2 text-slate-500" />
                </span>
                <p className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">{c.count} locked</p>
                <p className="font-mono text-[8px] text-slate-600 uppercase tracking-wider mt-0.5 leading-snug">
                  Master a <span style={{ color }}>{TIER_NAME[layout.frontier]}</span> node
                </p>
              </div>
            ) : (
              <PathTreeCard
                key={c.node!.id}
                card={c}
                path={path}
                status={nodeStatus(c.node!, path, masteredNodeIds, activeNodeIds)}
                onAddQuest={onAddQuest}
              />
            ),
          )}

          {/* Root — the path itself */}
          <div
            className="absolute z-20 rounded-full border-2 bg-[#15152a] flex flex-col items-center justify-center text-center px-2"
            style={{
              left: layout.root.x - layout.root.r,
              top: layout.root.y - layout.root.r,
              width: layout.root.r * 2,
              height: layout.root.r * 2,
              borderColor: color,
              boxShadow: `0 0 22px ${color}73`,
            }}
            title={path.purpose || path.name}
          >
            <span className="font-serif text-[10px] font-bold uppercase tracking-wider leading-tight line-clamp-2" style={{ color }}>
              {path.name}
            </span>
            <span className="font-mono text-[7px] text-slate-500 uppercase tracking-widest mt-1">{percent}% · root</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PathTreeCard({
  card,
  path,
  status,
  onAddQuest,
}: {
  card: LaidCard;
  path: CustomPath;
  status: PathNodeStatus;
  onAddQuest: (q: QuestDraft) => void;
}) {
  const node = card.node!;
  const color = STATS[path.stat].color;
  const meta = `${node.type} · ${node.difficulty}${node.type === 'weekly' ? ` · ${node.target}×/wk` : ''}`;
  return (
    <button
      type="button"
      onClick={() => onAddQuest(pathNodeToDraft(node, path))}
      title={`${node.description ?? node.title}\n\nTap to add this quest.`}
      className="absolute z-10 rounded-lg border bg-[#15152a] hover:bg-[#1a1a2e] flex flex-col items-center justify-center text-center px-2 transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.98]"
      style={{ left: card.x, top: card.y, width: card.w, height: card.h, borderColor: color, boxShadow: `0 0 10px ${color}22` }}
    >
      <span
        className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-[#050510] border flex items-center justify-center font-mono text-[8px] font-bold"
        style={{ borderColor: color, color }}
      >
        {TIER_LABEL[node.tier]}
      </span>
      {status === 'mastered' && <Check className="absolute top-1.5 right-1.5 w-3 h-3 text-[#d4af37]" aria-label="Mastered" />}
      <h4 className="font-bold text-[13px] sm:text-sm leading-tight line-clamp-2" style={{ color }}>
        {node.title}
      </h4>
      <p className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-wider mt-1 leading-snug">
        {meta}
        {status === 'active' && <span className="text-emerald-400/70"> · on board</span>}
      </p>
    </button>
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
      <div className="space-y-4">
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
