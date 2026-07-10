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
import { FlowGraph } from '../graphs/flow-graph/index.js';
import { renderSummary, buildContext } from './helpers/build-context.js';
import { CASES } from './helpers/cases.js';

const BUDGET_MS = 2000;

describe('FlowGraph.render', () => {
  test('renders a clean DAG', () => {
    const r = renderSummary(FlowGraph.render, CASES.dag());
    expect(r.nodeCount).toBeGreaterThanOrEqual(3);
    expect(r.drawnLinkCount).toBeGreaterThan(0);
  });

  test('terminates on a retry-loop path (repeated token)', () => {
    const r = renderSummary(FlowGraph.render, CASES.loop());
    expect(r.nodeCount).toBeGreaterThan(0);
    expect(r.ms).toBeLessThan(BUDGET_MS);
  });

  test('keeps both directions of a bidirectional edge', () => {
    const r = renderSummary(FlowGraph.render, CASES.bidir());
    expect(r.drawnEdges).toContain('a->b');
    expect(r.drawnEdges).toContain('b->a');
    expect(r.ms).toBeLessThan(BUDGET_MS);
  });

  test('renders the real captured graph (cyclic) and keeps the loop', () => {
    const r = renderSummary(FlowGraph.render, CASES.captured());
    expect(r.nodeCount).toBeGreaterThanOrEqual(20);
    // The anonymized retry loop (node4 <-> node16) must still be drawn.
    expect(r.drawnEdges).toContain('node4->node16');
    expect(r.drawnEdges).toContain('node16->node4');
    expect(r.ms).toBeLessThan(BUDGET_MS);
  });

  test('returns a units-required alert when units missing', () => {
    const option = FlowGraph.render(buildContext(CASES.dag()), {});
    expect(option.title.text).toBe('Set the "units" option to render this chart');
    const option2 = FlowGraph.render(buildContext(CASES.dag()), { units: '  ' });
    expect(option2.title.text).toBe('Set the "units" option to render this chart');
  });

  test('theme option flows to the tooltip background', () => {
    const dark = FlowGraph.render(buildContext(CASES.captured()), { units: 'ms', theme: 'dark' });
    const light = FlowGraph.render(buildContext(CASES.captured()), { units: 'ms', theme: 'light' });
    expect(dark.tooltip.backgroundColor).not.toBe(light.tooltip.backgroundColor);
  });
});
