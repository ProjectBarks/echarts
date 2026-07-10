import { describe, test, expect } from 'vitest';
import { withBarOpacity, withArrowOpacity, applyDim } from '../../graphs/gantt/interactions.js';
import { THEMES } from '../../graphs/common/theme.js';

test('withBarOpacity dims bars whose name is not kept', () => {
  const data = [ { name: 'a', value: [0,1,0,'a','#f00',1,'ms',1] }, { name: 'b', value: [0,1,1,'b','#fa0',1,'ms',1] } ];
  const out = withBarOpacity(data, (n) => n === 'a');
  expect(out[0].value[7]).toBe(1);
  expect(out[1].value[7]).toBeLessThan(1);
  // original not mutated
  expect(data[1].value[7]).toBe(1);
});

test('applyDim setOption carries dimmed data into all three series', () => {
  const calls = [];
  const chart = { getDom: () => ({}), setOption: (o) => calls.push(o) };
  const bars = [ { name: 'a', value: [0,1,0,'a','#f00',1,'ms',1] } ];
  const arrows = [ { value: [1,0,1,1,0,0,0,1] } ];
  applyDim(chart, bars, arrows, () => false, () => false);
  const o = calls[0];
  expect(o.series.length).toBe(3);
  expect(o.series[1].data[0].value[7]).toBeLessThan(1); // bar dimmed
  expect(o.series[0].data[0].value[7]).toBeLessThan(1); // arrow dimmed (deps)
  expect(o.series[2].data[0].value[7]).toBeLessThan(1); // arrow dimmed (heads)
});

import { buildGanttControls, buildGanttLegend, rowNameMap } from '../../graphs/gantt/interactions.js';

test('legend lists the four node types', () => {
  const g = JSON.stringify(buildGanttLegend(THEMES.dark));
  expect(g).toContain('Critical');
  expect(g).toContain('Gate');
  expect(g).toContain('Data provider');
  expect(g).toContain('Flow start/sink');
});

test('legend text uses the theme muted color', () => {
  const g = JSON.stringify(buildGanttLegend(THEMES.light));
  expect(g).toContain(THEMES.light.textMuted);
});

test('copy button copies mermaid text and crit-only dims non-critical bars', () => {
  const container = document.createElement('div');
  const calls = [];
  const chart = { getDom: () => container, setOption: (o) => calls.push(o) };
  const barData = [ { name: 'c', value: [0,1,0,'c','#f00',1,'ms',1] }, { name: 'x', value: [0,1,1,'x','#fa0',1,'ms',1] } ];
  const arrowData = [ { value: [1,0,1,1,0,0,0,1] } ];
  let copied = '';
  const orig = navigator.clipboard;
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: (t) => { copied = t; return Promise.resolve(); } }, configurable: true });
  const ctrl = buildGanttControls(chart, { barData, arrowData, critSet: new Set(['c']), nodeLat: { c:1, x:1 }, maxLat: 1, buildMermaid: () => 'flowchart LR', theme: THEMES.dark });
  ctrl.copyGroup.onclick();
  expect(copied).toBe('flowchart LR');
  ctrl.critOnlyGroup.onclick();
  const last = calls[calls.length - 1];
  const bars = last.series[1].data;
  expect(bars.find((b) => b.value[3] === 'c').value[7]).toBe(1);
  expect(bars.find((b) => b.value[3] === 'x').value[7]).toBeLessThan(1);
  // toggling again restores full opacity
  ctrl.critOnlyGroup.onclick();
  const restored = calls[calls.length - 1];
  expect(restored.series[1].data.every((b) => b.value[7] === 1)).toBe(true);
  if (orig) Object.defineProperty(navigator, 'clipboard', { value: orig, configurable: true });
});

test('min-% slider dims bars below the duration threshold', () => {
  const container = document.createElement('div');
  const calls = [];
  const chart = { getDom: () => container, setOption: (o) => calls.push(o) };
  const barData = [ { name: 'big', value: [0,10,0,'big','#f00',10,'ms',1] }, { name: 'small', value: [0,1,1,'small','#fa0',1,'ms',1] } ];
  const arrowData = [];
  buildGanttControls(chart, { barData, arrowData, critSet: new Set(), nodeLat: { big:10, small:1 }, maxLat: 10, buildMermaid: () => '', theme: THEMES.dark });
  const slider = container.querySelector('.gantt-lat-slider input');
  slider.value = '30'; // threshold = 3ms
  slider.dispatchEvent(new Event('input'));
  const last = calls[calls.length - 1];
  const bars = last.series[1].data;
  expect(bars.find((b) => b.value[3] === 'big').value[7]).toBe(1);
  expect(bars.find((b) => b.value[3] === 'small').value[7]).toBeLessThan(1);
});
