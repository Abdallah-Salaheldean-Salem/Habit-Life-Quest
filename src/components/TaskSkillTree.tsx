import React from 'react';
import { motion } from 'motion/react';
import { StatType, STATS, QuestDifficulty, QuestType } from '../types';

interface NodeProps {
  title: string;
  subtitle: string;
  stat: StatType;
  difficulty: QuestDifficulty;
  type: QuestType;
  delay?: number;
  cx: number;
  cy: number;
  onAddQuest: (q: { title: string; stat: StatType; difficulty: QuestDifficulty; type: QuestType; target?: number }) => void;
}

function SkillNode({ title, subtitle, stat, difficulty, type, delay = 0, cx, cy, onAddQuest }: NodeProps) {
  const config = STATS[stat];
  
  return (
    <div className="absolute z-10" style={{ left: cx, top: cy, transform: 'translate(-50%, -50%)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay, duration: 0.5, type: 'spring' }}
        onClick={() => onAddQuest({ title, stat, difficulty, type, target: type === 'weekly' ? 3 : 1 })}
        className="w-48 sm:w-52 p-3 rounded-lg border text-center cursor-pointer transition-all hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] bg-[#15152a] flex flex-col justify-center items-center h-[72px]"
        style={{ 
          borderColor: config.color, 
          boxShadow: `0 0 10px ${config.color}20` 
        }}
      >
        <h4 className="font-bold text-sm tracking-tight leading-tight mb-1" style={{ color: config.color }}>{title}</h4>
        <p className="text-[9px] text-slate-400 uppercase tracking-wider">{subtitle}</p>
      </motion.div>
    </div>
  );
}

export default function TaskSkillTree({ onAddQuest }: { onAddQuest: (q: { title: string; stat: StatType; difficulty: QuestDifficulty; type: QuestType; target?: number }) => void }) {
  const nodes: Omit<NodeProps, 'onAddQuest'>[] = [
    // ROW 1
    { title: "Run 5k", subtitle: "body recomposition", stat: "body", type: "weekly", difficulty: "hard", delay: 0.6, cx: 160, cy: 50 },
    { title: "Deep work", subtitle: "2h of focus daily", stat: "mind", type: "daily", difficulty: "hard", delay: 0.6, cx: 400, cy: 50 },
    { title: "Side income", subtitle: "invest monthly", stat: "career", type: "weekly", difficulty: "hard", delay: 0.6, cx: 640, cy: 50 },

    // ROW 2
    { title: "Strength train", subtitle: "3 sessions a week", stat: "body", type: "weekly", difficulty: "normal", delay: 0.4, cx: 160, cy: 150 },
    { title: "Learn one skill", subtitle: "study it daily", stat: "mind", type: "daily", difficulty: "normal", delay: 0.4, cx: 400, cy: 150 },
    { title: "Upskill + network", subtitle: "add 1 contact weekly", stat: "career", type: "weekly", difficulty: "normal", delay: 0.4, cx: 640, cy: 150 },

    // ROW 3
    { title: "Sleep 7-8h", subtitle: "walk 8-10k steps", stat: "body", type: "daily", difficulty: "normal", delay: 0.2, cx: 160, cy: 250 },
    { title: "Read daily", subtitle: "10 pages minimum", stat: "mind", type: "daily", difficulty: "normal", delay: 0.2, cx: 400, cy: 250 },
    { title: "Track money", subtitle: "auto-save 10-20%", stat: "career", type: "daily", difficulty: "normal", delay: 0.2, cx: 640, cy: 250 },

    // ROW 5
    { title: "Daily journal", subtitle: "5 minutes, mornings", stat: "spirit", type: "daily", difficulty: "easy", delay: 0.2, cx: 160, cy: 450 },
    { title: "Pick one craft", subtitle: "music, art, writing", stat: "hobby", type: "weekly", difficulty: "normal", delay: 0.2, cx: 640, cy: 450 },

    // ROW 6
    { title: "Gratitude + nature", subtitle: "3 things a day", stat: "spirit", type: "daily", difficulty: "easy", delay: 0.4, cx: 160, cy: 550 },
    { title: "Practice weekly", subtitle: "join a community", stat: "hobby", type: "weekly", difficulty: "normal", delay: 0.4, cx: 640, cy: 550 },

    // ROW 7
    { title: "Give back", subtitle: "volunteer + connect", stat: "spirit", type: "milestone", difficulty: "hard", delay: 0.6, cx: 160, cy: 650 },
    { title: "Ship a project", subtitle: "finish it, share it", stat: "hobby", type: "milestone", difficulty: "hard", delay: 0.6, cx: 640, cy: 650 },
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

        {/* CORE NODE */}
        <div className="absolute z-20" style={{ left: 400, top: 350, transform: 'translate(-50%, -50%)' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="w-20 h-20 rounded-full border-2 border-[#d4af37] bg-[#1a1a2e] flex flex-col items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)] cursor-default"
          >
            <span className="text-[#d4af37] font-bold text-sm tracking-wider">CORE</span>
            <span className="text-slate-400 text-[8px] uppercase tracking-widest mt-0.5">start here</span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
