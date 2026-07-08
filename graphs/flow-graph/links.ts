import type { GraphSeriesOption } from 'echarts/types/dist/shared';
import { collectReachable } from '../common/graph.js';
import type { EdgeMap, AdjMap, NodeLatMap } from '../common/types.js';

type GraphLink = NonNullable<GraphSeriesOption['links']>[number];

export function buildLinks(cleanEdges: EdgeMap, critSet: Set<string>): GraphLink[] {
  return Object.entries(cleanEdges).map(([key, lat]) => {
    const [src, tgt] = key.split('__');
    const isCrit = critSet.has(src) && critSet.has(tgt);
    return {
      source: src,
      target: tgt,
      value: Math.round(lat),
      lineStyle: {
        width: isCrit ? 2.5 : 1,
        color: isCrit ? 'rgba(255,107,107,0.7)' : 'rgba(150,150,160,0.35)',
        type: isCrit ? 'solid' : 'dashed',
        curveness: 0,
      },
    };
  }) as unknown as GraphLink[];
}

export function buildTransitiveHoverEdges(
  nodeLat: NodeLatMap,
  fwd: AdjMap,
  bwd: AdjMap,
  cleanEdges: EdgeMap,
): GraphLink[] {
  const links: GraphLink[] = [];
  for (const name of Object.keys(nodeLat)) {
    const anc = new Set<string>();
    collectReachable(name, bwd, anc);
    anc.delete(name);
    const desc = new Set<string>();
    collectReachable(name, fwd, desc);
    desc.delete(name);
    const allConn = new Set([...anc, ...desc]);
    for (const other of allConn) {
      const k1 = name + '__' + other;
      const k2 = other + '__' + name;
      if (!cleanEdges[k1] && !cleanEdges[k2]) {
        links.push({
          source: name,
          target: other,
          symbol: ['none', 'none'],
          lineStyle: { width: 0, opacity: 0, color: 'rgba(0,0,0,0)' },
          emphasis: { lineStyle: { width: 0, opacity: 0 } },
        } as unknown as GraphLink);
      }
    }
  }
  return links;
}
