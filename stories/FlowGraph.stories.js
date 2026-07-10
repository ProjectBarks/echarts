import { FlowGraph } from '../dist/index.js';
import { renderChart } from './helpers.js';
import anon201 from '../test/fixtures/gantt/anon-201.json';
import anon200 from '../test/fixtures/gantt/anon-200.json';

export default {
  title: 'Charts/FlowGraph',
  parameters: { layout: 'fullscreen' },
};

// Anonymized capture 201: the DAG view of the same compact flow.
export const Panel201 = () => renderChart(FlowGraph.render, anon201, { units: 'ms' });

// Anonymized capture 200: the large flow, barycenter-laid-out.
export const Panel200 = () => renderChart(FlowGraph.render, anon200, { units: 'ms' });

// Guardrail: rendering without the required `units` option shows the alert.
export const MissingUnits = () => renderChart(FlowGraph.render, anon201, {});
