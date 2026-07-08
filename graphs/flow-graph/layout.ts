import { buildAdjacency, removeBackEdges, longestPathDepth, countReachable } from '../common/graph.js';
import { median } from '../common/math.js';
import type { EdgeMap, NodeLatMap, AdjMap } from '../common/types.js';
import type { Path, LayoutResult } from './types.js';

export function computeCumulativeLatency(
  paths: Path[],
  nodeLat: NodeLatMap,
  dropNodes: Set<string>,
  root: string,
): { cumulLat: NodeLatMap; maxCumul: number; maxLat: number } {
  const cumulLat: NodeLatMap = {};
  for (const { path } of paths) {
    const chain = [root, ...path.split('_')].filter((n) => !dropNodes.has(n));
    let cumul = 0;
    for (const n of chain) {
      cumul += nodeLat[n] || 0;
      cumulLat[n] = Math.max(cumulLat[n] || 0, cumul);
    }
  }
  const maxCumul = Math.max(...Object.values(cumulLat), 1);
  const maxLat = Math.max(...Object.values(nodeLat), 1);
  return { cumulLat, maxCumul, maxLat };
}

export function assignLayers(
  nodeLat: NodeLatMap,
  depth: Record<string, number>,
): { layers: Record<number, string[]>; maxDepth: number } {
  const layers: Record<number, string[]> = {};
  for (const name of Object.keys(nodeLat)) {
    const d = depth[name] !== undefined ? depth[name] : 0;
    if (!layers[d]) layers[d] = [];
    layers[d].push(name);
  }
  const maxDepth = Math.max(...Object.keys(layers).map(Number));
  return { layers, maxDepth };
}

export function semanticBand(name: string, root: string, sink: string): number {
  if (name === root) return 0;
  if (name === sink) return 3;
  if (name.endsWith('predicate')) return 1;
  return 2;
}

export interface OrderBarycenterCtx {
  fwd: AdjMap;
  bwd: AdjMap;
  critSet: Set<string>;
  reach: Record<string, number>;
  nodeLat: NodeLatMap;
  root: string;
  sink: string;
}

export function orderBarycenter(
  layers: Record<number, string[]>,
  maxDepth: number,
  ctx: OrderBarycenterCtx,
): void {
  const { fwd, bwd, critSet, reach, nodeLat, root, sink } = ctx;
  for (let d = 0; d <= maxDepth; d++) {
    layers[d] = [...(layers[d] || [])].sort((a, b) => {
      const bandDiff = semanticBand(a, root, sink) - semanticBand(b, root, sink);
      if (bandDiff) return bandDiff;
      const critDiff = (critSet.has(b) ? 1 : 0) - (critSet.has(a) ? 1 : 0);
      if (critDiff) return critDiff;
      return (reach[b] || 0) - (reach[a] || 0) || (nodeLat[b] || 0) - (nodeLat[a] || 0) || a.localeCompare(b);
    });
  }
  for (let iter = 0; iter < 8; iter++) {
    for (let d = 1; d <= maxDepth; d++) {
      const layer = layers[d] || [];
      const prevLayer = layers[d - 1] || [];
      const prevIdx: Record<string, number> = {};
      prevLayer.forEach((n, i) => {
        prevIdx[n] = i;
      });
      layers[d] = [...layer].sort((a, b) => {
        const ap = [...(bwd[a] || [])].filter((p) => prevIdx[p] !== undefined);
        const bp = [...(bwd[b] || [])].filter((p) => prevIdx[p] !== undefined);
        const am = median(ap.map((p) => prevIdx[p]));
        const bm = median(bp.map((p) => prevIdx[p]));
        const as = am == null ? layer.indexOf(a) : am;
        const bs = bm == null ? layer.indexOf(b) : bm;
        return as !== bs ? as - bs : (critSet.has(b) ? 1 : 0) - (critSet.has(a) ? 1 : 0) || a.localeCompare(b);
      });
    }
    for (let d = maxDepth - 1; d >= 0; d--) {
      const layer = layers[d] || [];
      const nextLayer = layers[d + 1] || [];
      const nextIdx: Record<string, number> = {};
      nextLayer.forEach((n, i) => {
        nextIdx[n] = i;
      });
      layers[d] = [...layer].sort((a, b) => {
        const ac = [...(fwd[a] || [])].filter((c) => nextIdx[c] !== undefined);
        const bc = [...(fwd[b] || [])].filter((c) => nextIdx[c] !== undefined);
        const am = median(ac.map((c) => nextIdx[c]));
        const bm = median(bc.map((c) => nextIdx[c]));
        const as = am == null ? layer.indexOf(a) : am;
        const bs = bm == null ? layer.indexOf(b) : bm;
        return as !== bs ? as - bs : (critSet.has(b) ? 1 : 0) - (critSet.has(a) ? 1 : 0) || a.localeCompare(b);
      });
    }
  }
}

export function positionNodes(
  layers: Record<number, string[]>,
  maxDepth: number,
  dims: { width: number; height: number; nodeSpacing: number },
): Record<string, { x: number; y: number }> {
  const { width, height, nodeSpacing } = dims;
  const W = width || 1200;
  const tallestLayer = Math.max(...Object.values(layers).map((l) => l.length));
  const H = Math.max(height || 700, tallestLayer * nodeSpacing + 160);
  const padX = 60;
  const padY = 40;
  const titleH = 55;
  const totalCols = maxDepth + 1;
  const nodePos: Record<string, { x: number; y: number }> = {};
  for (let d = 0; d <= maxDepth; d++) {
    const layer = layers[d] || [];
    const usableH = H - titleH - 2 * padY;
    const x = padX + (d / Math.max(totalCols - 1, 1)) * (W - 2 * padX);
    const spacing = layer.length > 1 ? Math.min(nodeSpacing, usableH / (layer.length - 1)) : 0;
    const blockH = spacing * Math.max(layer.length - 1, 0);
    const startY = titleH + padY + (usableH - blockH) / 2;
    layer.forEach((name, i) => {
      nodePos[name] = { x, y: startY + i * spacing };
    });
  }
  return nodePos;
}

export interface ComputeLayoutArgs {
  paths: Path[];
  nodeLat: NodeLatMap;
  cleanEdges: EdgeMap;
  critSet: Set<string>;
  root: string;
  sink: string;
  width: number;
  height: number;
  nodeSpacing: number;
  dropNodes?: Set<string>;
}

export function computeLayout(args: ComputeLayoutArgs): LayoutResult & { fwd: AdjMap; bwd: AdjMap } {
  const { paths, nodeLat, cleanEdges, critSet, root, sink, width, height, nodeSpacing } = args;
  const dropNodes = args.dropNodes || new Set<string>();

  const { fwd, bwd } = buildAdjacency(Object.keys(cleanEdges));
  // Strip back-edges so longest-path depth relaxation terminates on cyclic input.
  removeBackEdges(fwd, bwd, [root]);

  const { cumulLat, maxCumul, maxLat } = computeCumulativeLatency(paths, nodeLat, dropNodes, root);

  const depth = longestPathDepth([root], fwd);
  const { layers, maxDepth } = assignLayers(nodeLat, depth);

  const reach: Record<string, number> = {};
  for (let d = 0; d <= maxDepth; d++)
    for (const n of layers[d] || []) countReachable(n, fwd, reach);

  orderBarycenter(layers, maxDepth, { fwd, bwd, critSet, reach, nodeLat, root, sink });

  const nodePos = positionNodes(layers, maxDepth, { width, height, nodeSpacing });

  return { layers, maxDepth, depth, nodePos, cumulLat, maxCumul, maxLat, fwd, bwd };
}
