/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { importPaths, normalizeNode, describeImport, parsePathFile, repairMojibake, PATH_FORMAT } from './pathImport';
import { buildPathImportGuide, buildPathTemplateExample } from './pathTemplate';
import { MAX_PATHS, blankPath, newPathNode, validatePath, pathFrontier } from './paths';
import { CustomPath } from '../types';

const NOW = '2026-10-10T00:00:00.000Z';
const mine = (name: string): CustomPath => blankPath(NOW, { name, nodes: [newPathNode(1, { title: 'x' })] });

describe('importPaths', () => {
  it('imports the template example cleanly', () => {
    const { paths, summary } = importPaths([], buildPathTemplateExample(), NOW);
    expect(summary).toMatchObject({ added: 1, skipped: 0, invalid: 0, overLimit: 0, nodesDropped: 0, newerFormat: false });
    expect(paths[0].name).toBe("The Engineer's Ascent");
    expect(paths[0].nodes).toHaveLength(5);
    expect(validatePath(paths[0])).toBeNull();
  });

  it('accepts a bare array or a single path object', () => {
    const one = { name: 'Solo', nodes: [{ title: 'Start', tier: 1 }] };
    expect(importPaths([], [one], NOW).summary.added).toBe(1);
    expect(importPaths([], one, NOW).summary.added).toBe(1);
  });

  it('throws on a file that is not a path import', () => {
    expect(() => importPaths([], { tasks: [] }, NOW)).toThrow(/paths/);
    expect(() => importPaths([], 'hello', NOW)).toThrow();
  });

  it('skips a path whose name you already have (case-insensitive), and duplicates within the file', () => {
    const data = { paths: [{ name: 'my path', nodes: [{ title: 'a', tier: 1 }] }, { name: 'New', nodes: [{ title: 'a', tier: 1 }] }, { name: 'NEW', nodes: [{ title: 'b', tier: 1 }] }] };
    const { paths, summary } = importPaths([mine('My Path')], data, NOW);
    expect(paths.map((p) => p.name)).toEqual(['New']);
    expect(summary.skipped).toBe(2);
  });

  it('ignores unusable paths (no name / no Tier I node)', () => {
    const data = { paths: [{ nodes: [{ title: 'a', tier: 1 }] }, { name: 'Deep only', nodes: [{ title: 'a', tier: 3 }] }] };
    const { summary } = importPaths([], data, NOW);
    expect(summary).toMatchObject({ added: 0, invalid: 2 });
  });

  it('respects the path limit', () => {
    const existing = Array.from({ length: MAX_PATHS - 1 }, (_, i) => mine(`P${i}`));
    const data = { paths: [{ name: 'A', nodes: [{ title: 'a', tier: 1 }] }, { name: 'B', nodes: [{ title: 'b', tier: 1 }] }] };
    const { summary } = importPaths(existing, data, NOW);
    expect(summary).toMatchObject({ added: 1, overLimit: 1 });
  });

  it('drops untitled nodes and keeps the FIRST 4 per tier, naming the dropped ones', () => {
    const nodes = [{ title: '' }, ...Array.from({ length: 6 }, (_, i) => ({ title: `n${i}`, tier: 1 }))];
    const { paths, summary } = importPaths([], { paths: [{ name: 'Crowded', nodes }] }, NOW);
    expect(paths[0].nodes.map((n) => n.title)).toEqual(['n0', 'n1', 'n2', 'n3']);
    expect(summary.nodesDropped).toBe(3);
    expect(summary.droppedTitles).toEqual(['n4', 'n5']);
    expect(describeImport(summary)).toMatch(/3 nodes dropped \(“n4”, “n5” — only the first 4 per tier are kept\)/);
  });

  it('accepts the current format, warns on a newer one, rejects a foreign one', () => {
    const one = [{ name: 'F', nodes: [{ title: 'a', tier: 1 }] }];
    expect(importPaths([], { format: PATH_FORMAT, paths: one }, NOW).summary.newerFormat).toBe(false);
    const newer = importPaths([], { format: 'habit-quest-paths/2', paths: one }, NOW).summary;
    expect(newer.added).toBe(1);
    expect(newer.newerFormat).toBe(true);
    expect(describeImport(newer)).toMatch(/newer app version/);
    expect(() => importPaths([], { format: 'operation-malcolm-tasks/1', paths: one }, NOW)).toThrow(/different format/);
  });

  it('repairs Mac-Roman mojibake in imported text', () => {
    const data = { paths: [{ name: 'The Engineer‚Äôs Ascent', purpose: 'Learn ‚Äî then ship ‚Üí repeat', nodes: [{ title: 'Read ¬∑ write', tier: 1 }] }] };
    const p = importPaths([], data, NOW).paths[0];
    expect(p.name).toBe('The Engineer’s Ascent');
    expect(p.purpose).toBe('Learn — then ship → repeat');
    expect(p.nodes[0].title).toBe('Read · write');
    expect(repairMojibake('Plain text, untouched.')).toBe('Plain text, untouched.');
    expect(repairMojibake('Ahmed — أحمد')).toBe('Ahmed — أحمد');
  });

  it('a skipped tier still opens: tiers 1, 2, 3, 6 → mastering tier 3 opens the capstone', () => {
    const p = importPaths([], buildPathTemplateExample(), NOW).paths[0]; // tiers 1, 2, 3, 6
    const id = (tier: number) => p.nodes.find((n) => n.tier === tier)!.id;
    expect(pathFrontier(p, new Set([id(1), id(2)]))).toBe(3);
    expect(pathFrontier(p, new Set([id(1), id(2), id(3)]))).toBe(6);
  });

  it('always mints fresh ids (a file can’t collide with or resurrect records)', () => {
    const data = { paths: [{ id: 'path_evil', name: 'Ids', nodes: [{ id: 'node_x', title: 'a', tier: 1 }] }] };
    const p = importPaths([], data, NOW).paths[0];
    expect(p.id).not.toBe('path_evil');
    expect(p.nodes[0].id).not.toBe('node_x');
  });
});

