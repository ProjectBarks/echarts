import type { EdgeMap } from '../common/types.js';
import type { GanttBar, GanttArrow } from './types.js';

/** One finish-to-start connector per clean edge whose endpoints both have bars. */
export function buildArrows(
  cleanEdges: EdgeMap,
  barByName: Record<string, GanttBar>,
  depth: Record<string, number>,
  critSet: Set<string>,
): GanttArrow[] {
  const arrows: GanttArrow[] = [];
  for (const key of Object.keys(cleanEdges)) {
    const [src, tgt] = key.split('__');
    const s = barByName[src];
    const t = barByName[tgt];
    if (!s || !t) continue;
    arrows.push({
      source: src,
      target: tgt,
      srcEnd: s.end + s.shift,
      srcRow: s.row,
      tgtStart: t.start + t.shift,
      tgtRow: t.row,
      isCrit: critSet.has(src) && critSet.has(tgt),
      bucket: depth[tgt] || 0,
      lane: 0,
    });
  }
  return arrows;
}

/**
 * Assign each arrow's vertical segment a lane so segments never overlap.
 * Arrows are grouped by target column (bucket); within a bucket the vertical
 * spans form an interval graph, greedily colored so any two arrows with
 * overlapping [top,bottom] row spans land on different lanes. renderItem maps
 * the lane to a pixel offset left of the target bar start.
 */
export function assignChannels(arrows: GanttArrow[]): void {
  const buckets: Record<number, GanttArrow[]> = {};
  for (const a of arrows) {
    if (!buckets[a.bucket]) buckets[a.bucket] = [];
    buckets[a.bucket].push(a);
  }
  for (const key of Object.keys(buckets)) {
    const group = buckets[Number(key)];
    const span = (a: GanttArrow): [number, number] => [
      Math.min(a.srcRow, a.tgtRow),
      Math.max(a.srcRow, a.tgtRow),
    ];
    group.sort((a, b) => span(a)[0] - span(b)[0]);
    const placed: GanttArrow[] = [];
    for (const a of group) {
      const [aTop, aBot] = span(a);
      const used = new Set<number>();
      for (const p of placed) {
        const [pTop, pBot] = span(p);
        if (aTop <= pBot && pTop <= aBot) used.add(p.lane);
      }
      let lane = 0;
      while (used.has(lane)) lane++;
      a.lane = lane;
      placed.push(a);
    }
  }
}
