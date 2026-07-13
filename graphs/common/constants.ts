// Cross-chart constants shared by both renderers. Keeping these in common/
// prevents gantt/ from importing flow-graph/ (and vice versa) for values that
// belong to neither chart specifically.

/** Graph identity + percentile defaults shared by flow-graph and gantt. */
export const GRAPH_DEFAULTS = {
  root: 'FLOW_START',
  sink: 'setresults',
  percentileVar: '$percentile',
} as const;

/** Corner icon-button geometry (square size + gap between stacked buttons). */
export const ICON = { size: 22, gap: 6 } as const;
