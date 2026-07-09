import { describe, test, expect } from 'vitest';
import { parseSeries, buildLatencyAndEdges, findCriticalPath, computeCleanEdges } from '../../graphs/common/path-metrics.js';
import { computeGanttLayout, barColor } from '../../graphs/gantt/layout.js';

const frame = (name, value) => ({ name, fields: [{ type: 'time', values: [0] }, { type: 'number', values: [value] }] });
const ROOT = 'FLOW_START';
const SINK = 'setresults';

function layoutFor(paths) {
  const parsed = parseSeries(paths.map(([n, v]) => frame(n, v)), ROOT);
  const { nodeLat, edgeMap } = buildLatencyAndEdges(parsed, ROOT);
  const crit = findCriticalPath(parsed.paths, nodeLat, ROOT);
  const clean = computeCleanEdges(edgeMap, parsed.paths, new Set(), ROOT);
  return computeGanttLayout({ paths: parsed.paths, nodeLat, cleanEdges: clean, critSet: crit.critSet, root: ROOT, sink: SINK });
}

describe('barColor', () => {
  test('root and sink use the meta color', () => {
    expect(barColor('FLOW_START', { root: ROOT, sink: SINK, critSet: new Set(), nodeLat: {} })).toBe('#69db7c');
    expect(barColor('setresults', { root: ROOT, sink: SINK, critSet: new Set(), nodeLat: {} })).toBe('#69db7c');
  });
  test('a critical node with latency uses the crit color', () => {
    expect(barColor('x', { root: ROOT, sink: SINK, critSet: new Set(['x']), nodeLat: { x: 5 } })).toBe('#ff6b6b');
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
  test('bars are ordered by start time', () => {
    const r = layoutFor([['a_b_c', 30], ['a_d_c', 20]]);
    const byRow = [...r.bars].sort((x, y) => x.row - y.row);
    for (let i = 1; i < byRow.length; i++) {
      expect(byRow[i].start).toBeGreaterThanOrEqual(byRow[i - 1].start);
    }
  });
  test('terminates on a cyclic input (retry loop)', () => {
    const r = layoutFor([['a_b_a_c', 40], ['a_x_c', 10]]);
    expect(r.bars.length).toBeGreaterThan(0);
  });
  test('applies a positive forward shift that grows with depth', () => {
    const r = layoutFor([['a_b_c', 30], ['a_d_c', 20]]);
    expect(r.gapMs).toBeGreaterThan(0);
    for (const b of r.bars) expect(b.shift).toBeCloseTo(b.depth * r.gapMs, 6);
    const shiftedStart = (n) => r.barByName[n].start + r.barByName[n].shift;
    const shiftedEnd = (n) => r.barByName[n].end + r.barByName[n].shift;
    expect(shiftedStart('c')).toBeGreaterThan(shiftedEnd('b'));
  });
});
