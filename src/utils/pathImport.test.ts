/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { importPaths, normalizeNode, describeImport } from './pathImport';
import { buildPathImportGuide, buildPathTemplateExample } from './pathTemplate';
import { MAX_PATHS, blankPath, newPathNode, validatePath } from './paths';
import { CustomPath } from '../types';

const NOW = '2026-10-10T00:00:00.000Z';
const mine = (name: string): CustomPath => blankPath(NOW, { name, nodes: [newPathNode(1, { title: 'x' })] });

describe('importPaths', () => {
  it('imports the template example cleanly', () => {
    const { paths, summary } = importPaths([], buildPathTemplateExample(), NOW);
    expect(summary).toMatchObject({ added: 1, skipped: 0, invalid: 0, overLimit: 0, nodesDropped: 0 });
    expect(paths[0].name).toBe('The Engineer’s Ascent');
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

  it('drops untitled nodes and nodes beyond 4 in a tier', () => {
    const nodes = [{ title: '' }, ...Array.from({ length: 6 }, (_, i) => ({ title: `n${i}`, tier: 1 }))];
    const { paths, summary } = importPaths([], { paths: [{ name: 'Crowded', nodes }] }, NOW);
    expect(paths[0].nodes).toHaveLength(4);
    expect(summary.nodesDropped).toBe(3);
  });

  it('always mints fresh ids (a file can’t collide with or resurrect records)', () => {
    const data = { paths: [{ id: 'path_evil', name: 'Ids', nodes: [{ id: 'node_x', title: 'a', tier: 1 }] }] };
    const p = importPaths([], data, NOW).paths[0];
    expect(p.id).not.toBe('path_evil');
    expect(p.nodes[0].id).not.toBe('node_x');
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
    expect(describeImport({ added: 2, skipped: 1, invalid: 0, overLimit: 0, nodesDropped: 0 })).toBe('2 paths imported · 1 already here (skipped)');
  });
});

describe('buildPathImportGuide', () => {
  const md = buildPathImportGuide([mine('Quran Hifz')], 'Habit Quest', 'scholar');

  it('lists the app’s real values and the user’s paths', () => {
    expect(md).toContain('# Path Import — Template & Guide');
    expect(md).toContain('`body`');
    expect(md).toContain('Capstone');
    expect(md).toContain('`Quran Hifz`');
    expect(md).toContain('Your class is **Scholar**');
  });

  it('ends with a JSON template that itself imports cleanly', () => {
    const json = md.split('```json\n')[1].split('\n```')[0];
    const { summary } = importPaths([], JSON.parse(json), NOW);
    expect(summary.added).toBe(1);
    expect(summary.invalid).toBe(0);
  });
});
