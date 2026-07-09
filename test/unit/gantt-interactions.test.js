import { describe, test, expect } from 'vitest';
import { withBarOpacity, withArrowOpacity, applyDim } from '../../graphs/gantt/interactions.js';

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
