import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronRight, Swords, Lock, Check } from 'lucide-react';
import { StatType, STATS, QuestDifficulty, QuestType, QuestDraft } from '../types';

const TIER_LABEL: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: '★' };
const TIER_NAME: Record<number, string> = {
  1: 'Foundation',
  2: 'Consistency',
  3: 'Capability',
  4: 'Compounding',
  5: 'Leverage',
  6: 'Capstone',
};

interface NodeData {
  title: string;
  stat: StatType;
  tier: number;
  type: QuestType;
  difficulty: QuestDifficulty;
  target: number;
  description: string;
  /** True for nodes carried over from the original v1 tree. */
  v1?: boolean;
}

// The full Life Skill Tree v2 — 24-month campaign. Tiers I–III are the v1
// foundation; IV–V and the ★ Capstones carry through month 24.
const NODES: NodeData[] = [
  // ============================ BODY ============================
  { stat: 'body', tier: 1, title: 'Sleep 7–8h, fixed wake', type: 'daily', difficulty: 'normal', target: 1, v1: true, description: 'Fixed wake time first — it anchors everything. Daylight in your eyes within 30 min of waking, no caffeine after 2 PM. Unlock: 30 days within ±30 min.' },
  { stat: 'body', tier: 1, title: 'Walk 8–10k steps', type: 'daily', difficulty: 'easy', target: 1, v1: true, description: 'Baseline your steps for 3 days, then add 2,000. Stack it onto calls, stairs, parking far. Unlock: 30 days at target.' },
  { stat: 'body', tier: 1, title: 'Drink 2–3L water', type: 'daily', difficulty: 'easy', target: 1, v1: true, description: 'One glass on waking, one before each meal. Unlock: 30 days.' },
  { stat: 'body', tier: 2, title: 'Strength train', type: 'weekly', difficulty: 'normal', target: 3, v1: true, description: 'Full-body, 3 non-consecutive days. Compounds only: squat, hinge, push, pull, carry. 3×5–8, add weight/rep at the top of the range. 45 min. Unlock: 12 sessions.' },
  { stat: 'body', tier: 2, title: 'Cook own meals, protein first', type: 'daily', difficulty: 'normal', target: 1, v1: true, description: '~1.6–2 g/kg protein, built around a protein source. Learn 5 autopilot meals. Unlock: 30 days majority self-cooked.' },
  { stat: 'body', tier: 2, title: 'Mobility / stretch 10 min', type: 'daily', difficulty: 'easy', target: 1, description: 'Ten minutes of mobility work. Unlock: 30 days.' },
  { stat: 'body', tier: 3, title: 'Run 5K nonstop', type: 'milestone', difficulty: 'hard', target: 1, v1: true, description: 'Couch-to-5K: walk/run intervals, shift toward running weekly over ~8 weeks. Unlock: 5K without stopping.' },
  { stat: 'body', tier: 3, title: 'Visible body recomposition', type: 'milestone', difficulty: 'hard', target: 1, v1: true, description: 'The output of Tiers I–II held for months. Unlock: visible change + strength numbers up.' },
  { stat: 'body', tier: 3, title: 'Deload every 8th week', type: 'weekly', difficulty: 'easy', target: 1, description: 'Back off on purpose — the failure mode here is injury, not laziness. Unlock: 2 deloads taken deliberately.' },
  { stat: 'body', tier: 4, title: 'Hit a strength standard', type: 'milestone', difficulty: 'hard', target: 1, description: 'Barbell: bodyweight bench · 1.5× squat · 2× deadlift. Bodyweight: 10 pull-ups · 25 push-ups · 60s hollow. Train for a number.' },
  { stat: 'body', tier: 4, title: 'Run 10K or a real race', type: 'milestone', difficulty: 'hard', target: 1, description: 'Enter and finish a real race. Unlock: race finished.' },
  { stat: 'body', tier: 4, title: 'Full health check', type: 'milestone', difficulty: 'normal', target: 1, description: 'Bloodwork + dental + eyes. The easiest node to skip — book it in month 13, not 18.' },
  { stat: 'body', tier: 4, title: '90-day sleep consistency', type: 'milestone', difficulty: 'hard', target: 1, description: '±30 min wake time for 90 straight days.' },
  { stat: 'body', tier: 5, title: 'Adopt a physical discipline', type: 'weekly', difficulty: 'normal', target: 2, description: 'Martial art, climbing, swimming, calisthenics — skill + community, not just reps. Unlock: 3 months consistent.' },
  { stat: 'body', tier: 5, title: 'Test yourself publicly', type: 'milestone', difficulty: 'hard', target: 1, description: 'A race, belt, grade, or comp. It converts training from a chore into a thing you’re in.' },
  { stat: 'body', tier: 6, title: 'Strong, mobile, energetic', type: 'milestone', difficulty: 'hard', target: 1, v1: true, description: 'Capstone. Two years injury-free; training is a fixed part of your week and stairs don’t register.' },

  // ============================ MIND ============================
  { stat: 'mind', tier: 1, title: 'Read 10 pages', type: 'daily', difficulty: 'easy', target: 1, v1: true, description: '~15 min ≈ 12–15 books/year. Anchor it after an existing habit. Start the ladder with Atomic Habits. Unlock: 30 days.' },
  { stat: 'mind', tier: 1, title: 'Stay under doomscroll limit', type: 'daily', difficulty: 'normal', target: 1, v1: true, description: '30–45 min app timer, apps off the home screen, grayscale on. Replace, don’t just remove. Unlock: 30 days under cap.' },
  { stat: 'mind', tier: 2, title: 'Learn ONE skill, daily practice', type: 'daily', difficulty: 'normal', target: 1, v1: true, description: 'One skill — make it your career skill (Sharpened Blade). Real course + 45–60 min daily practice, build weekly. Unlock: 30 days + one thing built.' },
  { stat: 'mind', tier: 2, title: 'Write notes in your own words', type: 'weekly', difficulty: 'easy', target: 3, v1: true, description: 'Writing is how you find out whether you understood it. Unlock: a set you actually revisit.' },
  { stat: 'mind', tier: 2, title: 'Spaced-repetition review', type: 'daily', difficulty: 'easy', target: 1, description: 'Review your cards daily. Unlock: 30 days.' },
  { stat: 'mind', tier: 3, title: 'Deep work 2h', type: 'daily', difficulty: 'hard', target: 1, v1: true, description: 'One hard task, no phone/tabs, single focus. Build 25-min → 90-min blocks. Same time, same place. Unlock: 30 days of tracked focus.' },
  { stat: 'mind', tier: 3, title: 'Ship something with the skill', type: 'milestone', difficulty: 'hard', target: 1, description: 'Build a real thing with your one skill. Unlock: it exists and works.' },
  { stat: 'mind', tier: 3, title: 'Finish 12 books (year 1)', type: 'milestone', difficulty: 'hard', target: 1, description: 'The reading ladder, one rung at a time. Unlock: 12 done.' },
  { stat: 'mind', tier: 4, title: 'Rebuild a hard fundamental', type: 'milestone', difficulty: 'hard', target: 1, description: 'A bounded playlist, a 1-hour daily cap, weekly scripts as proof of work. Unlock: course finished + code/notes to prove it.' },
  { stat: 'mind', tier: 4, title: 'Publish 6 technical articles', type: 'milestone', difficulty: 'hard', target: 1, description: 'Paced over 6 months, each grounded in something you built or measured. A public body of writing IS the portfolio. Unlock: 6 shipped.' },
  { stat: 'mind', tier: 4, title: 'Second language to A2/B1', type: 'milestone', difficulty: 'hard', target: 1, description: 'Ties to the Optionality path. Start in month 13. Unlock: level reached or tested.' },
  { stat: 'mind', tier: 5, title: 'Teach it — course/workshop/mentee', type: 'milestone', difficulty: 'hard', target: 1, description: 'A workshop you run twice teaches you more than the 20 hours you spent learning it. Unlock: delivered to real people.' },
  { stat: 'mind', tier: 5, title: 'Give a talk publicly', type: 'milestone', difficulty: 'hard', target: 1, description: 'Present to a room. Unlock: delivered.' },
  { stat: 'mind', tier: 5, title: '24 books (year 2 total)', type: 'milestone', difficulty: 'hard', target: 1, description: 'Keep the ladder going. Unlock: 24 done.' },
  { stat: 'mind', tier: 6, title: 'Teach or publish what you know', type: 'milestone', difficulty: 'hard', target: 1, v1: true, description: 'Capstone. The final proof of understanding — if you can’t explain it to a beginner, you don’t have it yet.' },

  // ============================ CAREER ============================
  { stat: 'career', tier: 1, title: 'Track every expense', type: 'daily', difficulty: 'easy', target: 1, v1: true, description: 'Log everything for 30 days, zero judgment. Categorise at month end; the leaks get obvious. Unlock: 30 days, nothing untracked.' },
  { stat: 'career', tier: 1, title: 'Set up automatic saving', type: 'milestone', difficulty: 'normal', target: 1, v1: true, description: 'Automate the save on payday — willpower must not be involved. Start at a % that doesn’t hurt. Unlock: the transfer fires without you.' },
  { stat: 'career', tier: 2, title: 'Document one win per week', type: 'weekly', difficulty: 'easy', target: 1, v1: true, description: 'Quantify: numbers, before/after, impact. The most valuable file you own at review time. Unlock: 12 wins logged.' },
  { stat: 'career', tier: 2, title: 'Add one network contact', type: 'weekly', difficulty: 'normal', target: 1, v1: true, description: 'One meaningful professional touch a week — give before you ask. Unlock: 4+ contacts in 30 days.' },
  { stat: 'career', tier: 3, title: 'First payment from a stranger', type: 'milestone', difficulty: 'hard', target: 1, v1: true, description: 'Smallest version of a skill you have that earns one unit of currency from someone not obligated to pay. Validate, then scale. Unlock: money received.' },
  { stat: 'career', tier: 3, title: 'Invest monthly ×3', type: 'milestone', difficulty: 'hard', target: 1, v1: true, description: 'Boring, broad, consistent beats clever. Build the buffer first. Unlock: 3 consecutive months.' },
  { stat: 'career', tier: 3, title: 'Raise, promotion, or better offer', type: 'milestone', difficulty: 'hard', target: 1, description: 'Make the concrete case, or a stronger position elsewhere. Unlock: signed.' },
  { stat: 'career', tier: 4, title: '6-month emergency fund', type: 'milestone', difficulty: 'hard', target: 1, description: 'The node that converts money into freedom — it’s what lets you say no, leave, or move. Unlock: 6 months of expenses banked.' },
  { stat: 'career', tier: 4, title: 'Second income stream stabilised', type: 'milestone', difficulty: 'hard', target: 1, description: 'Unlock: 6 months of consistent income.' },
  { stat: 'career', tier: 4, title: 'Rebuild portfolio / CV / profile', type: 'milestone', difficulty: 'normal', target: 1, description: 'Show the work, don’t describe it — the Mind Tier IV articles slot straight in. Unlock: current and strong.' },
  { stat: 'career', tier: 5, title: 'Pass a language / qualifying test', type: 'milestone', difficulty: 'hard', target: 1, description: 'Booking the date is the node — studying without one rarely converges. Unlock: certificate in hand.' },
  { stat: 'career', tier: 5, title: 'Run one full application cycle', type: 'milestone', difficulty: 'hard', target: 1, description: 'Submitted, not "researched." A mediocre application beats a perfect one you never send. Unlock: fully submitted.' },
  { stat: 'career', tier: 5, title: 'Hold savings across currencies', type: 'milestone', difficulty: 'normal', target: 1, description: 'A 6-month fund in a depreciating currency isn’t 6 months. Unlock: diversified.' },
  { stat: 'career', tier: 6, title: 'Multiple streams + 6-month runway', type: 'milestone', difficulty: 'hard', target: 1, v1: true, description: 'Capstone. More than one source of money, six months banked, and the documents to move if you choose. That’s freedom.' },

  // ============================ SPIRIT ============================
  { stat: 'spirit', tier: 1, title: '5-minute journal', type: 'daily', difficulty: 'easy', target: 1, v1: true, description: 'Three lines: what happened, how you feel, what matters today. Unlock: 30 days.' },
  { stat: 'spirit', tier: 2, title: '3 gratitudes', type: 'daily', difficulty: 'easy', target: 1, v1: true, description: 'Specific only — "the coffee this morning, the call with my brother, finishing that report." Specificity rewires attention. Unlock: 30 days.' },
  { stat: 'spirit', tier: 2, title: 'Time in nature', type: 'weekly', difficulty: 'easy', target: 1, v1: true, description: 'One deliberate block outdoors, no agenda, no phone. Unlock: 4 weeks.' },
  { stat: 'spirit', tier: 3, title: 'Weekly call to family/friends', type: 'weekly', difficulty: 'normal', target: 1, v1: true, description: 'If people you love are in another country, the weekly call IS the relationship. Unlock: 30 days.' },
  { stat: 'spirit', tier: 3, title: 'Volunteer monthly', type: 'milestone', difficulty: 'normal', target: 1, v1: true, description: 'Give time, not just money, to something outside yourself. Unlock: 2 consecutive months.' },
  { stat: 'spirit', tier: 4, title: 'Meditation or prayer, 10 min', type: 'daily', difficulty: 'normal', target: 1, description: 'Ten minutes of stillness. Unlock: 30 days.' },
  { stat: 'spirit', tier: 4, title: 'Digital sabbath — screen-free day', type: 'weekly', difficulty: 'normal', target: 1, description: 'One screen-free day a week. Unlock: 8 weeks.' },
  { stat: 'spirit', tier: 4, title: 'Write your annual review', type: 'milestone', difficulty: 'normal', target: 1, description: 'What worked, what didn’t, what you’re becoming. Do it at month 12 and 24. Unlock: written.' },
  { stat: 'spirit', tier: 5, title: 'Sustained service commitment', type: 'milestone', difficulty: 'hard', target: 1, description: 'Unlock: 6+ months, same place.' },
  { stat: 'spirit', tier: 5, title: 'Write your personal code', type: 'milestone', difficulty: 'normal', target: 1, description: 'Your values, written down. Unlock: done.' },
  { stat: 'spirit', tier: 5, title: 'Repair one relationship', type: 'milestone', difficulty: 'hard', target: 1, description: 'Unlock: done, honestly.' },
  { stat: 'spirit', tier: 6, title: 'Calm under pressure, clear purpose', type: 'milestone', difficulty: 'hard', target: 1, v1: true, description: 'Capstone. Setbacks don’t spiral you, and you can state plainly what you’re building toward.' },

  // ============================ HOBBY ============================
  { stat: 'hobby', tier: 1, title: 'Pick ONE creative outlet', type: 'milestone', difficulty: 'easy', target: 1, v1: true, description: 'Music, drawing, writing, photography, building — chosen because it pulls you, not because it’s useful. Unlock: committed 30 days.' },
  { stat: 'hobby', tier: 2, title: 'Practice weekly', type: 'weekly', difficulty: 'normal', target: 1, v1: true, description: 'A fixed, protected weekly slot. Unlock: 4 weeks.' },
  { stat: 'hobby', tier: 2, title: 'Join a community', type: 'milestone', difficulty: 'easy', target: 1, v1: true, description: 'People who do the same thing — accountability and fun. Unlock: actively in one.' },
  { stat: 'hobby', tier: 3, title: 'Finish one project', type: 'milestone', difficulty: 'hard', target: 1, v1: true, description: 'Actually complete a defined thing — done, not "in progress." Unlock: done.' },
  { stat: 'hobby', tier: 3, title: 'Share it publicly', type: 'milestone', difficulty: 'normal', target: 1, v1: true, description: 'Post it, show it, ship it. Unlock: it’s out in the world.' },
  { stat: 'hobby', tier: 4, title: 'A second, larger project', type: 'milestone', difficulty: 'hard', target: 1, description: 'Unlock: finished.' },
  { stat: 'hobby', tier: 4, title: 'Collaborate with someone', type: 'milestone', difficulty: 'normal', target: 1, description: 'Unlock: shipped together.' },
  { stat: 'hobby', tier: 5, title: 'A body of work — 10 pieces', type: 'milestone', difficulty: 'hard', target: 1, description: 'Ten finished pieces. Unlock: 10 done.' },
  { stat: 'hobby', tier: 5, title: 'Teach a beginner', type: 'milestone', difficulty: 'normal', target: 1, description: 'Unlock: someone learned from you.' },
  { stat: 'hobby', tier: 6, title: 'A craft that recharges you', type: 'milestone', difficulty: 'hard', target: 1, v1: true, description: 'Capstone. Something you do purely because you love it — it gives energy back instead of taking it. Keep it revenue-free.' },
];

