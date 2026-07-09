import type { NodeLatMap } from '../common/types.js';

export type { Path, ParsedData, CritInfo } from '../common/types.js';

export interface RenderFlowGraphOptions {
  root?: string;
  sink?: string;
  nodeSpacing?: number;
  nodeSize?: number;
  percentileVar?: string;
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
