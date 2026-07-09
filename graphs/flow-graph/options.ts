import type { EChartsOption, GraphSeriesOption } from 'echarts/types/dist/shared';
import type { NodeLatMap } from '../common/types.js';

type GraphNode = NonNullable<GraphSeriesOption['data']>[number];
type GraphLink = NonNullable<GraphSeriesOption['links']>[number];

export interface TooltipCtx {
  nodeLat: NodeLatMap;
  cumulLat: NodeLatMap;
  critSet: Set<string>;
  critTotal: number;
  pctl: string;
  hasTaskDurations: boolean;
  root: string;
  sink: string;
  units: string;
}

export function buildTooltipFormatter(ctx: TooltipCtx): (p: any) => string {
  const { nodeLat, cumulLat, critSet, critTotal, pctl, hasTaskDurations, root, sink, units } = ctx;
  return (p: any) => {
    if (p.dataType === 'edge') {
      return '<b>' + p.data.source + ' → ' + p.data.target + '</b><br/>' + p.data.value + ' ' + units;
    }
    const name = p.name;
    const lat = nodeLat[name] || 0;
    const cumul = cumulLat[name] || 0;
    const role =
      name === root
        ? 'flow start'
        : name === sink
          ? 'sink'
          : name.endsWith('predicate')
            ? 'predicate'
            : 'data provider';
    const critPct = critTotal > 0 ? Math.round((lat / critTotal) * 100) : 0;
    const onCrit = critSet.has(name);
    return (
      '<b style="font-size:13px">' +
      name +
      '</b>' +
      '<br/><span style="color:#888">' +
      role +
      '</span>' +
      '<br/><br/>p' +
      pctl +
      ' execution: <b>' +
      Math.round(lat) +
      ' ' + units + '</b>' +
      (onCrit ? '<br/>% of critical path: <b>' + critPct + '%</b>' : '') +
      '<br/><b>' +
      Math.round(cumul) +
      ' ' + units + '</b>' +
      (hasTaskDurations ? '<br/><span style="color:#666">Source: task.duration histogram</span>' : '')
    );
  };
}

export interface AssembleArgs {
  nodes: GraphNode[];
  links: GraphLink[];
  cats: unknown[];
  graphic: unknown[];
  subtext: string;
  critColor: string;
  formatter: (p: any) => string;
  legendData: string[];
}

export function assembleOption(args: AssembleArgs): EChartsOption {
  const { nodes, links, cats, graphic, subtext, critColor, formatter, legendData } = args;
  return {
    backgroundColor: 'transparent',
    title: {
      text: '',
      subtext,
      left: 'center',
      top: 4,
      textStyle: { fontSize: 15, color: '#eee', fontWeight: 600 },
      subtextStyle: { fontSize: 11, color: critColor, fontWeight: 500 },
    },
    graphic,
    tooltip: {
      confine: true,
      backgroundColor: 'rgba(20,22,28,0.95)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#ddd', fontSize: 12 },
      formatter,
    },
    legend: {
      data: legendData,
      bottom: 4,
      left: 'center',
      textStyle: { color: '#aaa', fontSize: 10 },
      itemWidth: 14,
      itemHeight: 14,
      itemGap: 20,
    },
    animationDuration: 800,
    animationEasing: 'cubicOut',
    series: [
      {
        type: 'graph',
        layout: 'none',
        data: nodes,
        links,
        categories: cats,
        roam: true,
        emphasis: {
          focus: 'adjacency',
          itemStyle: { borderWidth: 4, borderColor: '#fff' },
          lineStyle: { width: 3.5 },
          label: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
        },
        blur: {
          itemStyle: { opacity: 0.12 },
          lineStyle: { opacity: 0.05 },
          label: { opacity: 0.1 },
        },
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: 7,
        lineStyle: { opacity: 0.8 },
      },
    ],
  } as unknown as EChartsOption;
}
