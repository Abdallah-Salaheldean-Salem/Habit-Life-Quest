/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StatType, QuestDifficulty, QuestType } from '../types';

// ---------------------------------------------------------
// LIFE SKILL TREE — the built-in catalog.
// Lives in data/ so both the official tree and custom Paths (fork a branch)
// can read it.
// ---------------------------------------------------------

export const TIER_LABEL: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: '★' };
export const TIER_NAME: Record<number, string> = {
  1: 'Foundation',
  2: 'Consistency',
  3: 'Capability',
  4: 'Compounding',
  5: 'Leverage',
  6: 'Capstone',
};

export interface NodeData {
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
export const NODES: NodeData[] = [
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

export const BRANCH_ORDER: StatType[] = ['body', 'mind', 'career', 'spirit', 'hobby'];
export const TIERS = [1, 2, 3, 4, 5, 6];