const BRANCH_ORDER: StatType[] = ['body', 'mind', 'career', 'spirit', 'hobby'];
const TIERS = [1, 2, 3, 4, 5, 6];

function nodeToDraft(n: NodeData): QuestDraft {
  return {
    title: n.title,
    stat: n.stat,
    difficulty: n.difficulty,
    type: n.type,
    target: n.target,
    tier: n.tier,
    description: n.description,
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
      <div className="flex items-center justify-between gap-2 p-3">
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
          <span className="font-serif text-sm font-bold text-[#d4af37] uppercase tracking-widest shrink-0">
            Season Loadout
          </span>
          <span className="font-mono text-[8px] text-slate-500 uppercase tracking-wider truncate hidden sm:inline">
            the 24-month schedule · 3 nodes each
          </span>
        </button>
        <button
          type="button"
          onClick={() => onLoadSeason(seasonDrafts(SEASONS[0]), 'Season 1')}
          className="shrink-0 bg-gradient-to-r from-[#aa7c11] to-[#d4af37] hover:from-[#d4af37] hover:to-[#f3e5ab] text-[#050510] font-mono text-[9px] font-bold uppercase tracking-wider py-1.5 px-3 rounded cursor-pointer transition-all"
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

const BRANCH_ANGLE: Record<StatType, number> = {
  body: 215, // up-left
  mind: 270, // up
  career: 325, // up-right
  spirit: 145, // down-left
  hobby: 35, // down-right
};

// The central hub the branches radiate from, with colored spokes pointing
// toward each branch — restores the original tree's radial feel.
function CoreHub() {
  return (
    <div className="relative flex items-center justify-center min-h-[180px]">
      <svg className="absolute w-56 h-56 pointer-events-none" viewBox="-100 -100 200 200">
        {BRANCH_ORDER.map((s) => {
          const a = (BRANCH_ANGLE[s] * Math.PI) / 180;
          return (
            <line
              key={s}
              x1={Math.cos(a) * 36}
              y1={Math.sin(a) * 36}
              x2={Math.cos(a) * 96}
              y2={Math.sin(a) * 96}
              stroke={STATS[s].color}
              strokeOpacity="0.4"
              strokeWidth="2"
            />
          );
        })}
      </svg>
      <div className="relative w-24 h-24 rounded-full border-2 border-[#d4af37] bg-[#15152a] flex flex-col items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.4)]">
        <div className="w-5 h-5 bg-gradient-to-r from-[#d4af37] to-[#aa7c11] rounded-sm rotate-45 border border-[#d4af37]/30 shadow-md glow-active" />
        <span className="font-serif text-[9px] text-[#d4af37] uppercase tracking-widest mt-2">Core</span>
        <span className="font-mono text-[7px] text-slate-500 uppercase tracking-wider mt-0.5">start here</span>
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
      {/* Season loadout — the actual schedule */}
      <SeasonLoadout onLoadSeason={onLoadSeason} />

      {/* Rules hint */}
      <p className="font-mono text-[9px] text-slate-500 leading-relaxed text-center px-2 mb-5">
        Tap a node to add it as a quest. Deeper tiers reveal as you{' '}
        <span className="text-[#d4af37]">master</span> the nodes before them — unlock after{' '}
        <span className="text-[#d4af37]">30 consistent days</span>, run{' '}
        <span className="text-[#d4af37]">no more than 3 at once</span>, never zero.
        <br className="hidden sm:block" />
        <span className="text-slate-600">
          Grind order: Sleep → Read + Track money → Strength + Skill → Deep work + 5K → Ship + Earn → Bank + Publish →
          Certify + Invest → Teach + Apply.
        </span>
      </p>

      {/* DESKTOP: radial layout — branches arranged around a central core hub */}
      <div className="hidden lg:grid grid-cols-3 gap-x-5 gap-y-8 items-start">
        <div className="col-start-1 row-start-1">
          <BranchColumn stat="body" onAddQuest={onAddQuest} masteredTitles={masteredTitles} activeTitles={activeTitles} />
        </div>
        <div className="col-start-2 row-start-1">
          <BranchColumn stat="mind" onAddQuest={onAddQuest} masteredTitles={masteredTitles} activeTitles={activeTitles} />
        </div>
        <div className="col-start-3 row-start-1">
          <BranchColumn stat="career" onAddQuest={onAddQuest} masteredTitles={masteredTitles} activeTitles={activeTitles} />
        </div>
        <div className="col-start-2 row-start-2 self-center">
          <CoreHub />
        </div>
        <div className="col-start-1 row-start-3">
          <BranchColumn stat="spirit" onAddQuest={onAddQuest} masteredTitles={masteredTitles} activeTitles={activeTitles} />
        </div>
        <div className="col-start-3 row-start-3">
          <BranchColumn stat="hobby" onAddQuest={onAddQuest} masteredTitles={masteredTitles} activeTitles={activeTitles} />
        </div>
      </div>

      {/* MOBILE / TABLET: stacked branch list (radial doesn't fit narrow screens) */}
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
