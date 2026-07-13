export { GRAPH_DEFAULTS as GANTT_DEFAULTS } from '../common/constants.js';

// Pixel geometry used by the custom renderItem callbacks.
export const GANTT = {
  barHeight: 18,
  laneWidthPx: 9, // horizontal gap between stacked vertical arrow channels
  approachPx: 26, // min horizontal stub into the target's start (end of line) - must be
  // longer than exitPx to seat the arrowhead
  exitPx: 8, // min horizontal stub out of the source's front (start of line) - kept short
  arrowHead: 8,
  minBarPx: 11, // smallest rendered bar width so sub-millisecond tasks stay visible
} as const;
