import type { NodeLatMap, AdjMap } from '../common/types.js';

export interface RenderGanttOptions {
  root?: string;
  sink?: string;
  percentileVar?: string;
}

export interface GanttBar {
  name: string;
  row: number;
  parent?: string; // binding predecessor (row order + arrow source share this)
  start: number; // true cumulative start (ms) from the earliest-start schedule
  end: number; // true cumulative end (ms) = start + duration
  duration: number; // exact ms
  depth: number;
  isCrit: boolean;
  color: string;
}

export interface GanttArrow {
  source: string;
  target: string;
  srcStart: number; // source bar start (ms) - used to find the source's mid-bottom
  srcEnd: number; // source bar end (ms)
  srcRow: number;
  tgtStart: number; // target bar start (ms)
  tgtRow: number;
  isCrit: boolean;
  bucket: number; // depth of target; arrows into the same column share a channel region
  lane: number; // assigned by assignChannels
}

export interface GanttLayout {
  bars: GanttBar[];
  rowOf: Record<string, number>;
  barByName: Record<string, GanttBar>;
  depth: Record<string, number>;
  cumulLat: NodeLatMap;
  maxCumul: number;
  critSet: Set<string>; // nodes on the true longest-duration path (rendered chain)
  critChain: string[]; // that path, ordered root -> last-finishing node
  critTotal: number; // total duration (ms) of the critical path
  maxDepth: number;
  fwd: AdjMap;
  bwd: AdjMap;
}
