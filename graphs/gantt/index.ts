import type { EChartsOption } from 'echarts/types/dist/shared';
import type { GrafanaContext } from '../common/types.js';
import type { RenderGanttOptions } from './types.js';
import { GANTT_DEFAULTS } from './constants.js';
import { computeGanttLayout } from './layout.js';
import { buildArrows, assignChannels } from './arrows.js';
import { assembleGanttOption, buildGanttTooltip, buildGanttData } from './options.js';
import { buildGanttControls, setupGanttHover } from './interactions.js';
import { buildGanttMermaid } from './mermaid.js';
import { buildAdjacency } from '../common/graph.js';
import { prepareGraphInput } from '../common/render-input.js';
import { logVersion } from '../common/version.js';

function renderGantt(context: GrafanaContext, opts: RenderGanttOptions = { units: '' }): EChartsOption {
  logVersion('gantt');
  const prepared = prepareGraphInput(context, opts, GANTT_DEFAULTS);
  if (prepared.kind === 'message') return prepared.option;
  const { theme, units, root, sink, pctl, parsed, nodeLat, dropNodes, cleanEdges } = prepared;

  const layout = computeGanttLayout({
    paths: parsed.paths,
    nodeLat,
    cleanEdges,
    root,
    sink,
    dropNodes,
    palette: theme,
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
