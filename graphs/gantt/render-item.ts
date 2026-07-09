import { GANTT } from './constants.js';

/** Pixel height of one category row, used to scale bars to the available space. */
function bandHeight(api: any): number {
  const s = api.size ? api.size([0, 1]) : [0, GANTT.barHeight];
  const band = Array.isArray(s) ? s[1] : GANTT.barHeight;
  return band || GANTT.barHeight;
}

/** Bar thickness derived from the row band so dense charts stay legible. */
function barThickness(api: any): number {
  const band = bandHeight(api);
  return Math.max(6, Math.min(GANTT.barHeight, Math.round(band * 0.6)));
}

/**
 * Bar series. Positions are true milliseconds (value 0/1 = start/end); a pixel
 * floor keeps sub-millisecond bars visible. Label shows exact ms duration.
 */
export function barRenderItem(_params: any, api: any): any {
  const start = api.value(0) as number;
  const end = api.value(1) as number;
  const row = api.value(2) as number;
  const color = api.value(4) as string;
  const durMs = api.value(5) as number;
  const unit = (api.value(6) as string) || '';
  const op = api.value(7) as number;
  const opacity = op === undefined ? 1 : op;
  const p0 = api.coord([start, row]);
  const p1 = api.coord([end, row]);
  const h = barThickness(api);
  const width = Math.max(p1[0] - p0[0], GANTT.minBarPx);
  const rounded = Math.round(durMs);
  const rx = p0[0] + width;
  const children: any[] = [
    { type: 'rect', shape: { x: p0[0], y: p0[1] - h / 2, width, height: h, r: 3 }, style: { fill: color, opacity: 0.95 * opacity } },
  ];
  if (rounded >= 1 && opacity > 0.5) {
    const label = rounded + ' ' + unit;
    const inside = width >= 42;
    children.push(
      inside
        ? { type: 'text', style: { x: rx - 7, y: p0[1], text: label, fill: 'rgba(0,0,0,0.72)', fontSize: 10, fontWeight: 'bold', textAlign: 'right', textVerticalAlign: 'middle' } }
        // Outside label sits past the source's exit stub so the connector leaving
        // the bar's front never draws through the text.
        : { type: 'text', style: { x: rx + GANTT.exitPx + 8, y: p0[1], text: label, fill: '#8b909a', fontSize: 9, textAlign: 'left', textVerticalAlign: 'middle' } },
    );
  }
  return { type: 'group', z2: 10, children };
}

interface Elbow {
  points: number[][]; // orthogonal polyline from the source's finish to the arrowhead
  head: number[]; // arrowhead tip on the target's left (start) edge
}

/**
 * Connector geometry: a finish-to-start dependency, always drawn from the
 * SOURCE's finish (right edge) to the TARGET's start (left edge), as an
 * orthogonal (Manhattan) polyline with fixed-length "jetty" stubs at both ports
 * (the pattern used by orthogonal routers like ELK / draw.io).
 *
 * The line always leaves the source's front by a minimum `exitPx` stub and always
 * enters the target's left edge behind a minimum `approachPx` stub, so the
 * arrowhead (which always points RIGHT into the target's start) is guaranteed a
 * real trailing segment. The number of turns adapts to the geometry:
 *  - room ahead (target starts past the source's finish + stubs): a single
 *    vertical channel -> 3 turns (out, down, in);
 *  - tight / zero gap (target starts at or before the source's finish, the common
 *    staircase and the star of edges off the root): the path wraps with extra
 *    turns - out the source's right, down to a routing lane, back left to the
 *    approach channel, down to the target row, then in - so it still ends at the
 *    target's start pointing right and never doubles an arrowhead onto a side.
 *
 * The approach channel is derived from the target, so edges into one target
 * column share it; lane spacing separates distinct sources (see assignChannels).
 */
function arrowElbow(api: any): Elbow {
  const srcEnd = api.value(0) as number;
  const srcRow = api.value(1) as number;
  const tgtStart = api.value(2) as number;
  const tgtRow = api.value(3) as number;
  const lane = api.value(4) as number;
  const srcStart = api.value(6) as number;
  const band = bandHeight(api);
  const aStartX = api.coord([srcStart, srcRow])[0];
  const aEnd = api.coord([srcEnd, srcRow]);
  const b = api.coord([tgtStart, tgtRow]);
  // Front (right/finish edge) of the rendered source, honoring the pixel-width
  // floor, at the row center; and the target's start (left edge) at its center.
  const srcFrontX = Math.max(aEnd[0], aStartX + GANTT.minBarPx);
  const srcY = aEnd[1];
  const tgtX = b[0];
  const tgtY = b[1];
  const exitX = srcFrontX + GANTT.exitPx; // end of the source's exit stub
  const appX = tgtX - GANTT.approachPx - lane * GANTT.laneWidthPx; // approach channel
  const head = [tgtX, tgtY];
  if (appX >= exitX) {
    // Room ahead: single vertical channel. First segment (front -> channel) is at
    // least exitPx long, so the exit stub is preserved.
    return { points: [[srcFrontX, srcY], [appX, srcY], [appX, tgtY], [tgtX, tgtY]], head };
  }
  // Tight / wrap: route through a horizontal lane just outside the source row so
  // the exit stub, the back-track, and the approach stub are all real segments.
  const midY = tgtY >= srcY ? srcY + band / 2 : srcY - band / 2;
  return {
    points: [
      [srcFrontX, srcY],
      [exitX, srcY],
      [exitX, midY],
      [appX, midY],
      [appX, tgtY],
      [tgtX, tgtY],
    ],
    head,
  };
}

/** Connector line only (rendered behind bars). */
export function arrowRenderItem(_params: any, api: any): any {
  const isCrit = api.value(5) as number;
  const op = api.value(7) as number;
  const a = op === undefined ? 1 : op;
  const e = arrowElbow(api);
  const color = isCrit ? GANTT.critArrow : GANTT.arrow;
  return {
    type: 'polyline',
    z2: isCrit ? 6 : 3,
    shape: { points: e.points },
    style: { stroke: color, lineWidth: isCrit ? 2 : 1, fill: 'none', opacity: a },
    silent: true,
  };
}

/** Arrowhead only (rendered on top of bars). Always points right into the target's start. */
export function arrowHeadRenderItem(_params: any, api: any): any {
  const isCrit = api.value(5) as number;
  const op = api.value(7) as number;
  const a = op === undefined ? 1 : op;
  const e = arrowElbow(api);
  const s = GANTT.arrowHead;
  const color = isCrit ? GANTT.critArrow : GANTT.headMuted;
  const [x, y] = e.head;
  return {
    type: 'polygon',
    shape: { points: [[x, y], [x - s, y - s / 1.9], [x - s, y + s / 1.9]] },
    style: { fill: color, opacity: a },
    silent: true,
  };
}
