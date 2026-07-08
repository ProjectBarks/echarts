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

export function renderFlowGraph(context: GrafanaContext, opts: RenderFlowGraphOptions = {}): EChartsOption {
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
      title: { text: 'No data', left: 'center', top: 'center', textStyle: { color: '#ccc' } },
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

  const nodes = buildNodes(nodeLat, { nodePos, cumulLat, maxCumul, critSet, nodeSize, root, sink });
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

  const sliderPopover = setupSlider(chart, { fullNodes, fullLinks, nodeLat, maxLat, critSet, root, sink });
  const graphic = buildGraphicButtons(chart, {
    buildMermaid: () => buildMermaid(nodeLat, cleanEdges, critSet),
    sliderPopover,
    fullNodes,
    fullLinks,
    critOnlyNodes,
    critOnlyLinks,
  });

  const formatter = buildTooltipFormatter({ nodeLat, cumulLat, critSet, critTotal, pctl, hasTaskDurations, root, sink });
  const subtext = 'Critical path ≤ ' + Math.round(critTotal) + ' ms p' + pctl + ' — ' + critChain;

  return assembleOption({
    nodes,
    links,
    cats,
    graphic,
    subtext,
    critColor: COLORS.crit,
    formatter,
    legendData: cats.map((c) => c.name),
  });
}
