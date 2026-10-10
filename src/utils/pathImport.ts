/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ---------------------------------------------------------
// PATH IMPORT
// Import file format (JSON):
//   { "format": "habit-quest-paths/1", "paths": PathImport[] }
// "format" is optional (older files and hand-written ones omit it). A bare
// array of paths, or a single path object, is also accepted. Import is a
// merge: a path whose name matches one you already have is skipped, so
// re-importing the same file never duplicates anything. Ids are always minted
// fresh — a file's ids could collide with (or resurrect) records on this
// device. Bad values fall back to safe defaults rather than failing the file.
// ---------------------------------------------------------

import { CustomPath, PathNode, QuestDifficulty, QuestType, StatType } from '../types';
import { uid } from './id';
import { MAX_NODES_PER_TIER, MAX_PATHS, MAX_TIERS, NAME_MAX, TITLE_MAX, validatePath } from './paths';

export const STAT_KEYS: StatType[] = ['body', 'mind', 'career', 'spirit', 'hobby'];
export const TYPE_KEYS: QuestType[] = ['daily', 'weekly', 'milestone'];
export const DIFFICULTY_KEYS: QuestDifficulty[] = ['easy', 'normal', 'hard'];
const DESC_MAX = 280;
const PURPOSE_MAX = 120;

/** The import format this build writes and reads. Bump when the shape changes. */
export const PATH_FORMAT_NAME = 'habit-quest-paths';
export const PATH_FORMAT_VERSION = 1;
export const PATH_FORMAT = `${PATH_FORMAT_NAME}/${PATH_FORMAT_VERSION}`;

export interface PathImportSummary {
  /** Paths added. */
  added: number;
  /** Paths skipped because one with the same name already exists. */
  skipped: number;
  /** Paths ignored because they were unusable (no name, no Tier I node…). */
  invalid: number;
  /** Paths not added because the 8-path limit was reached. */
  overLimit: number;
  /** Nodes dropped (no title, or beyond the first 4 in a tier). */
  nodesDropped: number;
  /** Titles of the dropped nodes that had one, so the user knows what was lost. */
  droppedTitles: string[];
  /** The file declares a newer format than this app knows — fields may be ignored. */
  newerFormat: boolean;
}

// UTF-8 text that was opened as Mac Roman (TextEdit, some Mac viewers) and
// pasted back turns "’" into "‚Äô", "—" into "‚Äî" and so on. Undo the common
// punctuation cases so a round-trip through a mis-decoding viewer or an AI
// chat doesn't leave garbled names. Longest sequences first.
const MOJIBAKE: [string, string][] = [
  ['‚Äî', '—'],
  ['‚Äì', '–'],
  ['‚Äô', '’'],
  ['‚Äò', '‘'],
  ['‚Äú', '“'],
  ['‚Äù', '”'],
  ['‚Ä¶', '…'],
  ['‚Ä¢', '•'],
  ['‚Üí', '→'],
  ['‚òÖ', '★'],
  ['¬∑', '·'],
  ['√ó', '×'],
  ['¬†', ' '],
];

/** Repair Mac-Roman-decoded UTF-8 punctuation; leaves clean text untouched. */
export function repairMojibake(s: string): string {
  if (!/[‚¬√]/.test(s)) return s;
  return MOJIBAKE.reduce((acc, [bad, good]) => acc.split(bad).join(good), s);
}

const str = (v: unknown): string => (typeof v === 'string' ? repairMojibake(v).trim() : '');
const nameKey = (s: string) => s.trim().toLowerCase();

/**
 * Parse the text of an import file. Strips a UTF-8 byte-order mark (Windows
 * editors add one) and a ```json fence (AIs often wrap their reply in one),
 * then JSON-parses. Throws SyntaxError on anything that still isn't JSON.
 */
