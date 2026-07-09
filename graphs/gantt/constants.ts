export const GANTT_DEFAULTS = {
  root: 'FLOW_START',
  sink: 'setresults',
  percentileVar: '$percentile',
} as const;

// Pixel geometry used by the custom renderItem callbacks.
export const GANTT = {
  barHeight: 18,
  laneWidthPx: 9, // horizontal gap between stacked vertical arrow channels
  arrowHead: 8,
  stubPx: 4, // minimum horizontal run out of a bar before the vertical channel
  columnGapFrac: 0.1, // total x inflation (~10% of timeline) spread across depth levels
  arrow: 'rgba(140,145,155,0.32)',
  critArrow: 'rgba(255,107,107,0.9)',
  headMuted: 'rgba(150,155,165,0.6)',
} as const;
