import type { GraphSeriesOption } from 'echarts/types/dist/shared';
import { COLORS } from './constants.js';
import type { NodeLatMap } from '../common/types.js';
import type { Position } from './types.js';
import type { ChartTheme } from '../common/theme.js';

type GraphNode = NonNullable<GraphSeriesOption['data']>[number];

export interface NodeColorCtx {
  root: string;
  sink: string;
  critSet: Set<string>;
  nodeLat: NodeLatMap;
}

/** Semantic accent palette (crit/dp/gate/meta); defaults to COLORS. */
type Palette = { crit: string; dp: string; gate: string; meta: string };

export function nodeColor(name: string, ctx: NodeColorCtx, palette: Palette = COLORS): string {
  const { root, sink, critSet, nodeLat } = ctx;
  if (name === root || name === sink) return palette.meta;
  if (critSet.has(name) && (nodeLat[name] || 0) > 0) return palette.crit;
  if (name.endsWith('predicate')) return palette.gate;
  return palette.dp;
}

export interface BuildNodesCtx {
  nodePos: Record<string, Position>;
  cumulLat: NodeLatMap;
  maxCumul: number;
  critSet: Set<string>;
  nodeSize: number;
  root: string;
  sink: string;
  units: string;
  theme: ChartTheme;
}

export function buildNodes(nodeLat: NodeLatMap, ctx: BuildNodesCtx): GraphNode[] {
  const { nodePos, cumulLat, maxCumul, critSet, nodeSize, root, sink, units, theme } = ctx;
  return Object.entries(nodeLat)
    .sort((a, b) => b[1] - a[1])
    .map(([name, lat]) => {
      const pos = nodePos[name] || { x: 0, y: 0 };
      const col = nodeColor(name, { root, sink, critSet, nodeLat }, theme);
      const cumul = cumulLat[name] || 0;
      const pct = Math.min(0.98, Math.max(0.03, cumul / maxCumul));
      const isCrit = critSet.has(name) && lat > 0;
      const cat = name === root ? 0 : name === sink ? 3 : isCrit ? 4 : name.endsWith('predicate') ? 1 : 2;
      const displayName = name.replace(/predicate$/, '(P)').replace(/dp$/, '');

      return {
        name,
        x: pos.x,
        y: pos.y,
        fixed: true,
        value: Math.round(lat * 10) / 10,
        symbolSize: nodeSize,
        category: cat,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 1,
            x2: 0,
            y2: 0,
            colorStops: [
              { offset: 0, color: col },
              { offset: Math.min(pct, 0.99), color: col },
              { offset: Math.min(pct + 0.005, 1.0), color: theme.nodeEmpty },
              { offset: 1, color: theme.nodeEmpty },
            ],
          },
          borderColor: col,
          borderWidth: 2.5,
          shadowBlur: 0,
          shadowColor: 'transparent',
        },
        label: {
          show: true,
          fontSize: 10,
          position: 'right',
          distance: 8,
          color: theme.textMuted,
          formatter: () => {
            const ms = lat > 0 ? '  {val| ' + Math.round(lat) + ' ' + units + '}' : '';
            return '{name|' + displayName + '}' + ms;
          },
          rich: {
            name: { fontSize: 10, color: theme.textMuted },
            val: { fontSize: 10, fontWeight: 'bold', color: col, padding: [0, 0, 0, 4] },
          },
        },
      };
    }) as unknown as GraphNode[];
}
