import { describe, test, expect } from 'vitest';
import { buildArrows, assignChannels } from '../../graphs/gantt/arrows.js';

// Minimal bar map: name -> { row, start, end, shift }
function bar(name, row, start, end, shift = 0) {
  return { name, row, start, end, duration: end - start, depth: 0, shift, isCrit: false, color: '#000' };
}

describe('buildArrows', () => {
  test('creates one arrow per edge whose endpoints both have bars', () => {
    const barByName = { a: bar('a', 0, 0, 10), b: bar('b', 1, 10, 20) };
    const arrows = buildArrows({ a__b: 20, a__missing: 5 }, barByName, { a: 0, b: 1 }, new Set());
    expect(arrows.length).toBe(1);
    expect(arrows[0]).toMatchObject({ source: 'a', target: 'b', srcEnd: 10, srcRow: 0, tgtStart: 10, tgtRow: 1 });
  });
  test('adds each bar shift into the arrow endpoints', () => {
    const barByName = { a: bar('a', 0, 0, 10, 2), b: bar('b', 1, 10, 20, 5) };
    const arrows = buildArrows({ a__b: 20 }, barByName, { a: 0, b: 1 }, new Set());
    expect(arrows[0].srcEnd).toBe(12); // 10 + 2
    expect(arrows[0].tgtStart).toBe(15); // 10 + 5
  });
  test('marks an arrow critical only when both endpoints are on the critical path', () => {
    const barByName = { a: bar('a', 0, 0, 10), b: bar('b', 1, 10, 20) };
    const arrows = buildArrows({ a__b: 20 }, barByName, { a: 0, b: 1 }, new Set(['a', 'b']));
    expect(arrows[0].isCrit).toBe(true);
  });
});

describe('assignChannels', () => {
  test('gives overlapping arrows in the same bucket distinct lanes', () => {
    const arrows = [
      { source: 'a', target: 'z', srcEnd: 0, srcRow: 0, tgtStart: 5, tgtRow: 4, isCrit: false, bucket: 1, lane: 0 },
      { source: 'b', target: 'z', srcEnd: 0, srcRow: 1, tgtStart: 5, tgtRow: 4, isCrit: false, bucket: 1, lane: 0 },
    ];
    assignChannels(arrows);
    expect(arrows[0].lane).not.toBe(arrows[1].lane);
  });
  test('lets non-overlapping arrows reuse lane 0', () => {
    const arrows = [
      { source: 'a', target: 'b', srcEnd: 0, srcRow: 0, tgtStart: 5, tgtRow: 1, isCrit: false, bucket: 1, lane: 9 },
      { source: 'c', target: 'd', srcEnd: 0, srcRow: 5, tgtStart: 5, tgtRow: 6, isCrit: false, bucket: 1, lane: 9 },
    ];
    assignChannels(arrows);
    expect(arrows[0].lane).toBe(0);
    expect(arrows[1].lane).toBe(0);
  });
  test('isolates buckets: same rows in different buckets both get lane 0', () => {
    const arrows = [
      { source: 'a', target: 'x', srcEnd: 0, srcRow: 0, tgtStart: 5, tgtRow: 3, isCrit: false, bucket: 1, lane: 0 },
      { source: 'b', target: 'y', srcEnd: 0, srcRow: 0, tgtStart: 9, tgtRow: 3, isCrit: false, bucket: 2, lane: 0 },
    ];
    assignChannels(arrows);
    expect(arrows[0].lane).toBe(0);
    expect(arrows[1].lane).toBe(0);
  });
  test('no two overlapping arrows in a bucket end up on the same lane', () => {
    const arrows = [];
    for (let i = 0; i < 6; i++) {
      arrows.push({ source: 's' + i, target: 'z', srcEnd: 0, srcRow: i, tgtStart: 5, tgtRow: 10, isCrit: false, bucket: 1, lane: 0 });
    }
    assignChannels(arrows);
    for (let i = 0; i < arrows.length; i++) {
      for (let j = i + 1; j < arrows.length; j++) {
        const aTop = Math.min(arrows[i].srcRow, arrows[i].tgtRow);
        const aBot = Math.max(arrows[i].srcRow, arrows[i].tgtRow);
        const bTop = Math.min(arrows[j].srcRow, arrows[j].tgtRow);
        const bBot = Math.max(arrows[j].srcRow, arrows[j].tgtRow);
        if (aTop <= bBot && bTop <= aBot) expect(arrows[i].lane).not.toBe(arrows[j].lane);
      }
    }
  });
});