describe('parsePathFile', () => {
  it('parses plain JSON, a byte-order mark, and an AI reply wrapped in a code fence', () => {
    const json = '{"paths":[]}';
    expect(parsePathFile(json)).toEqual({ paths: [] });
    expect(parsePathFile('\uFEFF' + json)).toEqual({ paths: [] });
    expect(parsePathFile('```json\n' + json + '\n```')).toEqual({ paths: [] });
    expect(() => parsePathFile('{ not json')).toThrow(SyntaxError);
  });
});

describe('normalizeNode', () => {
  it('falls back to safe defaults for bad values', () => {
    const n = normalizeNode({ title: '  Run  ', tier: 99, type: 'hourly', difficulty: 'insane' })!;
    expect(n).toMatchObject({ title: 'Run', tier: 6, type: 'daily', difficulty: 'normal', target: 1 });
  });

  it('clamps a weekly target to 1–7 and defaults it to 2', () => {
    expect(normalizeNode({ title: 'a', type: 'weekly', target: 40 })!.target).toBe(7);
    expect(normalizeNode({ title: 'a', type: 'weekly' })!.target).toBe(2);
    expect(normalizeNode({ title: 'a', type: 'daily', target: 5 })!.target).toBe(1);
  });
});

describe('describeImport', () => {
  it('summarises in one line', () => {
    expect(describeImport({ added: 2, skipped: 1, invalid: 0, overLimit: 0, nodesDropped: 0, droppedTitles: [], newerFormat: false })).toBe(
      '2 paths imported · 1 already here (skipped)',
    );
  });
});

describe('buildPathImportGuide', () => {
  const md = buildPathImportGuide([mine('Quran Hifz')], 'Habit Quest', 'scholar');

  it('lists the app’s real values and the user’s paths', () => {
    expect(md).toContain('# Path Import - Template & Guide');
    expect(md).toContain('`body`');
    expect(md).toContain('Capstone');
    expect(md).toContain('`Quran Hifz`');
    expect(md).toContain('Your class is **Scholar**');
  });

  it('is plain ASCII apart from user-entered names (no mojibake if opened as Mac Roman)', () => {
    const own = buildPathImportGuide([], 'Habit Quest', 'scholar');
    const bad = [...own].filter((c) => c.charCodeAt(0) > 126);
    expect(bad).toEqual([]);
  });

  it('states the real rules: skipped tiers, fixed mastery, first 4 kept, Unlock is display-only, format', () => {
    expect(md).toMatch(/nearest lower tier that has nodes; empty tiers are skipped/);
    expect(md).toMatch(/30 different days/);
    expect(md).toMatch(/4 different weeks/);
    expect(md).toMatch(/first 4 in a tier/);
    expect(md).toMatch(/the app does not read it/);
    expect(md).toContain(`"format": "${PATH_FORMAT}"`);
    expect(md).not.toMatch(/"stat"` must be one of/); // optional fields are described as optional
  });

  it('ends with a JSON template that itself imports cleanly', () => {
    const json = md.split('```json\n')[1].split('\n```')[0];
    const { summary } = importPaths([], JSON.parse(json), NOW);
    expect(summary.added).toBe(1);
    expect(summary.invalid).toBe(0);
  });
});
