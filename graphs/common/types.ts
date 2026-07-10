// Minimal structural mirror of the Grafana Business Charts panel `context`
// that renderFlowGraph consumes, plus generic graph map aliases. Hand-rolled
// on purpose so the package keeps zero runtime dependencies and accepts both
// the real Grafana object and the test mock via structural typing.

export type ReplaceVariables = (value: string) => string;

import type { GrafanaThemeLike } from './theme.js';
export type { GrafanaThemeLike };

/** Grafana field value container: a plain array or a Vector-like with toArray(). */
export interface FieldValues {
  length: number;
  toArray?: () => unknown[];
  [index: number]: unknown;
}

export interface Field {
  type: string; // 'number' | 'time' | 'string' | ...
  values: FieldValues | unknown[];
}

export interface DataFrame {
  name?: string;
  fields: Field[];
}

export interface PanelData {
  series?: DataFrame[];
}

/** The subset of the ECharts instance the render touches. */
export interface EChartsLike {
  getDom: () => HTMLElement;
  setOption: (option: unknown) => void;
  on?: (eventName: string, handler: (params: any) => void) => void;
  off?: (eventName: string) => void;
}

export interface PanelContext {
  width?: number;
  height?: number;
  data?: PanelData | null;
  chart: EChartsLike;
  replaceVariables?: ReplaceVariables;
}

export interface GrafanaContext {
  grafana: { replaceVariables?: ReplaceVariables; theme?: GrafanaThemeLike };
  panel: PanelContext;
}

// Generic graph shapes (domain-agnostic).
export type NodeLatMap = Record<string, number>;
export type EdgeMap = Record<string, number>;      // "src__tgt" -> latency
export type AdjMap = Record<string, Set<string>>;  // node -> neighbor set

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
