// Semantic accent palette. These vivid hues read on both light and dark
// backgrounds and are intentionally theme-independent.
export const COLORS = {
  crit: '#ff6b6b',
  dp: '#ffa94d',
  gate: '#74c0fc',
  meta: '#69db7c',
  dark: 'rgba(30,33,40,0.85)', // legacy alias; prefer ChartTheme.nodeEmpty
} as const;

// Theme-dependent "chrome" colors (everything that is NOT a semantic accent).
export interface ChartTheme {
  text: string;
  textMuted: string;
  textFaint: string;
  alertText: string;
  axisLine: string;
  splitLine: string;
  bandA: string;
  bandB: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  buttonBg: string;
  buttonStroke: string;
  buttonGlyph: string;
  popoverBg: string;
  popoverBorder: string;
  arrow: string;
  arrowHead: string;
  nodeEmpty: string;
  barLabelInside: string;
  barLabelOutside: string;
  emphasisBorder: string;
}

export const THEMES: { dark: ChartTheme; light: ChartTheme } = {
  dark: {
    text: '#eee',
    textMuted: '#bbb',
    textFaint: '#888',
    alertText: '#ccc',
    axisLine: 'rgba(255,255,255,0.15)',
    splitLine: 'rgba(255,255,255,0.05)',
    bandA: 'rgba(255,255,255,0.015)',
    bandB: 'rgba(255,255,255,0.045)',
    tooltipBg: 'rgba(20,22,28,0.95)',
    tooltipBorder: 'rgba(255,255,255,0.1)',
    tooltipText: '#ddd',
    buttonBg: 'rgba(60,63,70,0.9)',
    buttonStroke: 'rgba(150,150,160,0.4)',
    buttonGlyph: '#aaa',
    popoverBg: 'rgba(30,33,40,0.95)',
    popoverBorder: 'rgba(150,150,160,0.3)',
    arrow: 'rgba(140,145,155,0.32)',
    arrowHead: 'rgba(150,155,165,0.6)',
    nodeEmpty: 'rgba(30,33,40,0.85)',
    barLabelInside: 'rgba(0,0,0,0.72)',
    barLabelOutside: '#8b909a',
    emphasisBorder: '#fff',
  },
  light: {
    text: '#1a1c22',
    textMuted: '#555',
    textFaint: '#777',
    alertText: '#555',
    axisLine: 'rgba(0,0,0,0.18)',
    splitLine: 'rgba(0,0,0,0.07)',
    bandA: 'rgba(0,0,0,0.015)',
    bandB: 'rgba(0,0,0,0.05)',
    tooltipBg: 'rgba(255,255,255,0.97)',
    tooltipBorder: 'rgba(0,0,0,0.12)',
    tooltipText: '#222',
    buttonBg: 'rgba(245,246,248,0.95)',
    buttonStroke: 'rgba(0,0,0,0.2)',
    buttonGlyph: '#555',
    popoverBg: 'rgba(250,250,252,0.97)',
    popoverBorder: 'rgba(0,0,0,0.2)',
    arrow: 'rgba(90,95,105,0.4)',
    arrowHead: 'rgba(80,85,95,0.7)',
    nodeEmpty: 'rgba(225,228,233,0.95)',
    barLabelInside: 'rgba(0,0,0,0.72)',
    barLabelOutside: '#666',
    emphasisBorder: '#333',
  },
};

export type ThemeName = 'light' | 'dark' | 'auto';

// Resolves a theme name to its token set. `auto` (the default) uses
// prefers-color-scheme when a matchMedia-capable object is available (browser),
// else falls back to dark.
export function resolveTheme(name: ThemeName = 'auto', win: any = (typeof globalThis !== 'undefined' ? globalThis : undefined)): ChartTheme {
  if (name === 'light') return THEMES.light;
  if (name === 'auto') {
    const mm = win && typeof win.matchMedia === 'function' ? win.matchMedia('(prefers-color-scheme: dark)') : null;
    return mm && mm.matches === false ? THEMES.light : THEMES.dark;
  }
  return THEMES.dark;
}

// The subset of Grafana's theme object (GrafanaTheme2) that a Business Charts
// panel exposes via `context.grafana.theme`. Used to auto-match the host theme.
export interface GrafanaThemeLike {
  isDark?: boolean;
  name?: string;
  colors?: { mode?: string };
}

/**
 * Chooses the render theme with this precedence:
 *  1. an explicit `theme` option ('light' | 'dark' | 'auto') always wins;
 *  2. otherwise the host Grafana theme when present (isDark, or colors.mode);
 *  3. otherwise `auto` (prefers-color-scheme, falling back to dark).
 */
export function pickTheme(optsTheme?: ThemeName, grafanaTheme?: GrafanaThemeLike, win?: any): ChartTheme {
  if (optsTheme) return resolveTheme(optsTheme, win);
  if (grafanaTheme) {
    if (typeof grafanaTheme.isDark === 'boolean') return grafanaTheme.isDark ? THEMES.dark : THEMES.light;
    const mode = grafanaTheme.colors && grafanaTheme.colors.mode;
    if (mode === 'light') return THEMES.light;
    if (mode === 'dark') return THEMES.dark;
  }
  return resolveTheme('auto', win);
}
