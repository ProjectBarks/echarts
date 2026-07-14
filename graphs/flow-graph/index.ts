import type { EChartsOption } from 'echarts/types/dist/shared';
import type { GrafanaContext } from '../common/types.js';
import type { RenderFlowGraphOptions } from './types.js';
import { DEFAULTS } from './constants.js';
import { findCriticalPath } from './data.js';
import { computeLayout } from './layout.js';
import { buildNodes } from './nodes.js';
import { buildLinks, buildTransitiveHoverEdges } from './links.js';
import { buildMermaid } from './mermaid.js';
import { setupSlider, buildGraphicButtons } from './interactions.js';
import { buildTooltipFormatter, assembleOption } from './options.js';
import { prepareGraphInput } from '../common/render-input.js';
import { logVersion } from '../common/version.js';

function renderFlowGraph(context: GrafanaContext, opts: RenderFlowGraphOptions = { units: '' }): EChartsOption {
  logVersion('flow-graph');
  const prepared = prepareGraphInput(context, opts, DEFAULTS);
  if (prepared.kind === 'message') return prepared.option;
  const { theme, units, root, sink, pctl, parsed, nodeLat, cleanEdges, dropNodes } = prepared;
  const { hasTaskDurations } = parsed;

  const nodeSpacing = opts.nodeSpacing || DEFAULTS.nodeSpacing;
  const nodeSize = opts.nodeSize || DEFAULTS.nodeSize;
  const { crit, critSet, critTotal } = findCriticalPath(parsed.paths, nodeLat, root);

  const width = context.panel.width || 1200;
  const height = context.panel.height || 700;
  const layout = computeLayout({
    paths: parsed.paths,
    nodeLat,
    cleanEdges,
    critSet,
    root,
    sink,
    width,
    height,
    nodeSpacing,
    dropNodes,
  });
  const { nodePos, cumulLat, maxCumul, maxLat, fwd, bwd } = layout;

  const nodes = buildNodes(nodeLat, { nodePos, cumulLat, maxCumul, critSet, nodeSize, root, sink, units, theme });
  const links = buildLinks(cleanEdges, critSet, theme);
  for (const l of buildTransitiveHoverEdges(nodeLat, fwd, bwd, cleanEdges, theme)) links.push(l);

  const cats = [
    { name: 'flow start', itemStyle: { color: theme.meta } },
    { name: 'predicate', itemStyle: { color: theme.gate } },
    { name: 'data provider', itemStyle: { color: theme.dp } },
    { name: 'sink', itemStyle: { color: theme.meta } },
    { name: 'critical', itemStyle: { color: theme.crit } },
  ];
  const critChain = crit.path.split('_').join(' → ');

  const chart = context.panel.chart;
  const fullNodes = nodes as unknown as any[];
  const fullLinks = links as unknown as any[];
  const critOnlyNodes = fullNodes.filter((n) => critSet.has(n.name));
  const critOnlyLinks = fullLinks.filter(
    (l) => critSet.has(l.source) && critSet.has(l.target) && (l.lineStyle || {}).width > 0,
  );

  const sliderPopover = setupSlider(chart, { fullNodes, fullLinks, nodeLat, maxLat, critSet, root, sink, theme });
  const graphic = buildGraphicButtons(chart, {
    buildMermaid: () => buildMermaid(nodeLat, cleanEdges, critSet, units, theme.crit, theme.emphasisLabel),
    sliderPopover,
    fullNodes,
    fullLinks,
    critOnlyNodes,
    critOnlyLinks,
    theme,
  });

  const formatter = buildTooltipFormatter({ nodeLat, cumulLat, critSet, critTotal, pctl, hasTaskDurations, root, sink, units, theme });
  const subtext = 'Critical path ≤ ' + Math.round(critTotal) + ' ' + units + ' p' + pctl + ' — ' + critChain;

  return assembleOption({
    nodes,
    links,
    cats,
    graphic,
    subtext,
    critColor: theme.crit,
    formatter,
    legendData: cats.map((c) => c.name),
    theme,
  });
}

export const FlowGraph = { render: renderFlowGraph } as const;
