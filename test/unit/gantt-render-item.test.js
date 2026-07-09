import { describe, test, expect } from 'vitest';
import { barRenderItem, arrowRenderItem, arrowHeadRenderItem } from '../../graphs/gantt/render-item.js';

// Mock ECharts custom-series api: coord scales x by 10, y by 20; band height 20.
function mockApi(values) {
  return {
    value: (i) => values[i],
    coord: ([x, y]) => [x * 10, y * 20],
    size: () => [0, 20],
  };
}

describe('barRenderItem', () => {
  test('draws a rect with an inside label for a wide bar', () => {
    // value = [start, end, row, name, color, durationMs]; width = (5-0)*10 = 50px >= 42 -> inside
    const g = barRenderItem({}, mockApi([0, 5, 1, 'x', '#abc', 5, 'ms']));
    expect(g.type).toBe('group');
    const rect = g.children[0];
    expect(rect.type).toBe('rect');
    expect(rect.shape.width).toBe(50);
    expect(rect.style.fill).toBe('#abc');
    const label = g.children[1];
    expect(label.type).toBe('text');
    expect(label.style.text).toBe('5 ms');
  });
  test('floors a zero-duration node to a visible min-width rect with no label', () => {
    const g = barRenderItem({}, mockApi([3, 3, 0, 'FLOW_START', '#69db7c', 0, 'ms']));
    expect(g.type).toBe('group');
    const rect = g.children[0];
    expect(rect.type).toBe('rect');
    expect(rect.shape.width).toBe(11); // GANTT.minBarPx floor keeps it visible
    expect(g.children.length).toBe(1); // zero duration -> no label
  });
});

describe('arrowRenderItem', () => {
  // value = [srcEnd, srcRow, tgtStart, tgtRow, lane, isCrit, srcStart]
  test('exits the source front and enters the target left edge with a single channel when there is room', () => {
    // source ends at x=10 (front floored to 11); target starts far right at x=100 -> room
    const line = arrowRenderItem({}, mockApi([1, 0, 10, 2, 0, 0, 0]));
    expect(line.type).toBe('polyline');
    expect(line.shape.points.length).toBe(4);
    // first point is the source front (right edge) at the row center, not the bottom
    expect(line.shape.points[0]).toEqual([11, 0]);
    // last point is the arrowhead at the target's left (start) edge
    expect(line.shape.points[3]).toEqual([100, 40]);
  });
  test('wraps with extra turns into the target left edge when the gap is tight', () => {
    // target starts at x=10 (=source finish, zero gap) -> no room, multi-turn wrap
    const line = arrowRenderItem({}, mockApi([1, 0, 1, 2, 0, 0, 0]));
    expect(line.shape.points.length).toBe(6);
    expect(line.shape.points[0]).toEqual([11, 0]); // still exits the source front
    expect(line.shape.points[5]).toEqual([10, 40]); // still ends at the target's start
  });
  test('uses the crit color and heavier weight when isCrit is 1', () => {
    const line = arrowRenderItem({}, mockApi([1, 0, 10, 2, 0, 1, 0]));
    expect(line.style.stroke).toBe('rgba(255,107,107,0.9)');
    expect(line.style.lineWidth).toBeGreaterThan(1);
  });
});

describe('arrowHeadRenderItem', () => {
  test('always points right into the target start (left) edge', () => {
    for (const v of [[1, 0, 10, 2, 0, 1, 0], [1, 0, 5, 2, 0, 0, 0]]) {
      const head = arrowHeadRenderItem({}, mockApi(v));
      expect(head.type).toBe('polygon');
      expect(head.shape.points.length).toBe(3);
      // tip is right of the base (arrow points right)
      expect(head.shape.points[0][0]).toBeGreaterThan(head.shape.points[1][0]);
    }
  });
});
