// Builds the minimal Grafana `context` that renderFlowGraph consumes.
//
// The render touches the DOM (a latency-threshold slider and a toast), so a
// real DOM must be present. Vitest provides one via its `jsdom` environment
// (see vitest.config.js), so we rely on the global `document` here.

export function buildContext(series, { width = 1200, height = 700 } = {}) {
  const dataSeries = series.map(([name, value]) => ({
    name,
    fields: [
      { type: 'time', values: [0] },
      { type: 'number', values: [value] },
    ],
  }));

  const container = document.createElement('div');
  const chart = {
    getDom: () => container,
    setOption() {},
  };

  return {
    grafana: { replaceVariables: (s) => (s === '$percentile' ? '95' : s) },
    panel: { width, height, data: { series: dataSeries }, chart },
  };
}

// Convenience: render a case by name and return a compact summary of the result.
export function renderSummary(renderFlowGraph, series) {
  const start = performance.now();
  const option = renderFlowGraph(buildContext(series), {});
  const ms = performance.now() - start;
  const s0 = (option.series && option.series[0]) || {};
  const data = Array.isArray(s0.data) ? s0.data : [];
  const links = Array.isArray(s0.links) ? s0.links : [];
  const drawnLinks = links.filter((l) => (l.lineStyle || {}).width > 0);
  return {
    ms,
    option,
    nodeCount: data.length,
    linkCount: links.length,
    drawnLinkCount: drawnLinks.length,
    nodeNames: data.map((n) => n.name),
    drawnEdges: drawnLinks.map((l) => `${l.source}->${l.target}`),
  };
}
