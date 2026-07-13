export { COLORS } from '../common/theme.js';
export { ICON } from '../common/constants.js';
import { GRAPH_DEFAULTS } from '../common/constants.js';

export const DEFAULTS = {
  ...GRAPH_DEFAULTS,
  nodeSpacing: 52,
  nodeSize: 18,
} as const;
