// @vitest-environment jsdom
import { describe, test, expect, vi } from 'vitest';
import { setupSlider, buildGraphicButtons } from '../../graphs/flow-graph/interactions.js';
import { THEMES } from '../../graphs/common/theme.js';

function fakeChart() {
  const dom = document.createElement('div');
  return { getDom: () => dom, setOption: vi.fn() };
}

describe('setupSlider', () => {
  test('mounts a hidden slider popover into the chart DOM', () => {
    const chart = fakeChart();
    const el = setupSlider(chart, { fullNodes: [], fullLinks: [], nodeLat: {}, maxLat: 1, critSet: new Set(), root: 'FLOW_START', sink: 'setresults', theme: THEMES.dark });
    expect(el).toBeTruthy();
    expect(chart.getDom().querySelector('.lat-slider')).toBeTruthy();
  });
});

describe('buildGraphicButtons', () => {
  test('returns three graphic groups with onclick handlers', () => {
    const chart = fakeChart();
    const graphic = buildGraphicButtons(chart, {
      buildMermaid: () => 'flowchart LR', sliderPopover: document.createElement('div'),
      fullNodes: [], fullLinks: [], critOnlyNodes: [], critOnlyLinks: [], theme: THEMES.dark,
    });
    expect(graphic).toHaveLength(3);
    expect(typeof graphic[0].onclick).toBe('function');
  });
});
