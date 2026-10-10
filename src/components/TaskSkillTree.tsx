import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronRight, Swords, Lock, Check, Sunrise } from 'lucide-react';
import { StatType, STATS, QuestDifficulty, QuestType, QuestDraft } from '../types';

import { NODES, NodeData, TIER_LABEL, TIER_NAME, BRANCH_ORDER, TIERS } from '../data/lifeTree';
import { lifeNodeId } from '../utils/paths';

function nodeToDraft(n: NodeData): QuestDraft {
  return {
    title: n.title,
    stat: n.stat,
    difficulty: n.difficulty,
    type: n.type,
    target: n.target,
    tier: n.tier,
    description: n.description,
    nodeId: lifeNodeId(n),
  };
}

type NodeStatus = 'mastered' | 'active' | 'available';

function NodeCard({
  node,
  status,
  onAddQuest,
}: {
  node: NodeData;
  status: NodeStatus;
  onAddQuest: (q: QuestDraft) => void;
}) {
  const config = STATS[node.stat];
  const mastered = status === 'mastered';
  const active = status === 'active';
  return (
    <button
      type="button"
      onClick={() => onAddQuest(nodeToDraft(node))}
      title={`${node.description}\n\nTap to add this quest.`}
      className="w-full text-left bg-[#1a1a2e] hover:bg-[#1e1e36] active:bg-[#1e1e36] border border-white/5 rounded-md p-2 transition-all group"
      style={{ borderLeftColor: config.color, borderLeftWidth: 3 }}
    >
      <div className="flex items-start justify-between gap-1.5">
        <h5 className="font-semibold text-[11px] leading-tight" style={{ color: config.color }}>
          {node.title}
        </h5>
        {mastered ? (
          <span title="Mastered" className="shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-[#d4af37]" />
          </span>
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
        {mastered && <span className="text-[#d4af37] normal-case">· mastered</span>}
        {active && <span className="text-emerald-400/70 normal-case">· on board</span>}
        {!mastered && !active && node.v1 && <span className="text-slate-600 normal-case">· v1</span>}
      </div>
    </button>
  );
}

function LockedTier({ config, tier, prevTierName, count }: { config: (typeof STATS)[StatType]; tier: number; prevTierName: string; count: number }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5 opacity-50">
        <span className="w-4 h-4 rounded-full border border-white/15 bg-[#050510] flex items-center justify-center shrink-0">
          <Lock className="w-2 h-2 text-slate-500" />
        </span>
        <span className="font-mono text-[7px] text-slate-600 uppercase tracking-widest">
          {TIER_LABEL[tier]} · {TIER_NAME[tier]}
        </span>
      </div>
      <div className="bg-[#0c0c1b]/60 border border-dashed border-white/10 rounded-md p-2.5 text-center">
        <p className="font-mono text-[8px] text-slate-600 uppercase tracking-wider leading-relaxed">
          {count} node{count > 1 ? 's' : ''} locked
        </p>
        <p className="font-mono text-[8px] text-slate-600 leading-relaxed mt-0.5">
          Master a <span style={{ color: config.color }}>{prevTierName}</span> node to reveal
        </p>
      </div>
    </div>
  );
}

function BranchColumn({
  stat,
  onAddQuest,
  masteredTitles,
  activeTitles,
}: {
  stat: StatType;
  onAddQuest: (q: QuestDraft) => void;
  masteredTitles: Set<string>;
  activeTitles: Set<string>;
}) {
  const config = STATS[stat];
  const branchNodes = NODES.filter((n) => n.stat === stat);

  // Progressive reveal: a tier is "cleared" once at least one of its nodes is
  // mastered. Tier I is always available; the frontier is the first uncleared
  // tier. Tiers up to the frontier are shown; the very next one is teased as
  // locked; anything deeper stays hidden until you get there.
  let cleared = 0;
  for (const tier of TIERS) {
    const tierNodes = branchNodes.filter((n) => n.tier === tier);
    if (tierNodes.length === 0) continue;
    if (tierNodes.some((n) => masteredTitles.has(n.title))) cleared = tier;
    else break;
  }
  const frontier = cleared + 1;

  const statusOf = (n: NodeData): NodeStatus =>
    masteredTitles.has(n.title) ? 'mastered' : activeTitles.has(n.title) ? 'active' : 'available';

  // The first tier beyond the frontier that actually has nodes (the locked tease).
  const lockedTier = TIERS.find((t) => t > frontier && branchNodes.some((n) => n.tier === t));

  return (
    <div>
      {/* Branch header */}
      <div className="flex items-center gap-2 mb-1 pb-1.5 border-b" style={{ borderColor: `${config.color}40` }}>
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: config.color }} />
        <h4 className="font-serif text-sm font-bold uppercase tracking-widest" style={{ color: config.color }}>
          {config.name}
        </h4>
      </div>
      <p className="font-mono text-[8px] text-slate-600 uppercase tracking-wider mb-3">{config.covers}</p>

      {/* Revealed tiers */}
      <div className="space-y-3">
        {TIERS.filter((t) => t <= frontier).map((tier) => {
          const tierNodes = branchNodes.filter((n) => n.tier === tier);
          if (tierNodes.length === 0) return null;
          return (
            <div key={tier}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className="w-4 h-4 rounded-full border bg-[#050510] flex items-center justify-center font-mono text-[7px] font-bold shrink-0"
                  style={{ borderColor: config.color, color: config.color }}
                >
                  {TIER_LABEL[tier]}
                </span>
                <span className="font-mono text-[7px] text-slate-600 uppercase tracking-widest">{TIER_NAME[tier]}</span>
              </div>
              <div className="space-y-1.5">
                {tierNodes.map((node) => (
                  <NodeCard key={node.title} node={node} status={statusOf(node)} onAddQuest={onAddQuest} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Locked tease for the next tier */}
        {lockedTier && (
          <LockedTier
            config={config}
            tier={lockedTier}
            prevTierName={TIER_NAME[frontier]}
            count={branchNodes.filter((n) => n.tier === lockedTier).length}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// MINIMUM VIABLE DAY — the daily-rhythm loadout.
// Six binary daily pillars, each with an implementation intention and a
// never-zero minimum. Defeats the illusion of perfection: a 15-minute
// imperfect task is a successful iteration; a 0-minute perfect one is a
// failed sprint. Loaded as ordinary daily quests (not tree nodes).
// ---------------------------------------------------------
const MVD_QUESTS: QuestDraft[] = [
  {
    title: 'Worship on time',
    stat: 'spirit', difficulty: 'normal', type: 'daily', target: 1, tier: 1,
    description:
      "The Baseline — the day's anchor. Five prayers on time, morning & evening adhkar, and the sunan (2 rak'ah Fajr, Duha, Witr). Non-negotiable slots that hold the timeline together.",
    intention: { cue: 'at each salah time', location: 'home · lab · masjid', minVersion: 'the five fard prayers, on time' },
  },
  {
    title: 'Learn 15 minutes',
    stat: 'mind', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
    description:
      'The Delta — two micro-sprints on a hard timer: one deen (a Tafsir excerpt or short reflection) and one technical (an article, a doc update, an OpenCV or state-space tutorial). When the timer rings it is done, however far you got.',
    intention: { cue: 'after Dhuhr / on the commute', location: 'desk · phone', minVersion: 'one paragraph of each' },
  },
  {
    title: 'Move 15 minutes',
    stat: 'body', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
    description:
      'System Maintenance — counter the desk-and-lab day: a workout, a fast walk, or targeted mobility. Fifteen minutes with an elevated heart rate is a successful increment.',
    intention: { cue: 'before the evening wind-down', location: 'outside · gym · living room', minVersion: 'a brisk 15-minute walk' },
  },
  {
    title: 'One real conversation',
    stat: 'spirit', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
    description:
      'Stakeholder Engagement — intentional, offline, face-to-face: a non-work chat with family, or coffee with a colleague about anything but the lab. Voice notes and texts do not count.',
    intention: { cue: 'over a meal or a coffee break', location: 'off-screen, in person', minVersion: 'one 5-minute in-person talk' },
  },
  {
    title: 'Guilt-free recharge',
    stat: 'hobby', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
    description:
      'System Cooldown (الترويح) — scheduled decompression, not wasted time: a disconnected hobby, an episode, real rest. It keeps tomorrow’s velocity high.',
    intention: { cue: 'once the day’s minimums are done', location: 'couch · away from the work desk', minVersion: '15 minutes fully off-duty' },
  },
  {
    title: 'Stand-up + retrospective',
    stat: 'career', difficulty: 'easy', type: 'daily', target: 1, tier: 1,
    description:
      'The daily review — 2 minutes each. Morning: name the minimum to move every pillar to Done. Evening: did you add one new thing? If a pillar failed, name the blocker and shrink tomorrow’s scope. It is how no two days stay equal.',
    intention: { cue: 'first thing, and last thing', location: 'your board / notebook', minVersion: 'a 30-second morning glance + evening tally' },
  },
];

function MvdLoadout({ onLoadSeason }: { onLoadSeason: (drafts: QuestDraft[], label: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6 border border-[#d4af37]/20 rounded-lg bg-[#1a1a2e]/40">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-left cursor-pointer group min-w-0"
        >
          {open ? (
            <ChevronDown className="w-4 h-4 text-[#d4af37] shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#d4af37] shrink-0" />
          )}
          <Sunrise className="w-4 h-4 text-[#d4af37] shrink-0" />
          <span className="font-serif text-sm font-bold text-[#d4af37] uppercase tracking-wider">
            Minimum Viable Day
          </span>
          <span className="font-mono text-[8px] text-slate-500 uppercase tracking-wider truncate hidden lg:inline">
            6 daily pillars · never zero
          </span>
        </button>
        <button
          type="button"
          onClick={() => onLoadSeason(MVD_QUESTS, 'Minimum Viable Day')}
          className="shrink-0 w-full sm:w-auto bg-gradient-to-r from-[#aa7c11] to-[#d4af37] hover:from-[#d4af37] hover:to-[#f3e5ab] text-[#050510] font-mono text-[9px] font-bold uppercase tracking-wider py-2 sm:py-1.5 px-3 rounded cursor-pointer transition-all"
        >
          Load the day
        </button>
      </div>

      {open && (
        <div className="p-3 pt-0 space-y-2.5">
          <p className="font-mono text-[9px] text-slate-500 leading-relaxed">
            A 15-minute imperfect task is a successful iteration; a 0-minute perfect one is a failed sprint. These six
            load as daily quests — each carries a cue and a never-zero minimum you can log on a hard day.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MVD_QUESTS.map((q) => {
              const color = STATS[q.stat].color;
              return (
                <div
                  key={q.title}
                  className="bg-[#15152a] border border-white/5 rounded-lg p-2.5"
                  style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[11px] leading-tight" style={{ color }}>
                      {q.title}
                    </span>
                    <span className="font-mono text-[8px] text-slate-500 uppercase tracking-wide shrink-0">
                      {STATS[q.stat].name}
                    </span>
                  </div>
                  <p className="font-mono text-[9px] text-slate-500 mt-1 leading-snug break-words">
                    <span className="text-slate-400">Cue:</span> {q.intention?.cue}
                  </p>
                  <p className="font-mono text-[9px] text-emerald-400/80 mt-0.5 leading-snug break-words">
                    <span className="text-slate-400">Never-zero:</span> {q.intention?.minVersion}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// SEASON LOADOUT — the v2 24-month schedule (Part 7).
// Three active nodes per season; each references exact node titles.
// ---------------------------------------------------------
interface Season {
  n: number;
  months: string;
  theme: string;
  titles: string[];
  boss: string;
}

const SEASONS: Season[] = [
  { n: 1, months: '1–3', theme: 'Foundation', titles: ['Sleep 7–8h, fixed wake', 'Read 10 pages', 'Track every expense'], boss: '30-day streak on all three (Iron Will)' },
  { n: 2, months: '4–6', theme: 'Consistency', titles: ['Strength train', 'Stay under doomscroll limit', 'Set up automatic saving'], boss: 'First month you saved without thinking' },
  { n: 3, months: '7–9', theme: 'Capability', titles: ['Learn ONE skill, daily practice', 'Cook own meals, protein first', '5-minute journal'], boss: 'Build one small thing with the skill' },
  { n: 4, months: '10–12', theme: 'Capability', titles: ['Deep work 2h', 'Run 5K nonstop', 'Add one network contact'], boss: 'Run the 5K · annual review · 12 books' },
  { n: 5, months: '13–15', theme: 'Compounding', titles: ['Ship something with the skill', 'First payment from a stranger', 'Pick ONE creative outlet'], boss: 'First payment from a stranger' },
  { n: 6, months: '16–18', theme: 'Compounding', titles: ['6-month emergency fund', 'Hit a strength standard', 'Publish 6 technical articles'], boss: '6 months of expenses banked' },
  { n: 7, months: '19–21', theme: 'Leverage', titles: ['Invest monthly ×3', 'Pass a language / qualifying test', 'Finish one project'], boss: 'Certificate in hand' },
  { n: 8, months: '22–24', theme: 'Leverage', titles: ['Teach it — course/workshop/mentee', 'Run one full application cycle', 'Test yourself publicly'], boss: 'Second annual review — Capstones assessed' },
];

const NODE_BY_TITLE = new Map(NODES.map((n) => [n.title, n]));

function seasonDrafts(season: Season): QuestDraft[] {
  return season.titles
    .map((t) => NODE_BY_TITLE.get(t))
    .filter((n): n is NodeData => Boolean(n))
    .map(nodeToDraft);
}

function SeasonLoadout({ onLoadSeason }: { onLoadSeason: (drafts: QuestDraft[], label: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6 border border-[#d4af37]/20 rounded-lg bg-[#1a1a2e]/40">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-left cursor-pointer group min-w-0"
        >
          {open ? (
            <ChevronDown className="w-4 h-4 text-[#d4af37] shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#d4af37] shrink-0" />
          )}
          <span className="font-serif text-sm font-bold text-[#d4af37] uppercase tracking-wider">
            Season Loadout
          </span>
          <span className="font-mono text-[8px] text-slate-500 uppercase tracking-wider truncate hidden lg:inline">
            the 24-month schedule · 3 nodes each
          </span>
        </button>
        <button
          type="button"
          onClick={() => onLoadSeason(seasonDrafts(SEASONS[0]), 'Season 1')}
          className="shrink-0 w-full sm:w-auto bg-gradient-to-r from-[#aa7c11] to-[#d4af37] hover:from-[#d4af37] hover:to-[#f3e5ab] text-[#050510] font-mono text-[9px] font-bold uppercase tracking-wider py-2 sm:py-1.5 px-3 rounded cursor-pointer transition-all"
        >
          Start Season 1
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 pt-0">
          {SEASONS.map((s) => (
            <div key={s.n} className="bg-[#15152a] border border-white/5 rounded-lg p-3 flex flex-col">
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-serif text-xs font-bold text-[#d4af37] uppercase tracking-wider">
                  Season {s.n}
                </span>
                <span className="font-mono text-[8px] text-slate-500 uppercase">Mo {s.months}</span>
              </div>
              <ul className="space-y-1.5 flex-1">
                {s.titles.map((title) => {
                  const node = NODE_BY_TITLE.get(title);
                  const color = node ? STATS[node.stat].color : '#94a3b8';
                  return (
                    <li key={title} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-sans text-[10px] text-slate-300 leading-tight">{title}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-start gap-1.5 mt-2.5 pt-2 border-t border-white/5">
                <Swords className="w-3 h-3 text-slate-500 shrink-0 mt-px" />
                <span className="font-mono text-[8px] text-slate-500 uppercase tracking-wide leading-snug">{s.boss}</span>
              </div>
              <button
                type="button"
                onClick={() => onLoadSeason(seasonDrafts(s), `Season ${s.n}`)}
                className="mt-2.5 w-full border border-[#d4af37]/30 hover:border-[#d4af37]/60 hover:bg-[#d4af37]/10 text-[#d4af37] font-mono text-[9px] font-bold uppercase tracking-wider py-1.5 rounded cursor-pointer transition-all"
              >
                Load these 3
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// SPATIAL TREE (desktop) — the original radial look: full node cards laid
// out on a canvas with connecting lines threading through each branch and
// meeting at the FIX SLEEP core. Progressive reveal still applies.
// ---------------------------------------------------------
const SLEEP_TITLE = 'Sleep 7–8h, fixed wake';

type SpatialCard =
  | { kind: 'node'; node: NodeData; tier: number }
  | { kind: 'locked'; tier: number; count: number; prevName: string };

// Visible cards for a branch: revealed nodes (tier ≤ frontier) + a locked
// tease. `sleepAsCore` pulls the Sleep node out of Body (it becomes the core).
function branchCards(stat: StatType, masteredTitles: Set<string>, sleepAsCore: boolean): SpatialCard[] {
  const all = NODES.filter((n) => n.stat === stat);
  let cleared = 0;
  for (const t of TIERS) {
    const tn = all.filter((n) => n.tier === t);
    if (tn.length === 0) continue;
    if (tn.some((n) => masteredTitles.has(n.title))) cleared = t;
    else break;
  }
  const frontier = cleared + 1;
  let revealed = all.filter((n) => n.tier <= frontier).sort((a, b) => a.tier - b.tier);
  if (sleepAsCore) revealed = revealed.filter((n) => n.title !== SLEEP_TITLE);

  const cards: SpatialCard[] = revealed.map((n) => ({ kind: 'node', node: n, tier: n.tier }));
  const lockedTier = TIERS.find((t) => t > frontier && all.some((n) => n.tier === t));
  if (lockedTier) {
    cards.push({ kind: 'locked', tier: lockedTier, count: all.filter((n) => n.tier === lockedTier).length, prevName: TIER_NAME[frontier] });
  }
  return cards;
}

function SpatialCardView({
  item,
  stat,
  status,
  onAddQuest,
}: {
  item: SpatialCard;
  stat: StatType;
  status: 'mastered' | 'active' | 'available';
  onAddQuest: (q: QuestDraft) => void;
}) {
  const config = STATS[stat];

  if (item.kind === 'locked') {
    return (
      <div className="w-full h-full rounded-lg border border-dashed border-white/10 bg-[#0c0c1b]/60 flex flex-col items-center justify-center text-center px-3 relative opacity-70">
        <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-[#050510] border border-white/15 flex items-center justify-center">
          <Lock className="w-2 h-2 text-slate-500" />
        </span>
        <p className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">{item.count} locked</p>
        <p className="font-mono text-[8px] text-slate-600 uppercase tracking-wider mt-0.5 leading-snug">
          Master a <span style={{ color: config.color }}>{item.prevName}</span> node
        </p>
      </div>
    );
  }

  const { node } = item;
  const mastered = status === 'mastered';
  const active = status === 'active';
  const meta = `${node.type} · ${node.difficulty}${node.type === 'weekly' ? ` · ${node.target}×/wk` : ''}`;

  return (
    <button
      type="button"
      onClick={() => onAddQuest(nodeToDraft(node))}
      title={`${node.description}\n\nTap to add this quest.`}
      className="w-full h-full rounded-lg border bg-[#15152a] hover:bg-[#1a1a2e] flex flex-col items-center justify-center text-center px-3 relative transition-all cursor-pointer hover:scale-[1.03]"
      style={{ borderColor: config.color, boxShadow: `0 0 10px ${config.color}22` }}
    >
      <span
        className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-[#050510] border flex items-center justify-center font-mono text-[8px] font-bold"
        style={{ borderColor: config.color, color: config.color }}
      >
        {TIER_LABEL[node.tier]}
      </span>
      {mastered && <Check className="absolute top-1.5 right-1.5 w-3 h-3 text-[#d4af37]" />}
      <h4 className="font-bold text-sm leading-tight" style={{ color: config.color }}>
        {node.title}
      </h4>
      <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-1">
        {meta}
        {active && <span className="text-emerald-400/70"> · on board</span>}
      </p>
    </button>
  );
}

function SpatialTree({
  onAddQuest,
  masteredTitles,
  activeTitles,
}: {
  onAddQuest: (q: QuestDraft) => void;
  masteredTitles: Set<string>;
  activeTitles: Set<string>;
}) {
  const W = 820;
  const CARD_W = 200;
  const CARD_H = 76;
  const SLOT = CARD_H + 24;
  const CORE_R = 46;
  const CORE_GAP = 34;
  const PAD = 22;

  const CENTER_X: Record<StatType, number> = { body: 150, mind: 410, career: 670, spirit: 150, hobby: 670 };
  const TOP: StatType[] = ['body', 'mind', 'career'];
  const BOTTOM: StatType[] = ['spirit', 'hobby'];

  const cards: Record<StatType, SpatialCard[]> = {
    body: branchCards('body', masteredTitles, true),
    mind: branchCards('mind', masteredTitles, false),
    career: branchCards('career', masteredTitles, false),
    spirit: branchCards('spirit', masteredTitles, false),
    hobby: branchCards('hobby', masteredTitles, false),
  };

  const topCount = Math.max(...TOP.map((s) => cards[s].length));
  const bottomCount = Math.max(...BOTTOM.map((s) => cards[s].length), 1);

  const nearestTopTopY = PAD + (topCount - 1) * SLOT;
  const coreCenterY = nearestTopTopY + CARD_H + CORE_GAP + CORE_R;
  const nearestBottomTopY = coreCenterY + CORE_R + CORE_GAP;
  const canvasH = nearestBottomTopY + (bottomCount - 1) * SLOT + CARD_H + PAD;

  // idx 0 = Tier I, nearest the core. Top branches stack upward, bottom downward.
  const cardTop = (stat: StatType, idx: number) =>
    TOP.includes(stat) ? nearestTopTopY - idx * SLOT : nearestBottomTopY + idx * SLOT;
  const cardCenter = (stat: StatType, idx: number) => ({ x: CENTER_X[stat], y: cardTop(stat, idx) + CARD_H / 2 });

  const linePoints = (stat: StatType) => {
    const n = cards[stat].length;
    const pts: { x: number; y: number }[] = [];
    if (TOP.includes(stat)) {
      for (let k = n - 1; k >= 0; k--) pts.push(cardCenter(stat, k));
      pts.push({ x: 410, y: coreCenterY });
    } else {
      pts.push({ x: 410, y: coreCenterY });
      for (let k = 0; k < n; k++) pts.push(cardCenter(stat, k));
    }
    return pts.map((p) => `${p.x},${p.y}`).join(' ');
  };

  const statusOf = (title: string): 'mastered' | 'active' | 'available' =>
    masteredTitles.has(title) ? 'mastered' : activeTitles.has(title) ? 'active' : 'available';

  const sleepMastered = masteredTitles.has(SLEEP_TITLE);

  return (
    <div className="overflow-x-auto hide-scrollbar pb-2">
      <div className="relative mx-auto" style={{ width: W, height: canvasH }}>
        {/* Connecting lines */}
        <svg className="absolute inset-0" width={W} height={canvasH} style={{ pointerEvents: 'none' }}>
          {BRANCH_ORDER.map((s) => (
            <polyline key={s} points={linePoints(s)} fill="none" stroke={STATS[s].color} strokeOpacity="0.45" strokeWidth="2" />
          ))}
        </svg>

        {/* Node cards */}
        {BRANCH_ORDER.map((stat) =>
          cards[stat].map((item, idx) => (
            <div
              key={`${stat}-${idx}`}
              className="absolute"
              style={{ left: CENTER_X[stat] - CARD_W / 2, top: cardTop(stat, idx), width: CARD_W, height: CARD_H }}
            >
              <SpatialCardView
                item={item}
                stat={stat}
                status={item.kind === 'node' ? statusOf(item.node.title) : 'available'}
                onAddQuest={onAddQuest}
              />
            </div>
          )),
        )}

        {/* Core — the FIX SLEEP root */}
        <button
          type="button"
          onClick={() =>
            onAddQuest({
              title: SLEEP_TITLE,
              stat: 'body',
              difficulty: 'normal',
              type: 'daily',
              target: 1,
              tier: 1,
              description:
                'The root node — bad sleep quietly nerfs every stat. Fixed wake time daily (±30 min), no caffeine after 2 PM, morning daylight. Unlock: 30 days.',
            })
          }
          title="Sleep 7–8h — the root node. Tap to add this quest."
          className="absolute z-20 rounded-full border-2 border-[#d4af37] bg-[#15152a] flex flex-col items-center justify-center shadow-[0_0_22px_rgba(212,175,55,0.45)] cursor-pointer hover:scale-105 transition-transform"
          style={{ left: 410 - CORE_R, top: coreCenterY - CORE_R, width: CORE_R * 2, height: CORE_R * 2 }}
        >
          {sleepMastered && <Check className="absolute top-2 right-2 w-3 h-3 text-[#d4af37]" />}
          <span className="font-serif text-[11px] font-bold text-[#d4af37] uppercase tracking-wider leading-none">
            Fix Sleep
          </span>
          <span className="font-mono text-[7px] text-slate-500 uppercase tracking-widest mt-1">7–8h · root</span>
        </button>
      </div>
    </div>
  );
}

export default function TaskSkillTree({
  onAddQuest,
  onLoadSeason,
  masteredTitles,
  activeTitles,
}: {
  onAddQuest: (q: QuestDraft) => void;
  onLoadSeason: (drafts: QuestDraft[], label: string) => void;
  masteredTitles: Set<string>;
  activeTitles: Set<string>;
}) {
  return (
    <div>
      {/* Minimum Viable Day — the daily-rhythm loadout */}
      <MvdLoadout onLoadSeason={onLoadSeason} />

      {/* Season loadout — the 24-month schedule */}
      <SeasonLoadout onLoadSeason={onLoadSeason} />

      {/* Rules hint */}
      <p className="font-mono text-[9px] text-slate-500 leading-relaxed text-center px-2 mb-5">
        Tap a node to add it as a quest. Deeper tiers reveal as you{' '}
        <span className="text-[#d4af37]">master</span> the nodes before them — unlock after{' '}
        <span className="text-[#d4af37]">30 consistent days</span>, run{' '}
        <span className="text-[#d4af37]">no more than 3 at once</span>, never zero.
        <br />
        <span className="text-slate-600">
          Grind order: Sleep → Read + Track money → Strength + Skill → Deep work + 5K → Ship + Earn → Bank + Publish →
          Certify + Invest → Teach + Apply.
        </span>
      </p>

      {/* DESKTOP: spatial radial tree — cards on a canvas linked to the core */}
      <div className="hidden lg:block">
        <SpatialTree onAddQuest={onAddQuest} masteredTitles={masteredTitles} activeTitles={activeTitles} />
      </div>

      {/* MOBILE / TABLET: stacked branch list (the canvas doesn't fit narrow screens) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 lg:hidden">
        {BRANCH_ORDER.map((stat) => (
          <BranchColumn
            key={stat}
            stat={stat}
            onAddQuest={onAddQuest}
            masteredTitles={masteredTitles}
            activeTitles={activeTitles}
          />
        ))}
      </div>
    </div>
  );
}
