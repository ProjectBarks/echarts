import type { AdjMap } from './types.js';

export function buildAdjacency(edgeKeys: string[]): { fwd: AdjMap; bwd: AdjMap } {
  const fwd: AdjMap = {};
  const bwd: AdjMap = {};
  for (const key of edgeKeys) {
    const [src, tgt] = key.split('__');
    if (!fwd[src]) fwd[src] = new Set();
    fwd[src].add(tgt);
    if (!bwd[tgt]) bwd[tgt] = new Set();
    bwd[tgt].add(src);
  }
  return { fwd, bwd };
}

/**
 * Remove back-edges (edges into a node still on the DFS stack) so `fwd`/`bwd`
 * describe a DAG. Cyclic inputs otherwise make longest-path relaxation loop
 * forever. Mutates both maps in place; callers keep the original edge list if
 * they still want to draw the removed edges.
 */
export function removeBackEdges(fwd: AdjMap, bwd: AdjMap, starts: string[]): void {
  const GRAY = 1;
  const BLACK = 2;
  const color: Record<string, number> = {};
  const roots = [...starts, ...Object.keys(fwd), ...Object.keys(bwd)];
  for (const start of roots) {
    if (color[start] === GRAY || color[start] === BLACK) continue;
    color[start] = GRAY;
    const stack: Array<{ node: string; kids: string[]; i: number }> = [
      { node: start, kids: [...(fwd[start] || [])], i: 0 },
    ];
    while (stack.length) {
      const frame = stack[stack.length - 1];
      if (frame.i < frame.kids.length) {
        const nb = frame.kids[frame.i++];
        if (color[nb] === GRAY) {
          if (fwd[frame.node]) fwd[frame.node].delete(nb);
          if (bwd[nb]) bwd[nb].delete(frame.node);
        } else if (color[nb] !== BLACK) {
          color[nb] = GRAY;
          stack.push({ node: nb, kids: [...(fwd[nb] || [])], i: 0 });
        }
      } else {
        color[frame.node] = BLACK;
        stack.pop();
      }
    }
  }
}

/** Longest-path depth via relaxation. Requires an acyclic `fwd`. */
export function longestPathDepth(roots: string[], fwd: AdjMap): Record<string, number> {
  const depth: Record<string, number> = {};
  const queue: string[] = [];
  for (const r of roots) {
    depth[r] = 0;
    queue.push(r);
  }
  while (queue.length) {
    const n = queue.shift() as string;
    for (const c of fwd[n] || []) {
      const d = (depth[n] || 0) + 1;
      if (depth[c] === undefined || d > depth[c]) {
        depth[c] = d;
        queue.push(c);
      }
    }
  }
  return depth;
}

export function countReachable(node: string, adj: AdjMap, memo: Record<string, number>): number {
  if (memo[node] !== undefined) return memo[node];
  const kids = [...(adj[node] || [])];
  let total = kids.length;
  for (const kid of kids) total += countReachable(kid, adj, memo);
  memo[node] = total;
  return total;
}

export function collectReachable(node: string, adj: AdjMap, visited: Set<string>): void {
  if (visited.has(node)) return;
  visited.add(node);
  for (const nb of adj[node] || []) collectReachable(nb, adj, visited);
}
