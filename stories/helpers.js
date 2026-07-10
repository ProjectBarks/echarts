import * as echarts from 'echarts';

// Builds the minimal Grafana `context` the chart renderers consume and mounts a
// real ECharts instance so the interactive widgets (legend, crit-only, min-%
// filter, hover) and the option's `graphic`/event wiring are exercised in the
// story exactly as they are in a live Grafana panel.
//
// `series` is the raw fixture array: [{ name, fields: [ {type:'time',...}, {type:'number',...} ] }].
export function renderChart(renderFn, series, opts) {
  const width = 1400;
  const height = 900;
  const el = document.createElement('div');
  el.style.width = width + 'px';
  el.style.height = height + 'px';
  // The chart root is transparent, so the story paints the surrounding surface
  // to match the requested theme (this is what a Grafana light/dark panel does).
  el.style.background = opts && opts.theme === 'light' ? '#ffffff' : '#14161c';

  // echarts.init needs explicit dimensions because the element is not yet laid
  // out when Storybook calls the story function.
  const mount = () => {
    const chart = echarts.init(el, null, { renderer: 'canvas', width, height });
    const context = {
      grafana: { replaceVariables: (s) => (s === '$percentile' ? '95' : s) },
      panel: { width, height, data: { series }, chart },
    };
    chart.setOption(renderFn(context, opts));
    // Signal to the screenshot runner that the chart has painted.
    window.__story_ready = true;
  };

  // Defer until the element is attached so getDom()-based widgets see the DOM.
  requestAnimationFrame(mount);
  return el;
}
