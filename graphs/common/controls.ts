import { createEl } from './dom.js';
import { ICON } from './constants.js';
import type { EChartsLike } from './types.js';
import type { ChartTheme } from './theme.js';

export interface IconButtonSpec {
  right: number;
  glyph: string;
  glyphColor: string;
  glyphSize: number;
  onclick: () => void;
}

/** An ECharts graphic group: a rounded button with a centered glyph. */
export function iconButton(theme: ChartTheme, spec: IconButtonSpec): any {
  return {
    type: 'group',
    right: spec.right,
    bottom: 8,
    z: 100,
    onclick: spec.onclick,
    children: [
      { type: 'rect', shape: { width: ICON.size, height: ICON.size, r: 4 }, style: { fill: theme.buttonBg, stroke: theme.buttonStroke, lineWidth: 1 }, z2: 1 },
      { type: 'text', style: { text: spec.glyph, x: ICON.size / 2, y: ICON.size / 2, fill: spec.glyphColor, fontSize: spec.glyphSize, textAlign: 'center', textVerticalAlign: 'middle' }, z2: 2 },
    ],
  };
}

/** Right-edge offset for the Nth corner button (index 0 = rightmost). */
export function buttonOffset(index: number): number {
  return 8 + index * (ICON.size + ICON.gap);
}

/** Toggles an absolutely-positioned popover between hidden and flex. */
export function togglePopover(el: HTMLElement | null): void {
  if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}

/**
 * Builds a hidden min-% range-filter popover. This is the shared DOM shell and
 * lifecycle only; the caller supplies the actual filtering via `onChange`
 * (flow-graph hides nodes/links, gantt dims bars/arrows). Returns the element
 * (hidden until toggled), or null if one with `className` already exists.
 */
export function createRangeFilterPopover(
  chart: EChartsLike,
  theme: ChartTheme,
  className: string,
  onChange: (percent: number, setLabel: (text: string) => void) => void,
): HTMLElement | null {
  const container = chart.getDom();
  if (container.querySelector('.' + className)) return null;
  const wrap = createEl('div', {
    position: 'absolute',
    bottom: '36px',
    right: '8px',
    zIndex: '9999',
    display: 'none',
    alignItems: 'center',
    gap: '6px',
    background: theme.popoverBg,
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid ' + theme.popoverBorder,
  });
  wrap.className = className;
  const label = createEl('span', { color: theme.textMuted, fontSize: '10px', whiteSpace: 'nowrap' });
  label.textContent = 'Min: 0%';
  const slider = createEl('input', { width: '100px', accentColor: theme.dp, cursor: 'pointer' });
  slider.type = 'range';
  slider.min = '0';
  slider.max = '50';
  slider.value = '0';
  const setLabel = (t: string) => {
    label.textContent = t;
  };
  slider.addEventListener('input', () => onChange(parseInt(slider.value), setLabel));
  wrap.appendChild(label);
  wrap.appendChild(slider);
  container.style.position = 'relative';
  container.appendChild(wrap);
  return wrap;
}
