import { describe, test, expect } from 'vitest';
import { nodeColor, buildNodes } from '../../graphs/flow-graph/nodes.js';
import { COLORS } from '../../graphs/flow-graph/constants.js';

const ROOT = 'FLOW_START';
const SINK = 'setresults';

describe('nodeColor', () => {
  test('root and sink use the meta color', () => {
    const ctx = { root: ROOT, sink: SINK, critSet: new Set(), nodeLat: {} };
    expect(nodeColor(ROOT, ctx)).toBe(COLORS.meta);
    expect(nodeColor(SINK, ctx)).toBe(COLORS.meta);
  });
  test('critical node with latency uses the crit color', () => {
    const ctx = { root: ROOT, sink: SINK, critSet: new Set(['a']), nodeLat: { a: 5 } };
    expect(nodeColor('a', ctx)).toBe(COLORS.crit);
  });
});

describe('buildNodes', () => {
  test('builds one ECharts node per latency entry with a fixed position', () => {
    const nodes = buildNodes(
      { a: 5, b: 10 },
      { nodePos: { a: { x: 1, y: 2 }, b: { x: 3, y: 4 } }, cumulLat: { a: 5, b: 15 }, maxCumul: 15, critSet: new Set(), nodeSize: 18, root: ROOT, sink: SINK },
    );
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({ name: expect.any(String), x: expect.any(Number), y: expect.any(Number), fixed: true });
  });
});
