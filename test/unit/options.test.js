import { describe, test, expect } from 'vitest';
import { buildTooltipFormatter, assembleOption } from '../../graphs/flow-graph/options.js';

const ROOT = 'FLOW_START';
const SINK = 'setresults';

describe('buildTooltipFormatter', () => {
  test('formats a node tooltip with latency', () => {
    const fmt = buildTooltipFormatter({
      nodeLat: { a: 12 }, cumulLat: { a: 12 }, critSet: new Set(['a']),
      critTotal: 12, pctl: '95', hasTaskDurations: true, root: ROOT, sink: SINK,
    });
    const html = fmt({ dataType: 'node', name: 'a' });
    expect(html).toContain('12 ms');
  });
});

describe('assembleOption', () => {
  test('assembles a graph series option', () => {
    const opt = assembleOption({
      nodes: [{ name: 'a' }], links: [], cats: [], graphic: [],
      subtext: 'x', critColor: '#ff6b6b', formatter: () => '', legendData: [],
    });
    expect(opt.series[0].type).toBe('graph');
    expect(opt.series[0].data).toHaveLength(1);
  });
});
