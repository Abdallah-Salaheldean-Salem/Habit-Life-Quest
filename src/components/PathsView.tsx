/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, Lock, Check, Pencil, Hammer, GitBranch, ScrollText, Feather } from 'lucide-react';
import { CustomPath, PathNode, QuestDraft, STATS } from '../types';
import { TIER_LABEL, TIER_NAME } from '../data/lifeTree';
import { MAX_PATHS, MAX_TIERS, nodeStatus, pathFrontier, pathNodeToDraft, pathPercent, PathNodeStatus } from '../utils/paths';

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

export default function PathsView({ paths, masteredNodeIds, activeNodeIds, onAddQuest, onForge, onEdit }: Props) {
  if (paths.length === 0) {
    return (
      <div className="text-center py-8 px-4">
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
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-4">
        <p className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">
          Tap a revealed node to add it to your board · {paths.length}/{MAX_PATHS} paths
        </p>
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
