/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ---------------------------------------------------------
// PATH IMPORT — TEMPLATE & GUIDE
// Builds a Markdown "template + guide" for the path importer (pathImport.ts).
// It is meant to be handed to an AI assistant together with the user's goal,
// so the AI can produce a JSON file that imports cleanly. The app's real
// values (stats, tiers, limits, existing path names) are embedded.
// ---------------------------------------------------------

import { CustomPath, STATS, CLASSES, UserClass } from '../types';
import { TIER_LABEL, TIER_NAME } from '../data/lifeTree';
import { MAX_NODES_PER_TIER, MAX_PATHS, MAX_TIERS, NAME_MAX, TITLE_MAX } from './paths';
import { STAT_KEYS } from './pathImport';

const FENCE = '```';
const cell = (s: string) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

/** A small, valid import file showing every field. */
export function buildPathTemplateExample() {
  return {
    paths: [
      {
        name: 'The Engineer’s Ascent',
        stat: 'mind',
        purpose: 'Become a strong embedded engineer within two years.',
        nodes: [
          {
            tier: 1,
            title: 'Code 45 minutes',
            type: 'daily',
            difficulty: 'normal',
            description: 'One focused block on the current course or project, phone in another room. Unlock: 30 days.',
          },
          {
            tier: 1,
            title: 'Read one datasheet section',
            type: 'daily',
            difficulty: 'easy',
            description: 'A single section, with notes in your own words. Unlock: 30 days.',
          },
          {
            tier: 2,
            title: 'Ship a weekly mini-project',
            type: 'weekly',
            difficulty: 'normal',
            target: 1,
            description: 'Something small that runs on real hardware, pushed to GitHub. Unlock: 8 weeks.',
          },
          {
            tier: 3,
            title: 'Build a full RTOS project',
            type: 'milestone',
            difficulty: 'hard',
            description: 'Multiple tasks, queues, a driver you wrote. Unlock: demo recorded.',
          },
          {
            tier: 6,
            title: 'Hired as an embedded engineer',
            type: 'milestone',
            difficulty: 'hard',
            description: 'Capstone. The offer is signed.',
          },
        ],
      },
    ],
  };
}

