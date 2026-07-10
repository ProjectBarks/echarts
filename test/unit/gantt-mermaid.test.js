import { describe, test, expect } from 'vitest';
import { buildGanttMermaid } from '../../graphs/gantt/mermaid.js';

describe('buildGanttMermaid', () => {
  test('emits a mermaid gantt diagram (not a flowchart) with crit tagging', () => {
    const bars = [
      { name: 'a', row: 0, start: 0, end: 10, duration: 10, depth: 0, isCrit: true, color: '#f00' },
      { name: 'b', row: 1, start: 10, end: 12, duration: 2, depth: 1, isCrit: false, color: '#fa0' },
    ];
    const md = buildGanttMermaid(bars, 'ms');
    expect(md.startsWith('gantt')).toBe(true);
    expect(md).not.toContain('flowchart');
    expect(md).toContain('dateFormat x');
    expect(md).toMatch(/a :crit, a, 0, 10/);
    expect(md).toMatch(/b :b, 10, 12/);
  });

  test('floors a zero-duration task to a visible 1-unit bar and sanitizes ids', () => {
    const bars = [{ name: 'x.y', row: 0, start: 5, end: 5, duration: 0, depth: 0, isCrit: false, color: '#69db7c' }];
    const md = buildGanttMermaid(bars, 'ms');
    expect(md).toContain('x.y :x_y, 5, 6');
  });
});
