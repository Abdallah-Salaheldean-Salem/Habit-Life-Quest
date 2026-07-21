import React from 'react';
import { motion } from 'motion/react';
import { StatType, STATS, QuestDifficulty, QuestType, QuestDraft } from '../types';

const TIER_LABEL: Record<number, string> = { 0: '◆', 1: 'I', 2: 'II', 3: 'III' };

interface NodeData {
  title: string;
  subtitle: string;
  stat: StatType;
  difficulty: QuestDifficulty;
  type: QuestType;
  target: number;
  tier: number;
  /** Playbook guidance + unlock criteria, shown on hover and stored on the quest. */
  description: string;
  delay?: number;
  cx: number;
  cy: number;
}

interface NodeProps extends NodeData {
  onAddQuest: (q: QuestDraft) => void;
}

function SkillNode({
  title,
  subtitle,
  stat,
  difficulty,
  type,
  target,
  tier,
  description,
  delay = 0,
  cx,
  cy,
  onAddQuest,
}: NodeProps) {
  const config = STATS[stat];

  return (
    <div className="absolute z-10" style={{ left: cx, top: cy, transform: 'translate(-50%, -50%)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay, duration: 0.5, type: 'spring' }}
        onClick={() => onAddQuest({ title, stat, difficulty, type, target, tier, description })}
        title={`${description}\n\nClick to add this quest.`}
        className="w-48 sm:w-52 p-3 rounded-lg border text-center cursor-pointer transition-all hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] bg-[#15152a] flex flex-col justify-center items-center h-[72px] relative"
        style={{
          borderColor: config.color,
          boxShadow: `0 0 10px ${config.color}20`,
        }}
      >
        {/* Tier badge */}
        <span
          className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-[#050510] border flex items-center justify-center font-mono text-[8px] font-bold"
          style={{ borderColor: config.color, color: config.color }}
        >
          {TIER_LABEL[tier] ?? tier}
        </span>
        <h4 className="font-bold text-sm tracking-tight leading-tight mb-1" style={{ color: config.color }}>
          {title}
        </h4>
        <p className="text-[9px] text-slate-400 uppercase tracking-wider">{subtitle}</p>
      </motion.div>
    </div>
  );
}

export default function TaskSkillTree({ onAddQuest }: { onAddQuest: (q: QuestDraft) => void }) {
  // Rows near the CORE are Tier I (foundational); rows toward the edges are
  // Tier III (advanced). Content follows the Life Skill Tree playbook.
  const nodes: NodeData[] = [
    // --- MIND (center column, x=400) ---
    {
      title: 'Deep work 2h',
      subtitle: 'single-focus, no phone',
      stat: 'mind',
      type: 'daily',
      difficulty: 'hard',
      target: 1,
      tier: 3,
      description:
        'One hard task — no phone, no tabs, no notifications. Build from 25-min blocks up to 90. Same time, same place daily. Unlock: 30 days at 2h of tracked focus.',
      delay: 0.6,
      cx: 400,
      cy: 50,
    },
    {
      title: 'Learn one skill',
      subtitle: 'one course · daily practice',
      stat: 'mind',
      type: 'daily',
      difficulty: 'normal',
      target: 1,
      tier: 2,
      description:
        'Pick ONE high-value skill. A real course + 45–60 min daily deliberate practice. Build something small each week. Unlock: 30 days of practice + one thing you built.',
      delay: 0.4,
      cx: 400,
      cy: 150,
    },
    {
      title: 'Read 10 pages',
      subtitle: 'the reading ladder',
      stat: 'mind',
      type: 'daily',
      difficulty: 'easy',
      target: 1,
      tier: 1,
      description:
        'Start the Reading Ladder (Atomic Habits first). ~15 min a day. Never zero — one page on a bad day. The streak matters more than the count. Unlock: 30 days.',
      delay: 0.2,
      cx: 400,
      cy: 250,
    },

    // --- BODY (left column, x=160) ---
    {
      title: 'Run 5K nonstop',
      subtitle: 'couch-to-5k',
      stat: 'body',
      type: 'milestone',
      difficulty: 'hard',
      target: 1,
      tier: 3,
      description:
        'Alternate walk/run intervals, shift the ratio toward running each week over ~8 weeks. Unlock: run 5K without stopping.',
      delay: 0.6,
      cx: 160,
      cy: 50,
    },
    {
      title: 'Strength train',
      subtitle: '3× a week · compounds',
      stat: 'body',
      type: 'weekly',
      difficulty: 'normal',
      target: 3,
      tier: 2,
      description:
        'Full-body, 3 non-consecutive days. Compound lifts only: squat, hinge, push, pull, carry. 3 sets of 5–8 reps; add a rep or a little weight when you hit the top. 45 min max. Unlock: ~12 sessions.',
      delay: 0.4,
      cx: 160,
      cy: 150,
    },
    {
      title: 'Walk 8–10k steps',
      subtitle: 'baseline + 2,000',
      stat: 'body',
      type: 'daily',
      difficulty: 'easy',
      target: 1,
      tier: 1,
      description:
        'Check your 3-day baseline, then add 2,000. Stack it onto calls, stairs, parking far, and one deliberate 20–30 min walk. Unlock: 30 days averaging your target.',
      delay: 0.2,
      cx: 160,
      cy: 250,
    },

    // --- CAREER (right column, x=640) ---
    {
      title: 'Launch side income',
      subtitle: 'earn one real payment',
      stat: 'career',
      type: 'milestone',
      difficulty: 'hard',
      target: 1,
      tier: 3,
      description:
        'Start with a skill you already have. Build the smallest version that earns one real payment from someone who isn’t obligated to pay you. Validate, then grow.',
      delay: 0.6,
      cx: 640,
      cy: 50,
    },
    {
      title: '+1 network contact',
      subtitle: 'one touch a week',
      stat: 'career',
      type: 'weekly',
      difficulty: 'normal',
      target: 1,
      tier: 2,
      description:
        'One meaningful professional touch per week — a message, a coffee, a reconnect. Give before you ask. Unlock: 4+ new/renewed contacts in 30 days.',
      delay: 0.4,
      cx: 640,
      cy: 150,
    },
    {
      title: 'Track every expense',
      subtitle: '30 days · no judgment',
      stat: 'career',
      type: 'daily',
      difficulty: 'easy',
      target: 1,
      tier: 1,
      description:
        'Log everything for 30 days — app, spreadsheet, or notes. No judgment, just data. At month end, categorize and the leaks are obvious. Unlock: 30 days, nothing untracked.',
      delay: 0.2,
      cx: 640,
      cy: 250,
    },

    // --- SOUL / SPIRIT (lower-left, x=160) ---
    {
      title: '5-min journal',
      subtitle: 'three lines, daily',
      stat: 'spirit',
      type: 'daily',
      difficulty: 'easy',
      target: 1,
      tier: 1,
      description:
        'Morning or night. Three lines is enough: what happened, how you feel, what matters today. Unlock: 30 days.',
      delay: 0.2,
      cx: 160,
      cy: 450,
    },
    {
      title: '3 gratitudes',
      subtitle: 'specific, not generic',
      stat: 'spirit',
      type: 'daily',
      difficulty: 'easy',
      target: 1,
      tier: 2,
      description:
        'Three specific things — "the coffee this morning, that call with my brother, finishing the report." Rewires attention toward what’s working. Unlock: 30 days.',
      delay: 0.4,
      cx: 160,
      cy: 550,
    },
    {
      title: 'Weekly call home',
      subtitle: 'one real conversation',
      stat: 'spirit',
      type: 'weekly',
      difficulty: 'normal',
      target: 1,
      tier: 3,
      description:
        'One real conversation a week with someone you love. Unlock: 30 days running.',
      delay: 0.6,
      cx: 160,
      cy: 650,
    },

    // --- HOBBIES (lower-right, x=640) ---
    {
      title: 'Pick a craft',
      subtitle: 'one thing that pulls you',
      stat: 'hobby',
      type: 'milestone',
      difficulty: 'easy',
      target: 1,
      tier: 1,
      description:
        'Music, drawing, writing, photography, building — chosen because it pulls you, not because it’s useful. Commit to one for 30 days.',
      delay: 0.2,
      cx: 640,
      cy: 450,
    },
    {
      title: 'Weekly practice',
      subtitle: 'a protected slot',
      stat: 'hobby',
      type: 'weekly',
      difficulty: 'normal',
      target: 1,
      tier: 2,
      description:
        'A fixed, protected weekly slot for your craft. Bonus: join a community that does the same thing for accountability and fun. Unlock: 4 weeks running.',
      delay: 0.4,
      cx: 640,
      cy: 550,
    },
    {
      title: 'Finish a project',
      subtitle: 'complete it · ship it',
      stat: 'hobby',
      type: 'milestone',
      difficulty: 'hard',
      target: 1,
      tier: 3,
      description:
        'Not "keep practicing" — actually complete a defined thing: a song, a short story, a built object, a small game. Then share it publicly. Unlock: it’s done and out in the world.',
      delay: 0.6,
      cx: 640,
      cy: 650,
    },
  ];

  return (
    <div className="overflow-x-auto pb-6 hide-scrollbar -mx-6 px-6 sm:-mx-6 sm:px-6">
      <div className="w-[800px] h-[700px] relative mx-auto shrink-0">
        {/* SVG Connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 800 700">
          <g strokeWidth="2" fill="none" className="opacity-40">
            {/* Core to Mind */}
            <line x1="400" y1="350" x2="400" y2="250" stroke={STATS.mind.color} />
            <line x1="400" y1="250" x2="400" y2="150" stroke={STATS.mind.color} />
            <line x1="400" y1="150" x2="400" y2="50" stroke={STATS.mind.color} />

            {/* Core to Body */}
            <line x1="400" y1="350" x2="160" y2="250" stroke={STATS.body.color} />
            <line x1="160" y1="250" x2="160" y2="150" stroke={STATS.body.color} />
            <line x1="160" y1="150" x2="160" y2="50" stroke={STATS.body.color} />

            {/* Core to Career */}
            <line x1="400" y1="350" x2="640" y2="250" stroke={STATS.career.color} />
            <line x1="640" y1="250" x2="640" y2="150" stroke={STATS.career.color} />
            <line x1="640" y1="150" x2="640" y2="50" stroke={STATS.career.color} />

            {/* Core to Spirit/Soul */}
            <line x1="400" y1="350" x2="160" y2="450" stroke={STATS.spirit.color} />
            <line x1="160" y1="450" x2="160" y2="550" stroke={STATS.spirit.color} />
            <line x1="160" y1="550" x2="160" y2="650" stroke={STATS.spirit.color} />

            {/* Core to Hobbies */}
            <line x1="400" y1="350" x2="640" y2="450" stroke={STATS.hobby.color} />
            <line x1="640" y1="450" x2="640" y2="550" stroke={STATS.hobby.color} />
            <line x1="640" y1="550" x2="640" y2="650" stroke={STATS.hobby.color} />
          </g>
        </svg>

        {/* Render Nodes */}
        {nodes.map((node, i) => (
          <SkillNode key={i} {...node} onAddQuest={onAddQuest} />
        ))}

        {/* CORE NODE — the root habit: Fix Sleep */}
        <div className="absolute z-20" style={{ left: 400, top: 350, transform: 'translate(-50%, -50%)' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            onClick={() =>
              onAddQuest({
                title: 'Fix sleep (7–8h)',
                stat: 'body',
                difficulty: 'normal',
                type: 'daily',
                target: 1,
                tier: 0,
                description:
                  'The root node — bad sleep quietly nerfs every stat. Fixed wake time daily (±30 min, weekends too), bed alarm 8h before, no screens 30 min prior, no caffeine after 2 PM, morning daylight within 30 min of waking. Unlock: 30 days.',
              })
            }
            title="Fix sleep (7–8h) — the root node. Click to add this quest."
            className="w-24 h-24 rounded-full border-2 border-[#d4af37] bg-[#1a1a2e] flex flex-col items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)] cursor-pointer hover:scale-105 transition-transform text-center px-2"
          >
            <span className="text-[#d4af37] font-bold text-xs tracking-wider">FIX SLEEP</span>
            <span className="text-slate-400 text-[8px] uppercase tracking-widest mt-0.5">7–8h · root</span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
