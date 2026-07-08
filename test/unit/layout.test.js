import { describe, test, expect } from 'vitest';
import { parseSeries, buildLatencyAndEdges, findCriticalPath, computeCleanEdges } from '../../graphs/flow-graph/data.js';
import { computeLayout, semanticBand } from '../../graphs/flow-graph/layout.js';

const frame = (name, value) => ({ name, fields: [{ type: 'time', values: [0] }, { type: 'number', values: [value] }] });
const ROOT = 'FLOW_START';
const SINK = 'setresults';

function layoutFor(paths) {
  const parsed = parseSeries(paths.map(([n, v]) => frame(n, v)), ROOT);
  const { nodeLat, edgeMap } = buildLatencyAndEdges(parsed, ROOT);
  const crit = findCriticalPath(parsed.paths, nodeLat, ROOT);
  const clean = computeCleanEdges(edgeMap, parsed.paths, new Set(), ROOT);
  return computeLayout({ paths: parsed.paths, nodeLat, cleanEdges: clean, critSet: crit.critSet, root: ROOT, sink: SINK, width: 1200, height: 700, nodeSpacing: 52 });
}

describe('semanticBand', () => {
  test('orders root < predicate < normal < sink', () => {
    expect(semanticBand('FLOW_START', ROOT, SINK)).toBe(0);
    expect(semanticBand('xpredicate', ROOT, SINK)).toBe(1);
    expect(semanticBand('x', ROOT, SINK)).toBe(2);
    expect(semanticBand('setresults', ROOT, SINK)).toBe(3);
  });
});

describe('computeLayout', () => {
  test('produces finite depths and positions for a DAG', () => {
    const r = layoutFor([['a_b_c', 30], ['a_d_c', 20]]);
    expect(Number.isFinite(r.maxDepth)).toBe(true);
    expect(r.nodePos.a).toBeDefined();
    expect(Number.isFinite(r.nodePos.a.x)).toBe(true);
  });
  test('terminates on a cyclic input (retry loop)', () => {
    const r = layoutFor([['a_b_a_c', 40], ['a_x_c', 10]]);
    expect(Number.isFinite(r.maxDepth)).toBe(true);
  });
});
