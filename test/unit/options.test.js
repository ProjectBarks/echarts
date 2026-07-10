import { describe, test, expect } from 'vitest';
import { buildTooltipFormatter, assembleOption } from '../../graphs/flow-graph/options.js';
import { THEMES } from '../../graphs/common/theme.js';

const ROOT = 'FLOW_START';
const SINK = 'setresults';

describe('buildTooltipFormatter', () => {
  test('formats a node tooltip with latency', () => {
    const fmt = buildTooltipFormatter({
      nodeLat: { a: 12 }, cumulLat: { a: 12 }, critSet: new Set(['a']),
      critTotal: 12, pctl: '95', hasTaskDurations: true, root: ROOT, sink: SINK, units: 'ms', theme: THEMES.dark,
    });
    const html = fmt({ dataType: 'node', name: 'a' });
    expect(html).toContain('12 ms');
    expect(html).not.toContain('Cumulative');
  });
});

describe('assembleOption', () => {
  test('assembles a graph series option', () => {
    const opt = assembleOption({
      nodes: [{ name: 'a' }], links: [], cats: [], graphic: [],
      subtext: 'x', critColor: '#ff6b6b', formatter: () => '', legendData: [], theme: THEMES.dark,
    });
    expect(opt.series[0].type).toBe('graph');
    expect(opt.series[0].data).toHaveLength(1);
  });

  test('theme tokens flow into the flow-graph option chrome', () => {
    const baseArgs = {
      nodes: [{ name: 'a' }], links: [], cats: [], graphic: [],
      subtext: 'x', critColor: '#ff6b6b', formatter: () => '', legendData: [],
    };
    const optL = assembleOption({ ...baseArgs, theme: THEMES.light });
    const optD = assembleOption({ ...baseArgs, theme: THEMES.dark });
    expect(optL.tooltip.backgroundColor).toBe(THEMES.light.tooltipBg);
    expect(optD.tooltip.backgroundColor).toBe(THEMES.dark.tooltipBg);
    expect(optL.title.textStyle.color).toBe(THEMES.light.text);
  });
});
