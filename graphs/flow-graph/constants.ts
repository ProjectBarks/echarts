export const DEFAULTS = {
  root: 'FLOW_START',
  sink: 'setresults',
  nodeSpacing: 52,
  nodeSize: 18,
  percentileVar: '$percentile',
} as const;

export const COLORS = {
  crit: '#ff6b6b',
  dp: '#ffa94d',
  gate: '#74c0fc',
  meta: '#69db7c',
  dark: 'rgba(30,33,40,0.85)',
} as const;

export const ICON = { size: 22, gap: 6 } as const;
