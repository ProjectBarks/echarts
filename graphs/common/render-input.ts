import type { EChartsOption } from 'echarts/types/dist/shared';
import type { GrafanaContext, ReplaceVariables, ParsedData, NodeLatMap, EdgeMap } from './types.js';
import { pickTheme } from './theme.js';
import type { ChartTheme, ThemeName } from './theme.js';
import { parseSeries, buildLatencyAndEdges, dropZeroPredicates, computeCleanEdges } from './path-metrics.js';

/** The render options both charts share (each adds its own extras). */
export interface CommonRenderOptions {
  units?: string;
  theme?: ThemeName;
  root?: string;
  sink?: string;
  percentileVar?: string;
}

export interface GraphDefaults {
  root: string;
  sink: string;
  percentileVar: string;
}

/** A centered single-line message option (used for "No data" / missing-units states). */
export function centeredMessageOption(text: string, theme: ChartTheme): EChartsOption {
  return {
    title: { text, left: 'center', top: 'center', textStyle: { color: theme.alertText } },
  } as unknown as EChartsOption;
}

/** The parsed, cleaned graph both renderers build before their chart-specific layout. */
export interface PreparedGraph {
  kind: 'data';
  theme: ChartTheme;
  units: string;
  root: string;
  sink: string;
  pctl: string;
  parsed: ParsedData;
  nodeLat: NodeLatMap;
  edgeMap: EdgeMap;
  dropNodes: Set<string>;
  cleanEdges: EdgeMap;
}

export type PreparedInput = { kind: 'message'; option: EChartsOption } | PreparedGraph;

/**
 * Shared render prologue for both charts: resolves the theme, guards on units and
 * empty data (returning a ready-to-use message option), resolves root/sink/pctl,
 * parses the panel series, and builds the latency map + cleaned edge set. Returns
 * a discriminated result so callers do `if (prepared.kind === 'message') return prepared.option;`.
 * Renderer-specific work (critical path, layout) stays in each chart.
 */
export function prepareGraphInput(
  context: GrafanaContext,
  opts: CommonRenderOptions,
  defaults: GraphDefaults,
): PreparedInput {
  const theme = pickTheme(opts.theme, context.grafana && context.grafana.theme);
  const units = (opts.units || '').trim();
  if (!units) {
    return { kind: 'message', option: centeredMessageOption('Set the "units" option to render this chart', theme) };
  }

  const root = opts.root || defaults.root;
  const sink = opts.sink || defaults.sink;
  const pctlVar = opts.percentileVar || defaults.percentileVar;

  const identity: ReplaceVariables = (s) => s;
  const replaceVariables = context.grafana.replaceVariables || context.panel.replaceVariables || identity;
  const pctl = replaceVariables(pctlVar) || '95';

  const panelData = context.panel.data;
  const seriesList = panelData ? panelData.series || [] : [];

  const parsed = parseSeries(seriesList, root);
  if (!parsed.paths.length) {
    return { kind: 'message', option: centeredMessageOption('No data', theme) };
  }

  const { nodeLat, edgeMap } = buildLatencyAndEdges(parsed, root);
  const dropNodes = dropZeroPredicates(nodeLat);
  const cleanEdges = computeCleanEdges(edgeMap, parsed.paths, dropNodes, root);

  return { kind: 'data', theme, units, root, sink, pctl, parsed, nodeLat, edgeMap, dropNodes, cleanEdges };
}
