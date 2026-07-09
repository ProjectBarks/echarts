import type { EChartsOption } from 'echarts/types/dist/shared';
import type { GrafanaContext, ReplaceVariables } from '../common/types.js';
import type { RenderGanttOptions } from './types.js';
import { GANTT_DEFAULTS } from './constants.js';
import {
  parseSeries,
  buildLatencyAndEdges,
  findCriticalPath,
  dropZeroPredicates,
  computeCleanEdges,
} from '../common/path-metrics.js';
import { computeGanttLayout } from './layout.js';
import { buildArrows, assignChannels } from './arrows.js';
import { assembleGanttOption, buildGanttTooltip } from './options.js';

function renderGantt(context: GrafanaContext, opts: RenderGanttOptions = {}): EChartsOption {
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
      title: { text: 'No data', left: 'center', top: 'center', textStyle: { color: '#ccc' } },
    } as unknown as EChartsOption;
  }

  const { nodeLat, edgeMap } = buildLatencyAndEdges(parsed, root);
  const crit = findCriticalPath(parsed.paths, nodeLat, root);
  const dropNodes = dropZeroPredicates(nodeLat);
  const cleanEdges = computeCleanEdges(edgeMap, parsed.paths, dropNodes, root);

  const layout = computeGanttLayout({
    paths: parsed.paths,
    nodeLat,
    cleanEdges,
    critSet: crit.critSet,
    root,
    sink,
    dropNodes,
  });

  const arrows = buildArrows(cleanEdges, layout.barByName, layout.depth, crit.critSet);
  assignChannels(arrows);

  const rowNames = layout.bars.map((b) => b.name);
  const critChain = crit.crit.path.split('_').join(' → ');
  const subtext = 'Critical path ≤ ' + Math.round(crit.critTotal) + ' ms p' + pctl + ' — ' + critChain;
  const formatter = buildGanttTooltip({ barByName: layout.barByName, critTotal: crit.critTotal, pctl });

  return assembleGanttOption({ bars: layout.bars, arrows, rowNames, subtext, formatter });
}

export const Gantt = { render: renderGantt } as const;
