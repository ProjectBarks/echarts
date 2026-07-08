import { describe, test, expect } from 'vitest';
import {
  parseSeries,
  buildLatencyAndEdges,
  findCriticalPath,
  dropZeroPredicates,
  computeCleanEdges,
} from '../../graphs/flow-graph/data.js';

const frame = (name, value) => ({
  name,
  fields: [
    { type: 'time', values: [0] },
    { type: 'number', values: [value] },
  ],
});
const ROOT = 'FLOW_START';

describe('parseSeries', () => {
  test('splits path series from bare task series', () => {
    const parsed = parseSeries([frame('a_b', 10), frame('a', 4)], ROOT);
    expect(parsed.paths).toEqual([{ path: 'a_b', p95: 10 }]);
    expect(parsed.taskDurations).toEqual({ a: 4 });
    expect(parsed.hasTaskDurations).toBe(true);
  });
});

describe('buildLatencyAndEdges', () => {
  test('builds edge map with ROOT prefix and node latencies from task durations', () => {
    const parsed = parseSeries([frame('a_b', 10), frame('a', 4), frame('b', 6)], ROOT);
    const { nodeLat, edgeMap } = buildLatencyAndEdges(parsed, ROOT);
    expect(edgeMap['FLOW_START__a']).toBe(10);
    expect(edgeMap['a__b']).toBe(10);
    expect(nodeLat.a).toBe(4);
    expect(nodeLat.b).toBe(6);
    expect(nodeLat[ROOT]).toBe(0);
  });
});

describe('findCriticalPath', () => {
  test('picks the highest-p95 path', () => {
    const parsed = parseSeries([frame('a_b', 10), frame('a_c', 20)], ROOT);
    const { nodeLat } = buildLatencyAndEdges(parsed, ROOT);
    const crit = findCriticalPath(parsed.paths, nodeLat, ROOT);
    expect(crit.crit.path).toBe('a_c');
    expect(crit.critSet.has('c')).toBe(true);
  });
});

describe('dropZeroPredicates', () => {
  test('drops predicate nodes with zero latency', () => {
    const nodeLat = { xpredicate: 0, x: 5, [ROOT]: 0 };
    const dropped = dropZeroPredicates(nodeLat);
    expect(dropped.has('xpredicate')).toBe(true);
    expect('xpredicate' in nodeLat).toBe(false);
  });
});

describe('computeCleanEdges', () => {
  test('excludes edges touching dropped nodes', () => {
    const parsed = parseSeries([frame('xpredicate_x', 10)], ROOT);
    const { edgeMap } = buildLatencyAndEdges(parsed, ROOT);
    const clean = computeCleanEdges(edgeMap, parsed.paths, new Set(['xpredicate']), ROOT);
    const keys = Object.keys(clean);
    expect(keys.some((k) => k.includes('xpredicate'))).toBe(false);
  });
});
