import { describe, test, expect } from 'vitest';
import { hoverFamily, setupGanttHover } from '../../graphs/gantt/interactions.js';
import { buildAdjacency } from '../../graphs/common/graph.js';

test('hoverFamily returns the node plus all recursive ancestors and descendants', () => {
  const { fwd, bwd } = buildAdjacency(['a__b', 'b__c', 'b__d']);
  expect([...hoverFamily('b', fwd, bwd)].sort()).toEqual(['a', 'b', 'c', 'd']);
  expect([...hoverFamily('c', fwd, bwd)].sort()).toEqual(['a', 'b', 'c']);
  expect([...hoverFamily('a', fwd, bwd)].sort()).toEqual(['a', 'b', 'c', 'd']);
});

test('setupGanttHover dims non-family bars on mouseover and restores on mouseout', () => {
  const handlers = {};
  const calls = [];
  const chart = { getDom: () => document.createElement('div'), setOption: (o) => calls.push(o), on: (ev, h) => { handlers[ev] = h; } };
  const barData = [
    { name: 'a', value: [0,1,0,'a','#f00',1,'ms',1] },
    { name: 'b', value: [0,1,1,'b','#fa0',1,'ms',1] },
    { name: 'c', value: [0,1,2,'c','#fa0',1,'ms',1] },
    { name: 'd', value: [0,1,3,'d','#fa0',1,'ms',1] },
  ];
  const arrowData = [ { value: [1,0,0,1,0,0,0,1] } ]; // a(row0) -> b(row1)
  const { fwd, bwd } = buildAdjacency(['a__b', 'b__c', 'b__d']);
  setupGanttHover({ chart, barData, arrowData, fwd, bwd });
  handlers.mouseover({ seriesName: 'tasks', value: [0,1,2,'c','#fa0',1,'ms',1] }); // hover c -> family {a,b,c}
  const dim = calls[calls.length - 1];
  const bars = dim.series[1].data;
  expect(bars.find((x) => x.value[3] === 'c').value[7]).toBe(1);
  expect(bars.find((x) => x.value[3] === 'a').value[7]).toBe(1);
  expect(bars.find((x) => x.value[3] === 'b').value[7]).toBe(1);
  expect(bars.find((x) => x.value[3] === 'd').value[7]).toBeLessThan(1); // d not in family
  handlers.mouseout();
  const restored = calls[calls.length - 1];
  expect(restored.series[1].data.every((x) => x.value[7] === 1)).toBe(true);
});

test('setupGanttHover ignores non-tasks series events', () => {
  const handlers = {};
  const calls = [];
  const chart = { getDom: () => document.createElement('div'), setOption: (o) => calls.push(o), on: (ev, h) => { handlers[ev] = h; } };
  const { fwd, bwd } = buildAdjacency(['a__b']);
  setupGanttHover({ chart, barData: [{ name:'a', value:[0,1,0,'a','#f00',1,'ms',1] }], arrowData: [], fwd, bwd });
  handlers.mouseover({ seriesName: 'deps', value: [1,0,0,1,0,0,0,1] });
  expect(calls.length).toBe(0);
});
