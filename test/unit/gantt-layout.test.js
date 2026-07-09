import { describe, test, expect } from 'vitest';
import { parseSeries, buildLatencyAndEdges, computeCleanEdges } from '../../graphs/common/path-metrics.js';
import { computeGanttLayout, barColor } from '../../graphs/gantt/layout.js';

const frame = (name, value) => ({ name, fields: [{ type: 'time', values: [0] }, { type: 'number', values: [value] }] });
const ROOT = 'FLOW_START';
const SINK = 'setresults';

function layoutFor(paths) {
  const parsed = parseSeries(paths.map(([n, v]) => frame(n, v)), ROOT);
  const { nodeLat, edgeMap } = buildLatencyAndEdges(parsed, ROOT);
  const clean = computeCleanEdges(edgeMap, parsed.paths, new Set(), ROOT);
  return computeGanttLayout({ paths: parsed.paths, nodeLat, cleanEdges: clean, root: ROOT, sink: SINK });
}

describe('barColor', () => {
  test('root and sink use the meta color', () => {
    expect(barColor('FLOW_START', { root: ROOT, sink: SINK, critSet: new Set(), nodeLat: {} })).toBe('#69db7c');
    expect(barColor('setresults', { root: ROOT, sink: SINK, critSet: new Set(), nodeLat: {} })).toBe('#69db7c');
  });
  test('a critical node uses the crit color', () => {
    expect(barColor('x', { root: ROOT, sink: SINK, critSet: new Set(['x']), nodeLat: { x: 5 } })).toBe('#ff6b6b');
  });
  test('a critical node with zero latency still uses the crit color', () => {
    // the > 0 guard was removed so the whole critical chain colors, even a 0 ms intermediate
    expect(barColor('x', { root: ROOT, sink: SINK, critSet: new Set(['x']), nodeLat: { x: 0 } })).toBe('#ff6b6b');
  });
  test('a predicate node uses the gate color', () => {
    expect(barColor('xpredicate', { root: ROOT, sink: SINK, critSet: new Set(), nodeLat: {} })).toBe('#74c0fc');
  });
});

describe('computeGanttLayout', () => {
  test('assigns one bar per node with contiguous row indices', () => {
    const r = layoutFor([['a_b_c', 30], ['a_d_c', 20]]);
    const rows = r.bars.map((b) => b.row).sort((x, y) => x - y);
    expect(rows).toEqual(rows.map((_, i) => i));
    expect(r.barByName.a).toBeDefined();
  });
  test('bar duration equals node latency and end equals start + duration', () => {
    const r = layoutFor([['a_b_c', 30], ['a_d_c', 20]]);
    for (const b of r.bars) {
      expect(b.end - b.start).toBeCloseTo(b.duration, 6);
      expect(b.start).toBeGreaterThanOrEqual(0);
    }
  });
  test('every non-root bar has a binding parent (full connectivity)', () => {
    const r = layoutFor([['a_b_c', 30], ['a_d_c', 20]]);
    const root = r.bars.find((b) => b.row === 0);
    for (const b of r.bars) {
      if (b.name === root.name) continue;
      expect(b.parent).toBeTruthy();
      expect(r.barByName[b.parent]).toBeDefined();
    }
  });
  test('reports a critical path derived from the schedule', () => {
    const r = layoutFor([['a_b_c', 30], ['a_d_c', 20]]);
    // critical path starts at the root, ends at the last-finishing node, and its
    // total equals that node's scheduled end
    expect(r.critChain[0]).toBe(ROOT);
    const last = r.critChain[r.critChain.length - 1];
    expect(r.critSet.has(last)).toBe(true);
    expect(r.critTotal).toBeCloseTo(r.barByName[last].end, 6);
    for (const n of r.critChain) expect(r.critSet.has(n)).toBe(true);
  });
  test('terminates on a cyclic input (retry loop)', () => {
    const r = layoutFor([['a_b_a_c', 40], ['a_x_c', 10]]);
    expect(r.bars.length).toBeGreaterThan(0);
  });
});