export function parsePathFile(text: string): unknown {
  let t = text.replace(/^﻿/, '').trim();
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n?```$/i.exec(t);
  if (fenced) t = fenced[1].trim();
  return JSON.parse(t);
}

/** Coerce one imported node into a PathNode, or null if it has no title. */
export function normalizeNode(raw: unknown): PathNode | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = str(r.title).slice(0, TITLE_MAX);
  if (!title) return null;
  const tierNum = Math.round(Number(r.tier));
  const tier = Number.isFinite(tierNum) ? Math.min(MAX_TIERS, Math.max(1, tierNum)) : 1;
  const type = TYPE_KEYS.includes(r.type as QuestType) ? (r.type as QuestType) : 'daily';
  const difficulty = DIFFICULTY_KEYS.includes(r.difficulty as QuestDifficulty) ? (r.difficulty as QuestDifficulty) : 'normal';
  const rawTarget = Math.round(Number(r.target));
  const target = type === 'weekly' ? (Number.isFinite(rawTarget) ? Math.min(7, Math.max(1, rawTarget)) : 2) : 1;
  const description = str(r.description).slice(0, DESC_MAX);
  return { id: uid('node'), tier, title, type, difficulty, target, ...(description ? { description } : {}) };
}

/**
 * Coerce one imported path into a CustomPath. Returns the path (or null if it
 * has no usable name / nodes) and the nodes dropped on the way. Within a tier
 * the first 4 nodes in file order are kept.
 */
export function normalizePath(
  raw: unknown,
  now: string,
): { path: CustomPath | null; nodesDropped: number; droppedTitles: string[] } {
  if (!raw || typeof raw !== 'object') return { path: null, nodesDropped: 0, droppedTitles: [] };
  const r = raw as Record<string, unknown>;
  const name = str(r.name).slice(0, NAME_MAX);
  const rawNodes = Array.isArray(r.nodes) ? r.nodes : [];
  let nodesDropped = 0;
  const droppedTitles: string[] = [];
  const perTier = new Map<number, number>();
  const nodes: PathNode[] = [];
  for (const rn of rawNodes) {
    const n = normalizeNode(rn);
    if (!n) {
      nodesDropped++;
      continue;
    }
    const count = perTier.get(n.tier) ?? 0;
    if (count >= MAX_NODES_PER_TIER) {
      nodesDropped++;
      droppedTitles.push(n.title);
      continue;
    }
    perTier.set(n.tier, count + 1);
    nodes.push(n);
  }
  const stat = STAT_KEYS.includes(r.stat as StatType) ? (r.stat as StatType) : 'mind';
  const purpose = str(r.purpose).slice(0, PURPOSE_MAX);
  const path: CustomPath = {
    id: uid('path'),
    name,
    stat,
    ...(purpose ? { purpose } : {}),
    nodes,
    createdAt: now,
    updatedAt: now,
  };
  return { path: validatePath(path) ? null : path, nodesDropped, droppedTitles };
}

/**
 * Work out which paths an import file adds to `existing`. Throws on a file
 * that isn't a path import at all; otherwise never throws.
 */
export function importPaths(
  existing: CustomPath[],
  data: unknown,
  now: string,
): { paths: CustomPath[]; summary: PathImportSummary } {
  let newerFormat = false;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const fmt = (data as Record<string, unknown>).format;
    if (typeof fmt === 'string') {
      const m = /^([\w-]+)\/(\d+)$/.exec(fmt.trim());
      if (!m || m[1] !== PATH_FORMAT_NAME) {
        throw new Error(`This file is in a different format ("${fmt}") — it isn’t a Habit Quest path file.`);
      }
      newerFormat = Number(m[2]) > PATH_FORMAT_VERSION;
    }
  }

  let list: unknown[];
  if (Array.isArray(data)) list = data;
  else if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).paths)) {
    list = (data as Record<string, unknown>).paths as unknown[];
  } else if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).nodes)) {
    list = [data]; // a single path object
  } else {
    throw new Error('This file has no "paths" list — it isn’t a path import file.');
  }

  const summary: PathImportSummary = {
    added: 0,
    skipped: 0,
    invalid: 0,
    overLimit: 0,
    nodesDropped: 0,
    droppedTitles: [],
    newerFormat,
  };
  const taken = new Set(existing.map((p) => nameKey(p.name)));
  let room = Math.max(0, MAX_PATHS - existing.length);
  const paths: CustomPath[] = [];

  for (const raw of list) {
    const { path, nodesDropped, droppedTitles } = normalizePath(raw, now);
    if (!path) {
      summary.invalid++;
      continue;
    }
    if (taken.has(nameKey(path.name))) {
      summary.skipped++;
      continue;
    }
    if (room === 0) {
      summary.overLimit++;
      continue;
    }
    taken.add(nameKey(path.name));
    room--;
    summary.nodesDropped += nodesDropped;
    summary.droppedTitles.push(...droppedTitles);
    summary.added++;
    paths.push(path);
  }
  return { paths, summary };
}

/** One-line, human summary of an import, e.g. "2 paths imported · 1 already here (skipped)". */
export function describeImport(s: PathImportSummary): string {
  const parts = [`${s.added} path${s.added === 1 ? '' : 's'} imported`];
  if (s.skipped) parts.push(`${s.skipped} already here (skipped)`);
  if (s.invalid) parts.push(`${s.invalid} unusable (ignored)`);
  if (s.overLimit) parts.push(`${s.overLimit} over the ${MAX_PATHS}-path limit`);
  if (s.nodesDropped) {
    const shown = s.droppedTitles.slice(0, 3).map((t) => `“${t}”`).join(', ');
    const more = s.droppedTitles.length > 3 ? ` +${s.droppedTitles.length - 3} more` : '';
    parts.push(
      `${s.nodesDropped} node${s.nodesDropped === 1 ? '' : 's'} dropped${shown ? ` (${shown}${more} — only the first ${MAX_NODES_PER_TIER} per tier are kept)` : ''}`,
    );
  }
  if (s.newerFormat) parts.push('made for a newer app version — some details may be ignored');
  return parts.join(' · ');
}
