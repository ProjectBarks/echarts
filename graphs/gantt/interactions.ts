import { ICON } from '../flow-graph/constants.js';
import { COLORS } from '../common/theme.js';
import { createEl, showToast } from '../common/dom.js';
import type { EChartsLike, NodeLatMap } from '../common/types.js';

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
}

// Maps a row index to its task name, for arrow endpoint filtering.
export function rowNameMap(barData: any[]): Map<number, string> {
  const m = new Map<number, string>();
  for (const d of barData) m.set(d.value[2] as number, d.value[3] as string);
  return m;
}

// Manual node-type legend as a graphic group (Gantt custom series have no categories).
export function buildGanttLegend(): any {
  const rows = [
    { c: COLORS.crit, t: 'Critical' },
    { c: COLORS.gate, t: 'Gate' },
    { c: COLORS.dp, t: 'Data provider' },
    { c: COLORS.meta, t: 'Flow start/sink' },
  ];
  const children: any[] = [];
  rows.forEach((r, i) => {
    const y = i * 16;
    children.push({ type: 'rect', shape: { x: 0, y, width: 10, height: 10, r: 2 }, style: { fill: r.c } });
    children.push({ type: 'text', style: { x: 15, y: y + 5, text: r.t, fill: '#aaa', fontSize: 10, textVerticalAlign: 'middle' } });
  });
  return { type: 'group', right: 10, top: 8, z: 100, children };
}

function iconButton(rightOffset: number, glyph: string, glyphColor: string, glyphSize: number, onclick: () => void): any {
  return {
    type: 'group', right: rightOffset, bottom: 8, z: 100, onclick,
    children: [
      { type: 'rect', shape: { width: ICON.size, height: ICON.size, r: 4 }, style: { fill: 'rgba(60,63,70,0.9)', stroke: 'rgba(150,150,160,0.4)', lineWidth: 1 }, z2: 1 },
      { type: 'text', style: { text: glyph, x: ICON.size / 2, y: ICON.size / 2, fill: glyphColor, fontSize: glyphSize, textAlign: 'center', textVerticalAlign: 'middle' }, z2: 2 },
    ],
  };
}

// Range-input popover for the min-% duration filter. Returns the element (hidden until toggled).
export function setupGanttSlider(chart: EChartsLike, ctx: GanttControlsCtx): HTMLElement | null {
  const { barData, arrowData, critSet, nodeLat, maxLat } = ctx;
  const container = chart.getDom();
  if (container.querySelector('.gantt-lat-slider')) return null;
  const wrap = createEl('div', { position: 'absolute', bottom: '36px', right: '8px', zIndex: '9999', display: 'none', alignItems: 'center', gap: '6px', background: 'rgba(30,33,40,0.95)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(150,150,160,0.3)' });
  wrap.className = 'gantt-lat-slider';
  const label = createEl('span', { color: '#999', fontSize: '10px', whiteSpace: 'nowrap' });
  label.textContent = 'Min: 0%';
  const slider = createEl('input', { width: '100px', accentColor: '#ffa94d', cursor: 'pointer' });
  slider.type = 'range'; slider.min = '0'; slider.max = '50'; slider.value = '0';
  const rowName = rowNameMap(barData);
  slider.addEventListener('input', () => {
    const threshold = (parseInt(slider.value) / 100) * maxLat;
    label.textContent = 'Min: ' + slider.value + '%';
    const keepBar = (n: string) => critSet.has(n) || (nodeLat[n] || 0) >= threshold;
    const keepArrow = (v: any[]) => keepBar(rowName.get(v[1]) || '') && keepBar(rowName.get(v[3]) || '');
    applyDim(chart, barData, arrowData, keepBar, keepArrow);
  });
  wrap.appendChild(label); wrap.appendChild(slider);
  container.style.position = 'relative'; container.appendChild(wrap);
  return wrap;
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
  const { barData, arrowData, critSet, buildMermaid } = ctx;
  const container = chart.getDom();
  const rowName = rowNameMap(barData);
  const sliderPopover = setupGanttSlider(chart, ctx);
  let critOnly = false;
  const copyGroup = iconButton(ICON.size * 2 + ICON.gap * 2 + 8, '📋', '#aaa', 12, () => {
    navigator.clipboard.writeText(buildMermaid());
    showToast(container, 'Mermaid copied');
  });
  const critOnlyGroup = iconButton(ICON.size + ICON.gap + 8, '⚡', '#ff6b6b', 13, () => {
    critOnly = !critOnly;
    if (critOnly) {
      const keepArrow = (v: any[]) => critSet.has(rowName.get(v[1]) || '') && critSet.has(rowName.get(v[3]) || '');
      applyDim(chart, barData, arrowData, (n) => critSet.has(n), keepArrow);
    } else {
      resetDim(chart, barData, arrowData);
    }
  });
  const sliderGroup = iconButton(8, '◔', '#ffa94d', 14, () => {
    if (sliderPopover) sliderPopover.style.display = sliderPopover.style.display === 'none' ? 'flex' : 'none';
  });
  return { graphic: [buildGanttLegend(), copyGroup, critOnlyGroup, sliderGroup], sliderPopover, copyGroup, critOnlyGroup, sliderGroup };
}
