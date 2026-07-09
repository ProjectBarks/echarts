export const GANTT_DEFAULTS = {
  root: 'FLOW_START',
  sink: 'setresults',
  percentileVar: '$percentile',
} as const;

// Pixel geometry used by the custom renderItem callbacks.
export const GANTT = {
  barHeight: 18,
  laneWidthPx: 9, // horizontal gap between stacked vertical arrow channels
  approachPx: 26, // min horizontal stub into the target's start (end of line) - must be
  // longer than exitPx to seat the arrowhead
  exitPx: 8, // min horizontal stub out of the source's front (start of line) - kept short
  arrowHead: 8,
  minBarPx: 11, // smallest rendered bar width so sub-millisecond tasks stay visible
  arrow: 'rgba(140,145,155,0.32)',
  critArrow: 'rgba(255,107,107,0.9)',
  headMuted: 'rgba(150,155,165,0.6)',
} as const;
