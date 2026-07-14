// Semantic accent palette. These vivid hues read on both light and dark
// backgrounds. They are the DEFAULT accents; when a Grafana theme is present its
// semantic colors (error/warning/info/success) override them via pickTheme, so
// charts match the host brand. Kept here as the zero-config fallback.
export const COLORS = {
  crit: '#ff6b6b',
  dp: '#ffa94d',
  gate: '#74c0fc',
  meta: '#69db7c',
  dark: 'rgba(30,33,40,0.85)', // legacy alias; prefer ChartTheme.nodeEmpty
} as const;

// Theme-dependent colors. Semantic accents (crit/dp/gate/meta) plus chrome.
// Geometry lives in constants, never here: this interface is colors only.
export interface ChartTheme {
  // Semantic accents (default from COLORS; overridden by the Grafana theme).
  crit: string;
  dp: string;
  gate: string;
  meta: string;
  // Chrome.
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
  emphasisLabel: string; // label text on an emphasized/hovered node
  linkMuted: string;     // non-critical flow-graph edge
  successBg: string;     // toast background
  successText: string;   // toast text
  transparent: string;   // fully transparent fill (invisible hover edges)
}

const ACCENTS = { crit: COLORS.crit, dp: COLORS.dp, gate: COLORS.gate, meta: COLORS.meta };
const SHARED = {
  emphasisLabel: '#fff',
  successBg: 'rgba(40,167,69,0.9)',
  successText: '#fff',
  transparent: 'rgba(0,0,0,0)',
};

export const THEMES: { dark: ChartTheme; light: ChartTheme } = {
  dark: {
    ...ACCENTS,
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
    linkMuted: 'rgba(150,150,160,0.35)',
    ...SHARED,
  },
  light: {
    ...ACCENTS,
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
    linkMuted: 'rgba(150,150,160,0.35)',
    ...SHARED,
  },
};

export type ThemeName = 'light' | 'dark' | 'auto';

/**
 * Returns `color` at the given alpha as an rgba() string. Accepts #rgb, #rrggbb,
 * #rrggbbaa, rgb(), and rgba() inputs (Grafana colors may be any of these), so
 * accent tints can be derived from a single source color instead of hardcoding
 * each variant. Unrecognized formats (hsl(), var(), named colors) are returned
 * unchanged rather than mis-rendered.
 */
export function withAlpha(color: string, alpha: number): string {
  const c = color.trim();
  const short = /^#([0-9a-fA-F]{3})$/.exec(c);
  if (short) {
    const [r, g, b] = short[1].split('').map((h) => parseInt(h + h, 16));
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const long = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(c);
  if (long) {
    const n = parseInt(long[1].slice(0, 6), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }
  const rgb = /^rgba?\(([^)]+)\)$/.exec(c);
  if (rgb) {
    const [r, g, b] = rgb[1].split(',').map((s) => s.trim());
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return c;
}

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

// A Grafana color entry is either a hex/rgb string or a { main } object.
type GrafanaColorLike = string | { main?: string } | undefined;

// The subset of Grafana's theme object (GrafanaTheme2) that a Business Charts
// panel exposes via `context.grafana.theme`. Used to auto-match the host theme
// (light/dark) and its semantic accent colors.
export interface GrafanaThemeLike {
  isDark?: boolean;
  name?: string;
  colors?: {
    mode?: string;
    error?: GrafanaColorLike;
    warning?: GrafanaColorLike;
    info?: GrafanaColorLike;
    success?: GrafanaColorLike;
    primary?: GrafanaColorLike;
  };
}

function colorValue(c: GrafanaColorLike): string | undefined {
  if (!c) return undefined;
  if (typeof c === 'string') return c;
  return typeof c.main === 'string' ? c.main : undefined;
}

/** Maps Grafana semantic colors onto chart accents; empty when none are present. */
function grafanaAccents(g: GrafanaThemeLike): Partial<ChartTheme> {
  const c = g.colors;
  if (!c) return {};
  const out: Partial<ChartTheme> = {};
  const crit = colorValue(c.error);
  const dp = colorValue(c.warning);
  const gate = colorValue(c.info) || colorValue(c.primary);
  const meta = colorValue(c.success);
  if (crit) out.crit = crit;
  if (dp) out.dp = dp;
  if (gate) out.gate = gate;
  if (meta) out.meta = meta;
  return out;
}

// Picks the light/dark chrome preset (mode only).
function pickBase(optsTheme?: ThemeName, grafanaTheme?: GrafanaThemeLike, win?: any): ChartTheme {
  if (optsTheme) return resolveTheme(optsTheme, win);
  if (grafanaTheme) {
    if (typeof grafanaTheme.isDark === 'boolean') return grafanaTheme.isDark ? THEMES.dark : THEMES.light;
    const mode = grafanaTheme.colors && grafanaTheme.colors.mode;
    if (mode === 'light') return THEMES.light;
    if (mode === 'dark') return THEMES.dark;
  }
  return resolveTheme('auto', win);
}

/**
 * Chooses the render theme:
 *  1. mode (light/dark chrome) — explicit `theme` option wins, else the host
 *     Grafana mode (isDark / colors.mode), else `auto` (prefers-color-scheme);
 *  2. accents — overlaid from the Grafana theme's semantic colors when present,
 *     otherwise the default COLORS palette.
 * Returns the shared preset object unchanged (identity) when no Grafana accents
 * apply, so callers can rely on reference equality for the presets.
 */
export function pickTheme(optsTheme?: ThemeName, grafanaTheme?: GrafanaThemeLike, win?: any): ChartTheme {
  const base = pickBase(optsTheme, grafanaTheme, win);
  if (!grafanaTheme) return base;
  const accents = grafanaAccents(grafanaTheme);
  return Object.keys(accents).length ? { ...base, ...accents } : base;
}
