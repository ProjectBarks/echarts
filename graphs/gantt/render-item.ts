import { GANTT } from './constants.js';

/** Bar series: rect + duration label for a real duration, diamond milestone when width collapses. */
export function barRenderItem(_params: any, api: any): any {
  const start = api.value(0) as number;
  const end = api.value(1) as number;
  const row = api.value(2) as number;
  const color = api.value(4) as string;
  const p0 = api.coord([start, row]);
  const p1 = api.coord([end, row]);
  const h = GANTT.barHeight;
  const width = p1[0] - p0[0];
  if (width < 1) {
    const cx = p0[0];
    const cy = p0[1];
    const r = h / 2;
    return {
      type: 'polygon',
      shape: { points: [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]] },
      style: { fill: color },
      z2: 10,
    };
  }
  const label = Math.round(end - start) + ' ms';
  const inside = width >= 42;
  const text = inside
    ? { type: 'text', style: { x: p1[0] - 7, y: p0[1], text: label, fill: 'rgba(0,0,0,0.72)', fontSize: 10, fontWeight: 'bold', textAlign: 'right', textVerticalAlign: 'middle' } }
    : { type: 'text', style: { x: p1[0] + 7, y: p0[1], text: label, fill: '#9aa0aa', fontSize: 10, textAlign: 'left', textVerticalAlign: 'middle' } };
  return {
    type: 'group',
    z2: 10,
    children: [
      { type: 'rect', shape: { x: p0[0], y: p0[1] - h / 2, width, height: h, r: 3 }, style: { fill: color, opacity: 0.95 } },
      text,
    ],
  };
}

interface Elbow {
  a: number[];
  b: number[];
  chX: number;
}

/** Compute the finish-to-start elbow: exit source, run to a lane channel, drop, enter target. */
function arrowElbow(api: any): Elbow {
  const srcEnd = api.value(0) as number;
  const srcRow = api.value(1) as number;
  const tgtStart = api.value(2) as number;
  const tgtRow = api.value(3) as number;
  const lane = api.value(4) as number;
  const a = api.coord([srcEnd, srcRow]);
  const b = api.coord([tgtStart, tgtRow]);
  const gap = b[0] - a[0];
  const off = (lane + 1) * GANTT.laneWidthPx;
  let chX: number;
  if (gap > GANTT.stubPx * 2) chX = Math.max(a[0] + GANTT.stubPx, b[0] - Math.min(off, gap - GANTT.stubPx));
  else chX = a[0] + off;
  return { a, b, chX };
}

/** Connector line only (rendered behind bars). */
export function arrowRenderItem(_params: any, api: any): any {
  const isCrit = api.value(5) as number;
  const e = arrowElbow(api);
  const color = isCrit ? GANTT.critArrow : GANTT.arrow;
  return {
    type: 'polyline',
    z2: isCrit ? 6 : 3,
    shape: { points: [[e.a[0], e.a[1]], [e.chX, e.a[1]], [e.chX, e.b[1]], [e.b[0], e.b[1]]] },
    style: { stroke: color, lineWidth: isCrit ? 2.2 : 1, fill: 'none' },
    silent: true,
  };
}

/** Arrowhead only (rendered on top of bars so it stays crisp). */
export function arrowHeadRenderItem(_params: any, api: any): any {
  const isCrit = api.value(5) as number;
  const e = arrowElbow(api);
  const head = GANTT.arrowHead;
  const color = isCrit ? GANTT.critArrow : GANTT.headMuted;
  return {
    type: 'polygon',
    shape: { points: [[e.b[0], e.b[1]], [e.b[0] - head, e.b[1] - head / 1.7], [e.b[0] - head, e.b[1] + head / 1.7]] },
    style: { fill: color },
    silent: true,
  };
}
