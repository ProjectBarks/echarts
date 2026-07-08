import { describe, test, expect } from 'vitest';
import {
  buildAdjacency,
  removeBackEdges,
  longestPathDepth,
  countReachable,
  collectReachable,
} from '../../graphs/common/graph.js';

const keys = (paths, root = 'R') => {
  const set = new Set();
  for (const p of paths) {
    const chain = [root, ...p.split('_')];
    for (let i = 0; i < chain.length - 1; i++) set.add(chain[i] + '__' + chain[i + 1]);
  }
  return [...set];
};

describe('buildAdjacency', () => {
  test('builds fwd and bwd neighbor sets', () => {
    const { fwd, bwd } = buildAdjacency(['a__b', 'b__c']);
    expect([...fwd.a]).toEqual(['b']);
    expect([...bwd.c]).toEqual(['b']);
  });
});

describe('removeBackEdges', () => {
  test('leaves an acyclic graph untouched', () => {
    const { fwd, bwd } = buildAdjacency(keys(['a_b_c', 'a_d_c']));
    removeBackEdges(fwd, bwd, ['R']);
    expect(fwd.a.has('b')).toBe(true);
    expect(fwd.c === undefined || fwd.c.size === 0).toBe(true);
  });
  test('breaks a 2-cycle (a<->b)', () => {
    const { fwd, bwd } = buildAdjacency(keys(['a_b', 'b_a']));
    removeBackEdges(fwd, bwd, ['R']);
    const ab = fwd.a?.has('b') ? 1 : 0;
    const ba = fwd.b?.has('a') ? 1 : 0;
    expect(ab + ba).toBe(1);
  });
  test('breaks a repeated-token loop (a_b_a) so depth terminates', () => {
    const { fwd, bwd } = buildAdjacency(keys(['a_b_a_c']));
    removeBackEdges(fwd, bwd, ['R']);
    const depth = longestPathDepth(['R'], fwd);
    expect(Number.isFinite(depth.a)).toBe(true);
  });
});

describe('longestPathDepth', () => {
  test('assigns longest-path depth on a DAG', () => {
    const { fwd } = buildAdjacency(keys(['a_b_c']));
    const depth = longestPathDepth(['R'], fwd);
    expect(depth.R).toBe(0);
    expect(depth.c).toBe(3);
  });
});

describe('reachability', () => {
  test('countReachable counts descendants with memoization', () => {
    const { fwd } = buildAdjacency(['a__b', 'b__c']);
    expect(countReachable('a', fwd, {})).toBe(2);
  });
  test('collectReachable gathers all reachable nodes into the visited set', () => {
    const { fwd } = buildAdjacency(['a__b', 'b__c']);
    const seen = new Set();
    collectReachable('a', fwd, seen);
    expect([...seen].sort()).toEqual(['a', 'b', 'c']);
  });
});
