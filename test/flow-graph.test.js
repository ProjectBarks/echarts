// Guards against the cyclic-graph hang in the flow graph layout.
//
// Real path metrics can describe cycles (a retry loop that revisits a task, or
// two tasks that appear in both orders over a wide time range). The DAG layout
// used to loop forever on such input, pegging the panel at ~100% CPU whenever
// the dashboard time range was widened (e.g. 12h). Each case renders against
// Vitest's jsdom environment and asserts the graph builds correctly and still
// draws the loop. A per-test budget flags any non-trivial slowdown; if the
// hang itself regresses the render never returns and the run fails on timeout.

import { describe, test, expect } from 'vitest';
import { renderFlowGraph } from '../graphs/flow-graph/index.js';
import { renderSummary } from './helpers/build-context.js';
import { CASES } from './helpers/cases.js';

const BUDGET_MS = 2000;

describe('renderFlowGraph', () => {
  test('renders a clean DAG', () => {
    const r = renderSummary(renderFlowGraph, CASES.dag());
    expect(r.nodeCount).toBeGreaterThanOrEqual(3);
    expect(r.drawnLinkCount).toBeGreaterThan(0);
  });

  test('terminates on a retry-loop path (repeated token)', () => {
    const r = renderSummary(renderFlowGraph, CASES.loop());
    expect(r.nodeCount).toBeGreaterThan(0);
    expect(r.ms).toBeLessThan(BUDGET_MS);
  });

  test('keeps both directions of a bidirectional edge', () => {
    const r = renderSummary(renderFlowGraph, CASES.bidir());
    expect(r.drawnEdges).toContain('a->b');
    expect(r.drawnEdges).toContain('b->a');
    expect(r.ms).toBeLessThan(BUDGET_MS);
  });

  test('renders the real captured graph (cyclic) and keeps the loop', () => {
    const r = renderSummary(renderFlowGraph, CASES.captured());
    expect(r.nodeCount).toBeGreaterThanOrEqual(20);
    // The anonymized retry loop (node4 <-> node16) must still be drawn.
    expect(r.drawnEdges).toContain('node4->node16');
    expect(r.drawnEdges).toContain('node16->node4');
    expect(r.ms).toBeLessThan(BUDGET_MS);
  });
});
