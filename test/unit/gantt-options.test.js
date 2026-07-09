import { describe, test, expect } from 'vitest';
import { assembleGanttOption, buildGanttTooltip } from '../../graphs/gantt/options.js';

const bars = [
  { name: 'a', row: 0, start: 0, end: 10, duration: 10, depth: 0, isCrit: true, color: '#f00' },
  { name: 'b', row: 1, start: 10, end: 25, duration: 15, depth: 1, isCrit: true, color: '#f00' },
];
const arrows = [
  { source: 'a', target: 'b', srcStart: 0, srcEnd: 10, srcRow: 0, tgtStart: 10, tgtRow: 1, isCrit: true, bucket: 1, lane: 0 },
];

describe('assembleGanttOption', () => {
  test('produces a value x-axis with visible time labels, banded category y-axis, and three custom layers', () => {
    const opt = assembleGanttOption({ bars, arrows, rowNames: ['a', 'b'], subtext: 's', formatter: () => '', units: 'ms' });
    expect(opt.xAxis.type).toBe('value');
    expect(opt.xAxis.min).toBeLessThan(0); // left gutter for arrowheads at t=0
    expect(opt.xAxis.axisLabel.show).toBe(true); // real-time ms axis is labeled
    expect(opt.xAxis.name).toBe('time (ms) →');
    expect(opt.xAxis.name).not.toContain('cumulative');
    expect(opt.yAxis.type).toBe('category');
    expect(opt.yAxis.data).toEqual(['a', 'b']);
    expect(opt.yAxis.splitArea.show).toBe(true);
    expect(opt.series.length).toBe(3);
    expect(opt.series.map((s) => s.name)).toEqual(['deps', 'tasks', 'heads']);
  });
  test('bar data carries true ms start/end + duration; arrow data passes through with srcStart', () => {
    const opt = assembleGanttOption({ bars, arrows, rowNames: ['a', 'b'], subtext: 's', formatter: () => '', units: 'ms' });
    const tasks = opt.series.find((s) => s.name === 'tasks');
    expect(tasks.data[0].value).toEqual([0, 10, 0, 'a', '#f00', 10, 'ms']); // start, end, row, name, color, durationMs, units
    expect(tasks.data[1].value).toEqual([10, 25, 1, 'b', '#f00', 15, 'ms']);
    const deps = opt.series.find((s) => s.name === 'deps');
    expect(deps.data[0].value).toEqual([10, 0, 10, 1, 0, 1, 0]); // srcEnd, srcRow, tgtStart, tgtRow, lane, isCrit, srcStart
  });
});

describe('buildGanttTooltip', () => {
  test('reports true duration and start/end for a bar', () => {
    const fmt = buildGanttTooltip({ barByName: { a: bars[0] }, critTotal: 25, pctl: '95', units: 'ms' });
    const html = fmt({ name: 'a' });
    expect(html).toContain('a');
    expect(html).toContain('10');
  });
});
