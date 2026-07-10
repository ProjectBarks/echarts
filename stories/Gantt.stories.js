import { Gantt } from '../dist/index.js';
import { renderChart } from './helpers.js';
import anon201 from '../test/fixtures/gantt/anon-201.json';
import anon200 from '../test/fixtures/gantt/anon-200.json';

export default {
  title: 'Charts/Gantt',
  parameters: { layout: 'fullscreen' },
};

// Anonymized capture 201: a compact flow with a clear critical path.
export const Panel201Dark = () => renderChart(Gantt.render, anon201, { units: 'ms', theme: 'dark' });
export const Panel201Light = () => renderChart(Gantt.render, anon201, { units: 'ms', theme: 'light' });

// Anonymized capture 200: a large flow that stresses connector routing.
export const Panel200Dark = () => renderChart(Gantt.render, anon200, { units: 'ms', theme: 'dark' });
export const Panel200Light = () => renderChart(Gantt.render, anon200, { units: 'ms', theme: 'light' });

// Guardrail: rendering without the required `units` option shows the alert.
export const MissingUnits = () => renderChart(Gantt.render, anon201, {});
