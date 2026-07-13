import { showToast } from '../common/dom.js';
import { collectReachable } from '../common/graph.js';
import { iconButton, buttonOffset, togglePopover, createRangeFilterPopover } from '../common/controls.js';
import type { EChartsLike, NodeLatMap, AdjMap } from '../common/types.js';
import type { ChartTheme } from '../common/theme.js';

// Value-tuple channel indices shared with render-item.ts / options.ts.
export const BAR_NAME = 3;
export const BAR_OP = 7;
export const ARR_SRC_ROW = 1;
export const ARR_TGT_ROW = 3;
export const ARR_OP = 7;

const DIM_BAR = 0.12;
const DIM_ARROW = 0.06;

/** Returns a copy of the bar data with the opacity channel set from keep(name). */
export function withBarOpacity(data: any[], keep: (name: string) => boolean): any[] {
  return data.map((d) => {
    const v = d.value.slice();
    v[BAR_OP] = keep(v[BAR_NAME]) ? 1 : DIM_BAR;
    return { name: d.name, value: v };
  });
}

/** Returns a copy of the arrow data with the opacity channel set from keepArrow(value). */
export function withArrowOpacity(data: any[], keepArrow: (v: any[]) => boolean): any[] {
  return data.map((d) => {
    const v = d.value.slice();
    v[ARR_OP] = keepArrow(v) ? 1 : DIM_ARROW;
    return { value: v };
  });
}

/**
 * Re-applies bar + arrow opacity to the chart. deps (series[0]) and heads
 * (series[2]) share the same arrow data; tasks (series[1]) are the bars.
 */
export function applyDim(
  chart: EChartsLike,
  barData: any[],
  arrowData: any[],
  keepBar: (name: string) => boolean,
  keepArrow: (v: any[]) => boolean,
): void {
  const bars = withBarOpacity(barData, keepBar);
  const arrows = withArrowOpacity(arrowData, keepArrow);
  chart.setOption({ series: [{ data: arrows }, { data: bars }, { data: arrows }] });
}

/** Restores full opacity by re-setting the original (opacity=1) data arrays. */
export function resetDim(chart: EChartsLike, barData: any[], arrowData: any[]): void {
  chart.setOption({ series: [{ data: arrowData }, { data: barData }, { data: arrowData }] });
}

export interface GanttControlsCtx {
  barData: any[];
  arrowData: any[];
  critSet: Set<string>;
  nodeLat: NodeLatMap;
  maxLat: number;
  buildMermaid: () => string;
  theme: ChartTheme;
}

// Maps a row index to its task name, for arrow endpoint filtering.
export function rowNameMap(barData: any[]): Map<number, string> {
  const m = new Map<number, string>();
  for (const d of barData) m.set(d.value[2] as number, d.value[3] as string);
  return m;
}

/** The hovered node plus every recursive ancestor and descendant. */
export function hoverFamily(name: string, fwd: AdjMap, bwd: AdjMap): Set<string> {
  const ancestors = new Set<string>();
  collectReachable(name, bwd, ancestors); // ancestors (+ name)
  const descendants = new Set<string>();
  collectReachable(name, fwd, descendants); // descendants (+ name)
  return new Set([...ancestors, ...descendants]);
}

export interface GanttHoverCtx {
  chart: EChartsLike;
  barData: any[];
  arrowData: any[];
  fwd: AdjMap;
  bwd: AdjMap;
}

/**
 * Manual adjacency focus for the Gantt custom series: hovering a bar keeps its
 * recursive parents and children fully opaque and dims everything else.
 * Restores on mouseout. No-op when the chart has no event support.
 */
export function setupGanttHover(ctx: GanttHoverCtx): void {
  const { chart, barData, arrowData, fwd, bwd } = ctx;
  if (!chart.on) return;
  const rowName = rowNameMap(barData);
  chart.on('mouseover', (p: any) => {
    if (!p || p.seriesName !== 'tasks' || !p.value) return;
    const name = p.value[BAR_NAME] as string;
    const fam = hoverFamily(name, fwd, bwd);
    const keepBar = (n: string) => fam.has(n);
    const keepArrow = (v: any[]) => fam.has(rowName.get(v[ARR_SRC_ROW]) || '') && fam.has(rowName.get(v[ARR_TGT_ROW]) || '');
    applyDim(chart, barData, arrowData, keepBar, keepArrow);
  });
  chart.on('mouseout', () => {
    resetDim(chart, barData, arrowData);
  });
}

