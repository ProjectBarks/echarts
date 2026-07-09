import type { EChartsLike } from '../common/types.js';

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
