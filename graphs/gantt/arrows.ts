import type { GanttBar, GanttArrow } from './types.js';

/**
 * One connector per node, from its binding predecessor (`bar.parent`, computed
 * in layout as the acyclic in-neighbor whose end sets this node's start). Using
 * the same parent the row ordering uses keeps arrows and layout consistent and
 * turns the dependency hairball into a readable waterfall. Any node that somehow
 * lacks a parent (its predecessors were all dropped) is attached to the nearest
 * scheduled predecessor so nothing is ever left unconnected.
 */
export function buildArrows(
  barByName: Record<string, GanttBar>,
  depth: Record<string, number>,
  critSet: Set<string>,
): GanttArrow[] {
  const bars = Object.values(barByName);
  const root = bars.reduce((m, b) => (b.row < m.row ? b : m), bars[0]);
  const arrows: GanttArrow[] = [];
  for (const b of bars) {
    if (b.name === root.name) continue;
    let parent = b.parent ? barByName[b.parent] : undefined;
    if (!parent) {
      // Fallback: nearest scheduled predecessor (greatest end that finishes at or
      // before this node's start), else the root.
      for (const c of bars) {
        if (c.name === b.name) continue;
        if (c.end <= b.start + 1e-6 && (!parent || c.end > parent.end)) parent = c;
      }
      if (!parent) parent = root;
    }
    arrows.push({
      source: parent.name,
      target: b.name,
      srcStart: parent.start,
      srcEnd: parent.end,
      srcRow: parent.row,
      tgtStart: b.start,
      tgtRow: b.row,
      isCrit: critSet.has(parent.name) && critSet.has(b.name),
      bucket: depth[b.name] || 0,
      lane: 0,
    });
  }
  return arrows;
}

/**
 * Channel (lane) assignment for the vertical segments of connectors.
 *
 * The renderer places each connector's vertical channel a fixed jetty to the
 * left of its TARGET, so all edges into the same target column already share one
 * x. We only need lanes to separate DISTINCT sources feeding the same column: a
 * star of edges from one node collapses to a single spine (lane 0), while edges
 * from different sources into the same column get adjacent channels so they don't
 * silently merge into one misleading line. This is bus / hyperedge routing: group
 * by target column, then one lane per source within the column.
 */
export function assignChannels(arrows: GanttArrow[]): void {
  const colKey = (a: GanttArrow): number => Math.round(a.tgtStart * 1000) / 1000;
  const buckets: Record<string, GanttArrow[]> = {};
  for (const a of arrows) {
    const key = String(colKey(a));
    (buckets[key] = buckets[key] || []).push(a);
  }
  for (const key of Object.keys(buckets)) {
    const group = buckets[key];
    // Deterministic ordering so lane numbers are stable across renders.
    group.sort((a, b) => a.srcRow - b.srcRow || a.source.localeCompare(b.source));
    const laneBySource: Record<string, number> = {};
    let next = 0;
    for (const a of group) {
      if (!(a.source in laneBySource)) laneBySource[a.source] = next++;
      a.lane = laneBySource[a.source];
    }
  }
}
