import type { EChartsOption } from 'echarts/types/dist/shared';
import { barRenderItem, arrowRenderItem, arrowHeadRenderItem } from './render-item.js';
import { COLORS } from '../common/theme.js';
import type { GanttBar, GanttArrow } from './types.js';

export interface GanttTooltipCtx {
  barByName: Record<string, GanttBar>;
  critTotal: number;
  pctl: string;
}

export function buildGanttTooltip(ctx: GanttTooltipCtx): (p: any) => string {
  const { barByName, critTotal, pctl } = ctx;
  return (p: any) => {
    const bar = barByName[p.name];
    if (!bar) return '';
    const critPct = critTotal > 0 ? Math.round((bar.duration / critTotal) * 100) : 0;
    return (
      '<b style="font-size:13px">' +
      bar.name +
      '</b>' +
      '<br/><br/>p' +
      pctl +
      ' duration: <b>' +
      Math.round(bar.duration) +
      ' ms</b>' +
      '<br/>starts at: <b>' +
      Math.round(bar.start) +
      ' ms</b>' +
      '<br/>ends at: <b>' +
      Math.round(bar.end) +
      ' ms</b>' +
      (bar.isCrit ? '<br/>% of critical path: <b>' + critPct + '%</b>' : '')
    );
  };
}

export interface AssembleGanttArgs {
  bars: GanttBar[];
  arrows: GanttArrow[];
  rowNames: string[];
  subtext: string;
  formatter: (p: any) => string;
}

export function assembleGanttOption(args: AssembleGanttArgs): EChartsOption {
  const { bars, arrows, rowNames, subtext, formatter } = args;
  const barData = bars.map((b) => ({ name: b.name, value: [b.start + b.shift, b.end + b.shift, b.row, b.name, b.color] }));
  const arrowData = arrows.map((a) => ({
    value: [a.srcEnd, a.srcRow, a.tgtStart, a.tgtRow, a.lane, a.isCrit ? 1 : 0],
  }));
  const maxEnd = Math.max(...bars.map((b) => b.end + b.shift), 1);
  return {
    backgroundColor: 'transparent',
    title: {
      text: '',
      subtext,
      left: 'center',
      top: 6,
      subtextStyle: { fontSize: 12, color: COLORS.crit, fontWeight: 500 },
    },
    grid: { left: 150, right: 44, top: 52, bottom: 34 },
    xAxis: {
      type: 'value',
      name: 'ms',
      min: -Math.ceil(maxEnd * 0.035),
      max: Math.ceil(maxEnd * 1.05),
      axisLabel: { color: '#aaa', formatter: (v: number) => (v < 0 ? '' : String(v)) },
      nameTextStyle: { color: '#aaa' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    },
    yAxis: {
      type: 'category',
      data: rowNames,
      inverse: true,
      axisLabel: { color: '#ccc', fontSize: 11 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } },
      splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.015)', 'rgba(255,255,255,0.045)'] } },
    },
    tooltip: {
      confine: true,
      backgroundColor: 'rgba(20,22,28,0.95)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#ddd', fontSize: 12 },
      formatter,
    },
    animationDuration: 600,
    animationEasing: 'cubicOut',
    series: [
      { type: 'custom', name: 'deps', renderItem: arrowRenderItem, encode: { x: [0, 2], y: [1, 3] }, data: arrowData, silent: true, z: 2 },
      { type: 'custom', name: 'tasks', renderItem: barRenderItem, encode: { x: [0, 1], y: 2 }, data: barData, z: 3 },
      { type: 'custom', name: 'heads', renderItem: arrowHeadRenderItem, encode: { x: [0, 2], y: [1, 3] }, data: arrowData, silent: true, z: 4 },
    ],
  } as unknown as EChartsOption;
}
