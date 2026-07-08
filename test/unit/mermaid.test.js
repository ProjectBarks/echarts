import { describe, test, expect } from 'vitest';
import { buildMermaid } from '../../graphs/flow-graph/mermaid.js';

describe('buildMermaid', () => {
  test('emits a flowchart with nodes, edges, and a crit class', () => {
    const md = buildMermaid({ a: 5, b: 10 }, { a__b: 10 }, new Set(['a', 'b']));
    expect(md.startsWith('flowchart LR')).toBe(true);
    expect(md).toContain('a ==> b'); // critical edge uses thick arrow
    expect(md).toContain('classDef crit');
  });
});
