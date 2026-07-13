import { buildAdjacency, removeBackEdges, longestPathDepth } from '../common/graph.js';
import { COLORS } from '../common/theme.js';
import type { EdgeMap, NodeLatMap, Path } from '../common/types.js';
import type { GanttBar, GanttLayout } from './types.js';

export interface BarColorCtx {
  root: string;
  sink: string;
  critSet: Set<string>;
  nodeLat: NodeLatMap;
}

/** Semantic accent palette (crit/dp/gate/meta); defaults to COLORS. */
type Palette = { crit: string; dp: string; gate: string; meta: string };

export function barColor(name: string, ctx: BarColorCtx, palette: Palette = COLORS): string {
  const { root, sink, critSet, nodeLat } = ctx;
  if (name === root || name === sink) return palette.meta;
  // Every node on the critical path is colored crit, including any zero-latency
  // intermediate (predicates/gates that carry duration are dropped upstream, so
  // this never mis-colors a gate). nodeLat is kept in the signature for callers.
  if (critSet.has(name)) return palette.crit;
  void nodeLat;
  if (name.endsWith('predicate')) return palette.gate;
  return palette.dp;
}

export interface ComputeGanttArgs {
  paths: Path[];
  nodeLat: NodeLatMap;
  cleanEdges: EdgeMap;
  root: string;
  sink: string;
  dropNodes?: Set<string>;
  palette?: Palette;
}

export function computeGanttLayout(args: ComputeGanttArgs): GanttLayout {
  const { nodeLat, cleanEdges, root, sink } = args;
  const dropNodes = args.dropNodes || new Set<string>();

  // Reuse the flow-graph DAG machinery: strip cycles first (mandatory - see the
  // layout invariant), then compute longest-path depth for arrow bucketing.
  const { fwd, bwd } = buildAdjacency(Object.keys(cleanEdges));
  removeBackEdges(fwd, bwd, [root]);
  const depth = longestPathDepth([root], fwd);

  const dur = (n: string): number => nodeLat[n] || 0;

  // Earliest-start schedule via longest path over the acyclic dependency graph:
  // start[n] = max end over predecessors, end[n] = start[n] + duration. This is
  // a single consistent timeline, so every edge runs forward (pred.end <=
  // succ.start) and the binding predecessor's end equals the successor's start.
  const startMemo: Record<string, number> = {};
  const startOf = (n: string): number => {
    if (n in startMemo) return startMemo[n];
    startMemo[n] = 0; // guard against any residual cycle
    let s = 0;
    for (const p of bwd[n] || []) {
      if (dropNodes.has(p)) continue;
      s = Math.max(s, startOf(p) + dur(p));
    }
    startMemo[n] = s;
    return s;
  };
  const endOf = (n: string): number => startOf(n) + dur(n);

  const names = Object.keys(nodeLat).filter((n) => !dropNodes.has(n));
  for (const n of names) startOf(n);

  // Binding predecessor of each node: the acyclic in-neighbor whose true end is
  // latest (== this node's start), tie-broken by name. This single constraint
  // sets the node's start and is exactly the edge we draw, so ordering, arrows,
  // and the critical path all stay consistent.
  const parentOf: Record<string, string> = {};
  for (const n of names) {
    if (n === root) continue;
    let best: string | null = null;
    for (const p of bwd[n] || []) {
      if (dropNodes.has(p) || p === n) continue;
      if (!best || endOf(p) > endOf(best) + 1e-6 || (Math.abs(endOf(p) - endOf(best)) <= 1e-6 && p < best)) {
        best = p;
      }
    }
    if (best) parentOf[n] = best;
  }

  // Critical path = the true longest-duration chain, derived from the SAME
  // schedule the layout renders: find the node that finishes last, then walk its
  // binding predecessors back to the root. This is the CPM critical path and, by
  // construction, is exactly the staircase the bars draw - so every node on it
  // gets colored and none is ever excluded because some sibling path had a
  // higher measured p95. (Selecting a single recorded path by p95 was the bug.)
  let critEnd = root;
  for (const n of names) if (endOf(n) > endOf(critEnd)) critEnd = n;
  const critSet = new Set<string>();
  const critChainRev: string[] = [];
  for (let cur: string | undefined = critEnd; cur; cur = parentOf[cur]) {
    if (critSet.has(cur)) break; // paranoia against a cycle
    critSet.add(cur);
    critChainRev.push(cur);
  }
  const critChain = critChainRev.reverse();
  const critTotal = endOf(critEnd);

  // Row order: DFS pre-order of the binding-predecessor tree, visiting the
  // critical child first then by start / end / name. This keeps every dependency
  // chain contiguous (short connectors) and renders the critical path as a tight
  // staircase, instead of scattering a node far from its parent the way a global
  // start-time sort does.
  const kids: Record<string, string[]> = {};
  for (const n of names) {
    const p = parentOf[n];
    if (p) (kids[p] = kids[p] || []).push(n);
  }
  const childSort = (a: string, b: string): number =>
    Number(critSet.has(b)) - Number(critSet.has(a)) ||
    startOf(a) - startOf(b) ||
    endOf(a) - endOf(b) ||
    a.localeCompare(b);
  const order: string[] = [];
  const seen = new Set<string>();
  const visit = (n: string): void => {
    if (seen.has(n)) return;
    seen.add(n);
    order.push(n);
    for (const c of (kids[n] || []).sort(childSort)) visit(c);
  };
  visit(root);
  // Any node not reachable from the root (no predecessor chain) still gets a row.
  for (const n of names.slice().sort(childSort)) if (!seen.has(n)) visit(n);

  // Bars sit on a true-millisecond timeline: start/end come straight from the
  // earliest-start schedule so the x-axis reads real time. Tiny bars stay visible
  // via a pixel-width floor applied at render time (see barRenderItem), not by
  // distorting the timeline.
  const bars: GanttBar[] = order.map((name, i) => ({
    name,
    row: i,
    parent: parentOf[name],
    start: startOf(name),
    end: endOf(name),
    duration: dur(name),
    depth: depth[name] || 0,
    isCrit: critSet.has(name),
    color: barColor(name, { root, sink, critSet, nodeLat }, args.palette || COLORS),
  }));

  const rowOf: Record<string, number> = {};
  const barByName: Record<string, GanttBar> = {};
  const cumulLat: NodeLatMap = {};
  for (const b of bars) {
    rowOf[b.name] = b.row;
    barByName[b.name] = b;
    cumulLat[b.name] = b.end;
  }
  const maxCumul = Math.max(...bars.map((b) => b.end), 1);
  const maxDepth = Math.max(...bars.map((b) => b.depth), 1);

  return { bars, rowOf, barByName, depth, cumulLat, maxCumul, critSet, critChain, critTotal, maxDepth, fwd, bwd };
}
