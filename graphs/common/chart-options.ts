import type { ChartTheme } from './theme.js';

/** The themed tooltip option shared by both charts (confined, themed chrome). */
export function themedTooltip(theme: ChartTheme, formatter: (p: any) => string): Record<string, unknown> {
  return {
    confine: true,
    backgroundColor: theme.tooltipBg,
    borderColor: theme.tooltipBorder,
    textStyle: { color: theme.tooltipText, fontSize: 12 },
    formatter,
  };
}
