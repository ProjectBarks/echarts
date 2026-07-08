# echarts-internal

<div align="center">

**Reusable ECharts graph scripts for Grafana — complex computation, simple imports.**

[![npm version](https://img.shields.io/npm/v/echarts-internal.svg?style=flat-square&color=ff6b6b)](https://www.npmjs.com/package/echarts-internal)
[![bundle size](https://img.shields.io/bundlephobia/minzip/echarts-internal?style=flat-square&color=ffa94d)](https://bundlephobia.com/package/echarts-internal)
[![license](https://img.shields.io/github/license/ProjectBarks/echarts-internal?style=flat-square&color=69db7c)](LICENSE)

[Graphs](#available-graphs) · [Quick Start](#quick-start) · [Grafana Setup](#grafana-business-charts) · [Contributing](#add-a-new-graph)

</div>

---

## The Problem

Grafana's [Business Charts](https://volkovlabs.io/plugins/business-charts/) plugin gives you raw ECharts — but building a polished, interactive visualization means writing hundreds of lines of layout logic, color scales, interactive filtering, and edge-crossing minimization inside a tiny code editor.

## The Solution

Drop in a single import. Each graph in this repo handles the hard computation so your panel code stays one line:

```js
import("https://esm.sh/echarts-internal").then(({ renderFlowGraph }) => {
  context.panel.chart.setOption(renderFlowGraph(context));
});
```

---

## Available Graphs

| Graph | Import | Description |
|-------|--------|-------------|
| **Flow Graph** | `renderFlowGraph` | DAG node graph with critical path detection, barycenter layout, gradient fills, mermaid export, and latency threshold slider |

> More coming — PRs welcome! See [Add a New Graph](#add-a-new-graph) below.

---

## Quick Start

### Via esm.sh (recommended for Grafana)

```js
import("https://esm.sh/echarts-internal").then(({ renderFlowGraph }) => {
  context.panel.chart.setOption(renderFlowGraph(context));
});
```

Import a specific graph directly:

```js
import("https://esm.sh/echarts-internal/graphs/flow-graph").then(({ renderFlowGraph }) => {
  context.panel.chart.setOption(renderFlowGraph(context));
});
```

### Via npm

```bash
npm install echarts-internal
```

```js
import { renderFlowGraph } from "echarts-internal";
import { renderFlowGraph } from "echarts-internal/flow-graph";
```

---

## Grafana Business Charts

These scripts are designed for [Grafana Business Charts](https://volkovlabs.io/plugins/business-charts/) (ECharts panel plugin). Each graph documents its expected query shape — just wire up the data and call the function.

---

## Flow Graph

Turns flat path metrics into an interactive DAG with critical path analysis.

### Queries

| Query | Purpose | Example metric |
|-------|---------|---------------|
| **A** | Path topology + cumulative latency | `workflow.taskflow.path.taskrunning.duration` |
| **B** | Individual task latency (optional) | `workflow.task.duration` |

**Query A** series names must be underscore-joined paths (e.g., `taskA_taskB_taskC`).
**Query B** series names must be single task names (e.g., `taskA`).

### Usage

```js
// Minimal
return renderFlowGraph(context);

// With options
return renderFlowGraph(context, {
  root: 'FLOW_START',
  sink: 'setresults',
  nodeSpacing: 52,
  nodeSize: 18,
  percentileVar: '$percentile',
});
```

### Features

- **Automatic DAG layout** — BFS depth + barycenter ordering (8 iterations) minimizes edge crossings
- **Critical path detection** — longest path highlighted in red with total latency subtitle
- **Dual-metric stitching** — path metrics for topology, task metrics for accurate per-node latency
- **Gradient-filled nodes** — bottom-up fill shows cumulative latency as % of max chain
- **Interactive hover** — full ancestor/descendant chain highlight via invisible transitive edges
- **📋 Copy to Mermaid** — one-click flowchart export
- **⚡ Critical path toggle** — filter to critical-only view
- **◔ Latency threshold slider** — fade nodes below N% of max latency
- **Fallback math** — if only path metrics available, approximates via path subtraction

### Options

| Key | Default | Description |
|-----|---------|-------------|
| `root` | `'FLOW_START'` | Root/source node name |
| `sink` | `'setresults'` | Sink/terminal node name |
| `nodeSpacing` | `52` | Vertical spacing between nodes (px) |
| `nodeSize` | `18` | Node circle diameter |
| `percentileVar` | `'$percentile'` | Grafana variable for percentile |

---

## Add a New Graph

1. Create `graphs/your-graph.js` exporting a function that takes `(context, options?)` and returns an ECharts option object
2. Re-export from `index.js`
3. Add an entry to the `exports` map in `package.json`
4. Document the expected query shape and options in this README

```js
// graphs/your-graph.js
export function renderYourGraph(context, opts = {}) {
  const series = context.panel.data.series || [];
  // ... your computation ...
  return { /* ECharts option */ };
}
```

---

## License

MIT © [ProjectBarks](https://github.com/ProjectBarks)
