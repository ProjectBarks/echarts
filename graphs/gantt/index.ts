import type { EChartsOption } from 'echarts/types/dist/shared';
import type { GrafanaContext, ReplaceVariables } from '../common/types.js';
import type { RenderGanttOptions } from './types.js';
import { GANTT_DEFAULTS } from './constants.js';
import {
  parseSeries,
  buildLatencyAndEdges,
  dropZeroPredicates,
  computeCleanEdges,
} from '../common/path-metrics.js';
import { computeGanttLayout } from './layout.js';
import { buildArrows, assignChannels } from './arrows.js';
import { assembleGanttOption, buildGanttTooltip, buildGanttData } from './options.js';
import { buildGanttControls, setupGanttHover } from './interactions.js';
import { buildGanttMermaid } from './mermaid.js';
import { buildAdjacency } from '../common/graph.js';
import { pickTheme } from '../common/theme.js';
import { logVersion } from '../common/version.js';

function renderGantt(context: GrafanaContext, opts: RenderGanttOptions = { units: '' }): EChartsOption {
  logVersion('gantt');
  const theme = pickTheme(opts.theme, context.grafana && context.grafana.theme);
  const units = (opts.units || '').trim();
  if (!units) {
    return {
      title: { text: 'Set the "units" option to render this chart', left: 'center', top: 'center', textStyle: { color: theme.alertText } },
    } as unknown as EChartsOption;
  }

  const root = opts.root || GANTT_DEFAULTS.root;
  const sink = opts.sink || GANTT_DEFAULTS.sink;
  const pctlVar = opts.percentileVar || GANTT_DEFAULTS.percentileVar;

  const identity: ReplaceVariables = (s) => s;
  const replaceVariables = context.grafana.replaceVariables || context.panel.replaceVariables || identity;
  const pctl = replaceVariables(pctlVar) || '95';

  const panelData = context.panel.data;
  const seriesList = panelData ? panelData.series || [] : [];

  const parsed = parseSeries(seriesList, root);
  if (!parsed.paths.length) {
    return {
      title: { text: 'No data', left: 'center', top: 'center', textStyle: { color: theme.alertText } },
    } as unknown as EChartsOption;
  }

  const { nodeLat, edgeMap } = buildLatencyAndEdges(parsed, root);
  const dropNodes = dropZeroPredicates(nodeLat);
  const cleanEdges = computeCleanEdges(edgeMap, parsed.paths, dropNodes, root);

  const layout = computeGanttLayout({
    paths: parsed.paths,
    nodeLat,
    cleanEdges,
    root,
    sink,
    dropNodes,
  });

  const arrows = buildArrows(layout.barByName, layout.depth, layout.critSet);
  assignChannels(arrows);

  const rowNames = layout.bars.map((b) => b.name);
  const critChain = layout.critChain.join(' → ');
  const subtext = 'Critical path ≤ ' + Math.round(layout.critTotal) + ' ' + units + ' p' + pctl + ' — ' + critChain;
  const formatter = buildGanttTooltip({ barByName: layout.barByName, critTotal: layout.critTotal, pctl, units, theme });

  const { barData, arrowData } = buildGanttData(layout.bars, arrows, units);
  const chart = context.panel.chart;
  const maxLat = Object.keys(nodeLat).reduce((m, k) => Math.max(m, nodeLat[k] || 0), 0);
  const controls = chart
    ? buildGanttControls(chart, {
        barData,
        arrowData,
        critSet: layout.critSet,
        nodeLat,
        maxLat,
        buildMermaid: () => buildGanttMermaid(layout.bars, units),
        theme,
      })
    : { graphic: undefined };

  if (chart && chart.on) {
    const { fwd, bwd } = buildAdjacency(Object.keys(cleanEdges));
    setupGanttHover({ chart, barData, arrowData, fwd, bwd });
  }

  return assembleGanttOption({ bars: layout.bars, arrows, rowNames, subtext, formatter, units, graphic: controls.graphic, theme });
}

export const Gantt = { render: renderGantt } as const;
