/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ---------------------------------------------------------
// PATH IMPORT
// Import file format (JSON):
//   { "paths": PathImport[] }
// A bare array of paths, or a single path object, is also accepted. Import is
// a merge: a path whose name matches one you already have is skipped, so
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

export interface PathImportSummary {
  /** Paths added. */
  added: number;
  /** Paths skipped because one with the same name already exists. */
  skipped: number;
  /** Paths ignored because they were unusable (no name, no Tier I node…). */
  invalid: number;
  /** Paths not added because the 8-path limit was reached. */
  overLimit: number;
  /** Nodes dropped (no title, or beyond 4 in a tier). */
  nodesDropped: number;
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const nameKey = (s: string) => s.trim().toLowerCase();

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
 * has no usable name / nodes) and how many nodes were dropped on the way.
 */
export function normalizePath(raw: unknown, now: string): { path: CustomPath | null; nodesDropped: number } {
  if (!raw || typeof raw !== 'object') return { path: null, nodesDropped: 0 };
  const r = raw as Record<string, unknown>;
  const name = str(r.name).slice(0, NAME_MAX);
  const rawNodes = Array.isArray(r.nodes) ? r.nodes : [];
  let nodesDropped = 0;
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
  return { path: validatePath(path) ? null : path, nodesDropped };
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
  let list: unknown[];
  if (Array.isArray(data)) list = data;
  else if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).paths)) {
    list = (data as Record<string, unknown>).paths as unknown[];
  } else if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).nodes)) {
    list = [data]; // a single path object
  } else {
    throw new Error('This file has no "paths" list — it isn’t a path import file.');
  }

  const summary: PathImportSummary = { added: 0, skipped: 0, invalid: 0, overLimit: 0, nodesDropped: 0 };
  const taken = new Set(existing.map((p) => nameKey(p.name)));
  let room = Math.max(0, MAX_PATHS - existing.length);
  const paths: CustomPath[] = [];

  for (const raw of list) {
    const { path, nodesDropped } = normalizePath(raw, now);
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
  if (s.nodesDropped) parts.push(`${s.nodesDropped} node${s.nodesDropped === 1 ? '' : 's'} dropped`);
  return parts.join(' · ');
}
