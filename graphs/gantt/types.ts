import type { NodeLatMap, AdjMap } from '../common/types.js';

export interface RenderGanttOptions {
  root?: string;
  sink?: string;
  percentileVar?: string;
}

export interface GanttBar {
  name: string;
  row: number;
  start: number; // true cumulative start (ms), used for tooltip
  end: number; // true cumulative end (ms), used for tooltip
  duration: number;
  depth: number;
  shift: number; // forward x-offset (ms) so a child never starts on its parent's end
  isCrit: boolean;
  color: string;
}

export interface GanttArrow {
  source: string;
  target: string;
  srcEnd: number; // shifted: source bar end + source shift
  srcRow: number;
  tgtStart: number; // shifted: target bar start + target shift
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
  maxDepth: number;
  gapMs: number; // per-depth-level forward offset
  fwd: AdjMap;
  bwd: AdjMap;
}
