import { describe, test, expect } from 'vitest';
import { Gantt } from '../graphs/gantt/index.js';
import { buildContext } from './helpers/build-context.js';
import { CASES } from './helpers/cases.js';

const BUDGET_MS = 2000;

function summarize(series) {
  const start = performance.now();
  const option = Gantt.render(buildContext(series), {});
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
    const option = Gantt.render(buildContext([['solo', 5]]), {});
    expect(option.title.text).toBe('No data');
  });

  test('terminates on a cyclic captured graph within budget', () => {
    const r = summarize(CASES.captured());
    expect(r.barCount).toBeGreaterThanOrEqual(20);
    expect(r.ms).toBeLessThan(BUDGET_MS);
  });

  test('no two overlapping dependency arrows share a lane within a column', () => {
    const r = summarize(CASES.captured());
    const arrows = r.option.series[0].data.map((d) => d.value); // [srcEnd, srcRow, tgtStart, tgtRow, lane, isCrit]
    for (let i = 0; i < arrows.length; i++) {
      for (let j = i + 1; j < arrows.length; j++) {
        const [, si, ti, ri, li] = arrows[i];
        const [, sj, tj, rj, lj] = arrows[j];
        if (li !== lj || ti !== tj) continue;
        const aTop = Math.min(si, ri);
        const aBot = Math.max(si, ri);
        const bTop = Math.min(sj, rj);
        const bBot = Math.max(sj, rj);
        expect(aTop <= bBot && bTop <= aBot).toBe(false);
      }
    }
  });
});