export function buildPathImportGuide(existing: CustomPath[], appName: string, userClass?: UserClass): string {
  const today = new Date().toISOString().slice(0, 10);
  const example = JSON.stringify(buildPathTemplateExample(), null, 2);
  const room = Math.max(0, MAX_PATHS - existing.length);

  const L: string[] = [];
  L.push('# Path Import — Template & Guide');
  L.push('');
  L.push(`**App:** ${appName}  `);
  L.push(`**Generated:** ${today}`);
  L.push('');
  L.push(
    "This file explains how to write a JSON file that the app's **Import** button (Quests → PATHS) accepts, and ends with a ready-to-fill template. It is written so you can hand it straight to an AI assistant.",
  );
  L.push('');

  L.push('## 1. How to use');
  L.push('');
  L.push('1. Give this whole file to an AI assistant (ChatGPT, Claude, Gemini, …) together with your goal — a degree, a skill, a comeback, a project.');
  L.push('2. Paste the prompt from section 2 and describe your goal underneath it.');
  L.push('3. Save the AI’s reply as a file ending in **`.json`** (for example `my-path.json`).');
  L.push('4. In the app, open **Quests → PATHS → Import** and choose the file.');
  L.push('5. A banner confirms how many paths were imported. Importing the same file again is safe — a path whose name you already have is skipped.');
  L.push('');

  L.push('## 2. Prompt to paste into the AI');
  L.push('');
  L.push(FENCE + 'text');
  L.push('Turn my goal below into a skill-tree "path" for my habit RPG, as a JSON import file.');
  L.push('Follow sections 3–7 of the attached "Path Import — Template & Guide" exactly, and use');
  L.push('the template in section 9 as the shape of the output.');
  L.push('Design it like a game skill tree: Tier I is small daily habits I can start today;');
  L.push('each tier is earned by mastering the one below; Tier VI (★) is the capstone.');
  L.push('Reply with ONLY the JSON — no explanation and no markdown code fences — so I can');
  L.push('save your reply directly as a .json file.');
  L.push('');
  L.push('My goal:');
  L.push('<describe your goal here>');
  L.push(FENCE);
  L.push('');

  L.push('## 3. Output rules (for the AI)');
  L.push('');
  L.push('- Output a single, valid JSON object — UTF-8, no comments, no trailing commas, no text before or after it.');
  L.push('- Top-level key: `"paths"` — an array of path objects (one path is fine).');
  L.push(`- Every path needs a \`"name"\` (max ${NAME_MAX} characters) and at least one node in **tier 1**.`);
  L.push(`- Every node needs a \`"title"\` (max ${TITLE_MAX} characters) and a \`"tier"\` from 1 to ${MAX_TIERS}.`);
  L.push(`- At most **${MAX_NODES_PER_TIER} nodes per tier**. Tiers may be skipped (e.g. 1, 2, 3, then 6).`);
  L.push(`- \`"stat"\` must be one of: ${STAT_KEYS.map((s) => `\`"${s}"\``).join(', ')}.`);
  L.push('- `"type"` must be `"daily"`, `"weekly"` or `"milestone"`; `"difficulty"` must be `"easy"`, `"normal"` or `"hard"`.');
  L.push('- For weekly nodes, `"target"` is how many times per week (1–7). Daily and milestone nodes ignore it.');
  L.push('- Put the **why** and the **unlock criterion** in `"description"` (max 280 characters), ending with e.g. `Unlock: 30 days.`');
  L.push('- Do not include `"id"` fields — the app creates its own.');
  L.push('');

  L.push('## 4. Values in this app');
  L.push('');
  L.push('**Stats** — sets the path’s colour and which class earns bonus XP on its quests:');
  L.push('');
  L.push('| `stat` | Shown as | Covers | Bonus-XP class |');
  L.push('|---|---|---|---|');
  STAT_KEYS.forEach((s) => {
    const cls = (Object.keys(CLASSES) as UserClass[]).find((c) => CLASSES[c].bonusStat === s);
    L.push(`| \`${s}\` | ${cell(STATS[s].name)} | ${cell(STATS[s].covers)} | ${cls ? cell(CLASSES[cls].name) : '—'} |`);
  });
  L.push('');
  if (userClass) {
    L.push(`Your class is **${CLASSES[userClass].name}**, so paths with \`"stat": "${CLASSES[userClass].bonusStat}"\` earn you bonus XP.`);
    L.push('');
  }
  L.push('**Tiers** — a tier reveals once any node in the tier below it is mastered:');
  L.push('');
  L.push('| `tier` | Label | Name | Design intent |');
  L.push('|---|---|---|---|');
  const intent: Record<number, string> = {
    1: 'Small daily habits you can start today; always open',
    2: 'Consistency — weekly rhythms that build on Tier I',
    3: 'Capability — first real results',
    4: 'Compounding — bigger, longer projects',
    5: 'Leverage — teaching, public proof, multipliers',
    6: 'Capstone — the identity the whole path builds toward',
  };
  for (let t = 1; t <= MAX_TIERS; t++) L.push(`| \`${t}\` | ${TIER_LABEL[t]} | ${TIER_NAME[t]} | ${intent[t]} |`);
  L.push('');
  L.push('**Mastery** — a daily node unlocks after about 30 consistent days, a weekly node after its target is held for several weeks, and a milestone when it is done once.');
  L.push('');
  L.push(
    `**Your paths:** ${existing.length ? existing.map((p) => `\`${cell(p.name)}\``).join(', ') : 'none yet'} — ${existing.length}/${MAX_PATHS} used, room for ${room} more. A path with one of these names is skipped on import, so give new paths fresh names.`,
  );
  L.push('');

  L.push('## 5. Path fields');
  L.push('');
  L.push('| Field | Type | Required | Meaning / allowed values |');
  L.push('|---|---|---|---|');
  const pf: [string, string, string, string][] = [
    ['name', 'string', 'yes', `Path name, max ${NAME_MAX} characters`],
    ['stat', 'string', 'no', `${STAT_KEYS.map((s) => `\`${s}\``).join(' · ')} (default \`mind\`)`],
    ['purpose', 'string', 'no', 'One line on what the path builds toward (max 120 characters)'],
    ['nodes', 'array', 'yes', 'The path’s nodes (section 6); at least one in tier 1'],
  ];
  pf.forEach(([a, b, c, d]) => L.push(`| \`${a}\` | ${b} | ${c} | ${d} |`));
  L.push('');

  L.push('## 6. Node fields');
  L.push('');
  L.push('| Field | Type | Required | Meaning / allowed values |');
  L.push('|---|---|---|---|');
  const nf: [string, string, string, string][] = [
    ['title', 'string', 'yes', `Short action, max ${TITLE_MAX} characters, e.g. "Read 10 pages"`],
    ['tier', 'number 1–6', 'yes', 'Which tier the node sits in (default 1)'],
    ['type', 'string', 'no', '`daily` · `weekly` · `milestone` (default `daily`)'],
    ['difficulty', 'string', 'no', '`easy` · `normal` · `hard` (default `normal`) — sets the XP'],
    ['target', 'number 1–7', 'no', 'Weekly nodes only: times per week (default 2)'],
    ['description', 'string', 'no', 'Why it matters + the unlock criterion, max 280 characters'],
  ];
  nf.forEach(([a, b, c, d]) => L.push(`| \`${a}\` | ${b} | ${c} | ${d} |`));
  L.push('');

  L.push('## 7. Tips for a good path');
  L.push('');
  L.push('- **Start tiny.** Tier I should be 1–3 easy or normal daily habits — the smallest version that still counts.');
  L.push('- **One node, one action.** "Code 45 minutes", not "Become good at coding".');
  L.push('- **Milestones for outcomes.** Results (pass the exam, ship the app, run the race) are `milestone` nodes in Tiers III–VI.');
  L.push('- **Weekly for rhythms.** Things you do a few times a week are `weekly` with a `target`.');
  L.push('- **Always end in a capstone.** One Tier 6 milestone that names who you will have become.');
  L.push('- **6–15 nodes** is a good size. You can add more later inside the app.');
  L.push('');

  L.push('## 8. What the app does on import');
  L.push('');
  L.push('- **Adds** each new path to PATHS, with Tier I open and the rest sealed until earned.');
  L.push('- A path whose **name already exists is skipped** (not updated), so re-importing is safe.');
  L.push(`- Paths beyond the **${MAX_PATHS}-path limit** are not added.`);
  L.push('- Nodes without a title, and nodes beyond 4 in a tier, are **dropped**. An unknown `stat` becomes `mind`, an unknown `type` becomes `daily`, an unknown `difficulty` becomes `normal`, and an out-of-range `tier` is clamped to 1–6.');
  L.push('- A path left with no name or no Tier I node is **ignored**.');
  L.push('- Importing never touches your quests, XP or existing paths.');
  L.push('');

  L.push('## 9. Template (copy, then replace the example values)');
  L.push('');
  L.push(FENCE + 'json');
  L.push(example);
  L.push(FENCE);
  L.push('');
  return L.join('\n');
}
