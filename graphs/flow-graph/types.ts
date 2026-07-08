import type { NodeLatMap } from '../common/types.js';

export interface RenderFlowGraphOptions {
  root?: string;
  sink?: string;
  nodeSpacing?: number;
  nodeSize?: number;
  percentileVar?: string;
}

/** A path metric: underscore-joined task chain + its p95 latency. */
export interface Path {
  path: string;
  p95: number;
}

export interface ParsedData {
  paths: Path[];
  taskDurations: NodeLatMap;
  hasTaskDurations: boolean;
}

export interface CritInfo {
  crit: Path;
  critNodesList: string[];
  critSet: Set<string>;
  critTotal: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface LayoutResult {
  layers: Record<number, string[]>;
  maxDepth: number;
  depth: Record<string, number>;
  nodePos: Record<string, Position>;
  cumulLat: NodeLatMap;
  maxCumul: number;
  maxLat: number;
}
