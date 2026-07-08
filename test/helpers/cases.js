// Test cases for the flow graph, as lists of [seriesName, avgValue].
//
// Path series carry underscore-joined names (the graph topology); single-token
// series are per-task latencies. Names in the captured fixture are anonymized
// placeholders; the graph topology, including the retry-loop cycle that caused
// the hang, is preserved exactly.

import series from '../fixtures/flow-capture.series.json' with { type: 'json' };
import tasks from '../fixtures/flow-capture.tasks.json' with { type: 'json' };

// Real capture from a wide (12h) dashboard range. Contains a retry loop where
// two tasks reference each other (a `..._nodeX_nodeY_nodeX_...` path and an
// opposing `nodeY -> nodeX` edge), which is what made the DAG layout hang.
export function capturedSeries() {
  const paths = series.names.map((n, i) => [n, 100 + (i % 50)]);
  const perTask = tasks.rows.map((r) => [r.task, r.avg || 1]);
  return [...paths, ...perTask];
}

export const CASES = {
  // Clean DAG: two branches that reconverge. Always renders.
  dag: () => [
    ['a_b_c', 30],
    ['a_d_c', 20],
  ],
  // A single path that revisits a task (retry loop) -> cycle a<->b.
  loop: () => [
    ['a_b_a_c', 40],
    ['a_x_c', 10],
  ],
  // Two paths disagreeing on direction -> 2-cycle.
  bidir: () => [
    ['a_b', 30],
    ['b_a', 20],
  ],
  // The real (anonymized) capture.
  captured: () => capturedSeries(),
};