// Manual node-type legend as a graphic group (Gantt custom series have no categories).
export function buildGanttLegend(theme: ChartTheme): any {
  const rows = [
    { c: theme.crit, t: 'Critical' },
    { c: theme.gate, t: 'Gate' },
    { c: theme.dp, t: 'Data provider' },
    { c: theme.meta, t: 'Flow start/sink' },
  ];
  // Horizontal legend centered under the plot area (see the grid bottom offset).
  const children: any[] = [];
  let x = 0;
  for (const r of rows) {
    children.push({ type: 'rect', shape: { x, y: 0, width: 10, height: 10, r: 2 }, style: { fill: r.c } });
    children.push({ type: 'text', style: { x: x + 15, y: 5, text: r.t, fill: theme.textMuted, fontSize: 10, textVerticalAlign: 'middle' } });
    x += 15 + r.t.length * 6.2 + 20; // advance past the swatch, label, and a gap
  }
  return { type: 'group', left: 'center', bottom: 8, z: 100, children };
}

// Range-input popover for the min-% duration filter. Returns the element (hidden until toggled).
export function setupGanttSlider(chart: EChartsLike, ctx: GanttControlsCtx): HTMLElement | null {
  const { barData, arrowData, critSet, nodeLat, maxLat, theme } = ctx;
  const rowName = rowNameMap(barData);
  return createRangeFilterPopover(chart, theme, 'gantt-lat-slider', (pct, setLabel) => {
    const threshold = (pct / 100) * maxLat;
    setLabel('Min: ' + pct + '%');
    const keepBar = (n: string) => critSet.has(n) || (nodeLat[n] || 0) >= threshold;
    const keepArrow = (v: any[]) => keepBar(rowName.get(v[1]) || '') && keepBar(rowName.get(v[3]) || '');
    applyDim(chart, barData, arrowData, keepBar, keepArrow);
  });
}

export interface GanttControls {
  graphic: any[];
  sliderPopover: HTMLElement | null;
  copyGroup: any;
  critOnlyGroup: any;
  sliderGroup: any;
}

// Builds the full corner-widget set + legend. Mirrors flow-graph buildGraphicButtons.
export function buildGanttControls(chart: EChartsLike, ctx: GanttControlsCtx): GanttControls {
  const { barData, arrowData, critSet, buildMermaid, theme } = ctx;
  const container = chart.getDom();
  const rowName = rowNameMap(barData);
  const sliderPopover = setupGanttSlider(chart, ctx);
  let critOnly = false;
  const copyGroup = iconButton(theme, {
    right: buttonOffset(2),
    glyph: '📋',
    glyphColor: theme.buttonGlyph,
    glyphSize: 12,
    onclick: () => {
      navigator.clipboard.writeText(buildMermaid());
      showToast(container, 'Mermaid copied', theme);
    },
  });
  const critOnlyGroup = iconButton(theme, {
    right: buttonOffset(1),
    glyph: '⚡',
    glyphColor: theme.crit,
    glyphSize: 13,
    onclick: () => {
      critOnly = !critOnly;
      if (critOnly) {
        const keepArrow = (v: any[]) => critSet.has(rowName.get(v[1]) || '') && critSet.has(rowName.get(v[3]) || '');
        applyDim(chart, barData, arrowData, (n) => critSet.has(n), keepArrow);
      } else {
        resetDim(chart, barData, arrowData);
      }
    },
  });
  const sliderGroup = iconButton(theme, {
    right: buttonOffset(0),
    glyph: '◔',
    glyphColor: theme.dp,
    glyphSize: 14,
    onclick: () => togglePopover(sliderPopover),
  });
  return { graphic: [buildGanttLegend(theme), copyGroup, critOnlyGroup, sliderGroup], sliderPopover, copyGroup, critOnlyGroup, sliderGroup };
}
