import { buildAdjacency, removeBackEdges, longestPathDepth } from '../common/graph.js';
import { computeCumulativeLatency } from '../common/path-metrics.js';
import { COLORS } from '../common/theme.js';
import { GANTT } from './constants.js';
import type { EdgeMap, NodeLatMap, Path } from '../common/types.js';
import type { GanttBar, GanttLayout } from './types.js';

export interface BarColorCtx {
  root: string;
  sink: string;
  critSet: Set<string>;
  nodeLat: NodeLatMap;
}

export function barColor(name: string, ctx: BarColorCtx): string {
  const { root, sink, critSet, nodeLat } = ctx;
  if (name === root || name === sink) return COLORS.meta;
  if (critSet.has(name) && (nodeLat[name] || 0) > 0) return COLORS.crit;
  if (name.endsWith('predicate')) return COLORS.gate;
  return COLORS.dp;
}

export interface ComputeGanttArgs {
  paths: Path[];
  nodeLat: NodeLatMap;
  cleanEdges: EdgeMap;
  critSet: Set<string>;
  root: string;
  sink: string;
  dropNodes?: Set<string>;
}

export function computeGanttLayout(args: ComputeGanttArgs): GanttLayout {
  const { paths, nodeLat, cleanEdges, critSet, root, sink } = args;
  const dropNodes = args.dropNodes || new Set<string>();

  // Reuse the flow-graph DAG machinery: strip cycles, then longest-path depth
  // gives each node a column used to bucket dependency arrows into channels.
  const { fwd, bwd } = buildAdjacency(Object.keys(cleanEdges));
  removeBackEdges(fwd, bwd, [root]);
  const depth = longestPathDepth([root], fwd);

  const { cumulLat, maxCumul } = computeCumulativeLatency(paths, nodeLat, dropNodes, root);

  const startOf = (n: string): number => (cumulLat[n] || 0) - (nodeLat[n] || 0);
  const names = Object.keys(nodeLat).filter((n) => !dropNodes.has(n));
  names.sort(
    (a, b) => startOf(a) - startOf(b) || (depth[a] || 0) - (depth[b] || 0) || a.localeCompare(b),
  );

  // Forward offset: push each bar right by depth * gapMs so a child never starts
  // exactly on its parent's end. Total x inflation stays ~columnGapFrac of the
  // timeline regardless of depth, giving every arrow a clean horizontal run.
  const maxEndTrue = Math.max(...names.map((n) => cumulLat[n] || 0), 1);
  const maxDepth = Math.max(...names.map((n) => depth[n] || 0), 1);
  const gapMs = (GANTT.columnGapFrac * maxEndTrue) / maxDepth;

  const bars: GanttBar[] = names.map((name, i) => {
    const end = cumulLat[name] || 0;
    return {
      name,
      row: i,
      start: end - (nodeLat[name] || 0),
      end,
      duration: nodeLat[name] || 0,
      depth: depth[name] || 0,
      shift: (depth[name] || 0) * gapMs,
      isCrit: critSet.has(name),
      color: barColor(name, { root, sink, critSet, nodeLat }),
    };
  });

  const rowOf: Record<string, number> = {};
  const barByName: Record<string, GanttBar> = {};
  for (const b of bars) {
    rowOf[b.name] = b.row;
    barByName[b.name] = b;
  }

  return { bars, rowOf, barByName, depth, cumulLat, maxCumul, maxDepth, gapMs, fwd, bwd };
}
