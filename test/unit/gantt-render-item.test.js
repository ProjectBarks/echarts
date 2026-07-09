import { describe, test, expect } from 'vitest';
import { barRenderItem, arrowRenderItem, arrowHeadRenderItem } from '../../graphs/gantt/render-item.js';

// Mock ECharts custom-series api: coord scales x by 10, y by 20.
function mockApi(values) {
  return {
    value: (i) => values[i],
    coord: ([x, y]) => [x * 10, y * 20],
  };
}

describe('barRenderItem', () => {
  test('draws a rect with an inside label for a wide bar', () => {
    // value = [start, end, row, name, color]; width = (5-0)*10 = 50px >= 42 -> inside
    const g = barRenderItem({}, mockApi([0, 5, 1, 'x', '#abc']));
    expect(g.type).toBe('group');
    const rect = g.children[0];
    expect(rect.type).toBe('rect');
    expect(rect.shape.width).toBe(50);
    expect(rect.style.fill).toBe('#abc');
    const label = g.children[1];
    expect(label.type).toBe('text');
    expect(label.style.text).toBe('5 ms');
  });
  test('draws a diamond milestone for a zero-duration node', () => {
    const shape = barRenderItem({}, mockApi([3, 3, 0, 'FLOW_START', '#69db7c']));
    expect(shape.type).toBe('polygon');
    expect(shape.shape.points.length).toBe(4);
  });
});

describe('arrowRenderItem', () => {
  test('builds a 4-point elbow polyline', () => {
    // value = [srcEnd, srcRow, tgtStart, tgtRow, lane, isCrit]
    const line = arrowRenderItem({}, mockApi([1, 0, 5, 2, 0, 0]));
    expect(line.type).toBe('polyline');
    expect(line.shape.points.length).toBe(4);
  });
  test('uses the crit color and heavier weight when isCrit is 1', () => {
    const line = arrowRenderItem({}, mockApi([1, 0, 5, 2, 0, 1]));
    expect(line.style.stroke).toBe('rgba(255,107,107,0.9)');
    expect(line.style.lineWidth).toBeGreaterThan(1);
  });
});

describe('arrowHeadRenderItem', () => {
  test('builds a triangle at the target edge', () => {
    const head = arrowHeadRenderItem({}, mockApi([1, 0, 5, 2, 0, 1]));
    expect(head.type).toBe('polygon');
    expect(head.shape.points.length).toBe(3);
    expect(head.style.fill).toBe('rgba(255,107,107,0.9)');
  });
});
