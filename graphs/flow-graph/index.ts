import type { EChartsOption } from 'echarts/types/dist/shared';
import type { GrafanaContext, ReplaceVariables } from '../common/types.js';
import type { RenderFlowGraphOptions } from './types.js';
import { DEFAULTS, COLORS } from './constants.js';
import { parseSeries, buildLatencyAndEdges, findCriticalPath, dropZeroPredicates, computeCleanEdges } from './data.js';
import { computeLayout } from './layout.js';
import { buildNodes } from './nodes.js';
import { buildLinks, buildTransitiveHoverEdges } from './links.js';
import { buildMermaid } from './mermaid.js';
import { setupSlider, buildGraphicButtons } from './interactions.js';
import { buildTooltipFormatter, assembleOption } from './options.js';
import { pickTheme } from '../common/theme.js';

function renderFlowGraph(context: GrafanaContext, opts: RenderFlowGraphOptions = { units: '' }): EChartsOption {
  const units = (opts.units || '').trim();
  const theme = pickTheme(opts.theme, context.grafana && context.grafana.theme);
  if (!units) {
    return {
      title: { text: 'Set the "units" option to render this chart', left: 'center', top: 'center', textStyle: { color: theme.alertText } },
    } as unknown as EChartsOption;
  }
  const root = opts.root || DEFAULTS.root;
  const sink = opts.sink || DEFAULTS.sink;
  const nodeSpacing = opts.nodeSpacing || DEFAULTS.nodeSpacing;
  const nodeSize = opts.nodeSize || DEFAULTS.nodeSize;
  const pctlVar = opts.percentileVar || DEFAULTS.percentileVar;

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
  const { hasTaskDurations } = parsed;

  const { nodeLat, edgeMap } = buildLatencyAndEdges(parsed, root);
  const { crit, critSet, critTotal } = findCriticalPath(parsed.paths, nodeLat, root);
  const dropNodes = dropZeroPredicates(nodeLat);
  const cleanEdges = computeCleanEdges(edgeMap, parsed.paths, dropNodes, root);

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
  const links = buildLinks(cleanEdges, critSet);
  for (const l of buildTransitiveHoverEdges(nodeLat, fwd, bwd, cleanEdges)) links.push(l);

  const cats = [
    { name: 'flow start', itemStyle: { color: COLORS.meta } },
    { name: 'predicate', itemStyle: { color: COLORS.gate } },
    { name: 'data provider', itemStyle: { color: COLORS.dp } },
    { name: 'sink', itemStyle: { color: COLORS.meta } },
    { name: 'critical', itemStyle: { color: COLORS.crit } },
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
    buildMermaid: () => buildMermaid(nodeLat, cleanEdges, critSet, units),
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
    critColor: COLORS.crit,
    formatter,
    legendData: cats.map((c) => c.name),
    theme,
  });
}

export const FlowGraph = { render: renderFlowGraph } as const;
