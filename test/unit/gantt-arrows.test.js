import { describe, test, expect } from 'vitest';
import { buildArrows, assignChannels } from '../../graphs/gantt/arrows.js';

// Minimal bar map: name -> { row, start, end, parent }
function bar(name, row, start, end, parent) {
  return { name, row, start, end, duration: end - start, parent, depth: 0, isCrit: false, color: '#000' };
}

describe('buildArrows', () => {
  test('creates one arrow per non-root node, from its binding parent', () => {
    const barByName = { a: bar('a', 0, 0, 10), b: bar('b', 1, 10, 20, 'a') };
    const arrows = buildArrows(barByName, { a: 0, b: 1 }, new Set());
    expect(arrows.length).toBe(1);
    expect(arrows[0]).toMatchObject({
      source: 'a',
      target: 'b',
      srcStart: 0,
      srcEnd: 10,
      srcRow: 0,
      tgtStart: 10,
      tgtRow: 1,
    });
  });
  test('falls back to the nearest scheduled predecessor when a node has no parent', () => {
    // b has no parent; a ends (10) at or before b starts (10) -> a becomes the source
    const barByName = { a: bar('a', 0, 0, 10), b: bar('b', 1, 10, 20) };
    const arrows = buildArrows(barByName, { a: 0, b: 1 }, new Set());
    expect(arrows.length).toBe(1);
    expect(arrows[0]).toMatchObject({ source: 'a', target: 'b', srcEnd: 10, tgtStart: 10 });
  });
  test('marks an arrow critical only when both endpoints are on the critical path', () => {
    const barByName = { a: bar('a', 0, 0, 10), b: bar('b', 1, 10, 20, 'a') };
    const arrows = buildArrows(barByName, { a: 0, b: 1 }, new Set(['a', 'b']));
    expect(arrows[0].isCrit).toBe(true);
  });
});

describe('assignChannels', () => {
  const arrow = (source, srcRow, tgtStart, tgtRow) => ({
    source,
    target: 't' + tgtRow,
    srcStart: 0,
    srcEnd: 0,
    srcRow,
    tgtStart,
    tgtRow,
    isCrit: false,
    bucket: 0,
    lane: 0,
  });

  test('edges from one source into the same column collapse to a single spine (lane 0)', () => {
    // a star from FLOW_START to many t=0 targets should share one channel
    const arrows = [arrow('root', 0, 0, 1), arrow('root', 0, 0, 2), arrow('root', 0, 0, 3)];
    assignChannels(arrows);
    expect(arrows.map((a) => a.lane)).toEqual([0, 0, 0]);
  });
  test('distinct sources into the same column get adjacent lanes', () => {
    const arrows = [arrow('a', 0, 5, 3), arrow('b', 1, 5, 4)];
    assignChannels(arrows);
    expect(arrows[0].lane).not.toBe(arrows[1].lane);
  });
  test('different target columns are numbered independently (each starts at lane 0)', () => {
    const arrows = [arrow('a', 0, 5, 3), arrow('b', 1, 9, 4)];
    assignChannels(arrows);
    expect(arrows[0].lane).toBe(0);
    expect(arrows[1].lane).toBe(0);
  });
  test('lane numbering is deterministic (ordered by source row)', () => {
    const arrows = [arrow('late', 5, 5, 6), arrow('early', 1, 5, 2)];
    assignChannels(arrows);
    const byName = Object.fromEntries(arrows.map((a) => [a.source, a.lane]));
    expect(byName.early).toBe(0);
    expect(byName.late).toBe(1);
  });
});
