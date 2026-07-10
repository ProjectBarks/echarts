import { describe, test, expect } from 'vitest';
import { Gantt } from '../graphs/gantt/index.js';
import { buildContext } from './helpers/build-context.js';
import { CASES } from './helpers/cases.js';

const BUDGET_MS = 2000;

function summarize(series, opts = { units: 'ms' }) {
  const start = performance.now();
  const option = Gantt.render(buildContext(series), opts);
  const ms = performance.now() - start;
  const bars = (option.series && option.series[1] && option.series[1].data) || [];
  const arrows = (option.series && option.series[0] && option.series[0].data) || [];
  return { ms, option, barCount: bars.length, arrowCount: arrows.length };
}

describe('Gantt.render', () => {
  test('renders a bar per task and dependency arrows for a clean DAG', () => {
    const r = summarize(CASES.dag());
    expect(r.barCount).toBeGreaterThanOrEqual(3);
    expect(r.arrowCount).toBeGreaterThan(0);
    expect(r.option.yAxis.type).toBe('category');
  });

  test('returns a No data option when there are no paths', () => {
    const option = Gantt.render(buildContext([['solo', 5]]), { units: 'ms' });
    expect(option.title.text).toBe('No data');
  });

  test('returns a units-required alert when units is missing or blank', () => {
    const r = summarize(CASES.captured(), {});
    expect(r.option.title.text).toBe('Set the "units" option to render this chart');
    const r2 = summarize(CASES.captured(), { units: '  ' });
    expect(r2.option.title.text).toBe('Set the "units" option to render this chart');
  });

  test('theme option flows to the tooltip background', () => {
    const dark = summarize(CASES.captured(), { units: 'ms', theme: 'dark' }).option;
    const light = summarize(CASES.captured(), { units: 'ms', theme: 'light' }).option;
    expect(dark.tooltip.backgroundColor).not.toBe(light.tooltip.backgroundColor);
  });

  test('infers theme from the Grafana context when no theme option is given', () => {
    const ctxLight = buildContext(CASES.captured());
    ctxLight.grafana.theme = { isDark: false };
    const light = Gantt.render(ctxLight, { units: 'ms' });
    const ctxDark = buildContext(CASES.captured());
    ctxDark.grafana.theme = { isDark: true };
    const dark = Gantt.render(ctxDark, { units: 'ms' });
    expect(light.tooltip.backgroundColor).not.toBe(dark.tooltip.backgroundColor);
  });

  test('terminates on a cyclic captured graph within budget', () => {
    const r = summarize(CASES.captured());
    expect(r.barCount).toBeGreaterThanOrEqual(20);
    expect(r.ms).toBeLessThan(BUDGET_MS);
  });

  test('arrows sharing a lane within a column share a source (bus spine, not a collision)', () => {
    // Under source-grouped bus routing, edges into the same target column share a
    // vertical channel only when they come from the same source (one spine). Two
    // DIFFERENT sources into the same column must land on different lanes so their
    // channels do not silently merge into one misleading line.
    const r = summarize(CASES.captured());
    // value = [srcEnd, srcRow, tgtStart, tgtRow, lane, isCrit, srcStart]
    const arrows = r.option.series[0].data.map((d) => d.value);
    for (let i = 0; i < arrows.length; i++) {
      for (let j = i + 1; j < arrows.length; j++) {
        const [se_i, sri, ti, , li, , ss_i] = arrows[i];
        const [se_j, srj, tj, , lj, , ss_j] = arrows[j];
        if (li !== lj || ti !== tj) continue; // only compare same lane + same column
        // same lane + same column => must be the same source (same row and span)
        expect(sri).toBe(srj);
        expect(se_i).toBe(se_j);
        expect(ss_i).toBe(ss_j);
      }
    }
  });
});
