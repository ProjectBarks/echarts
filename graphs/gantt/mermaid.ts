import type { GanttBar } from './types.js';

/**
 * Mermaid export for the Gantt view: emits a `gantt` diagram (matching what the
 * chart shows) rather than a flowchart. Bars use the earliest-start schedule as
 * explicit numeric start/end (dateFormat x = ms since epoch, so relative spacing
 * and durations are preserved exactly), and critical-path tasks are tagged
 * `crit`. Zero-duration tasks are floored to a 1-unit bar so they stay visible.
 */
export function buildGanttMermaid(bars: GanttBar[], units: string): string {
  let md = 'gantt\n';
  md += '    title Task schedule (' + units + ')\n';
  md += '    dateFormat x\n';
  md += '    axisFormat %L\n';
  md += '    section Tasks\n';
  for (const b of bars) {
    const id = b.name.replace(/[^0-9A-Za-z_]/g, '_');
    const start = Math.round(b.start);
    const end = Math.max(Math.round(b.end), start + 1);
    const tag = b.isCrit ? 'crit, ' : '';
    md += '    ' + b.name + ' :' + tag + id + ', ' + start + ', ' + end + '\n';
  }
  return md;
}
