import type { EChartsLike, NodeLatMap } from '../common/types.js';
import { showToast, createEl } from '../common/dom.js';
import { ICON } from './constants.js';
import type { ChartTheme } from '../common/theme.js';

export interface SliderCtx {
  fullNodes: any[];
  fullLinks: any[];
  nodeLat: NodeLatMap;
  maxLat: number;
  critSet: Set<string>;
  root: string;
  sink: string;
  theme: ChartTheme;
}

export function setupSlider(chart: EChartsLike, ctx: SliderCtx): HTMLElement | null {
  const { fullNodes, fullLinks, nodeLat, maxLat, critSet, root, sink, theme } = ctx;
  const container = chart.getDom();
  if (container.querySelector('.lat-slider')) return null;
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
  wrap.className = 'lat-slider';
  const label = createEl('span', { color: theme.textMuted, fontSize: '10px', whiteSpace: 'nowrap' });
  label.textContent = 'Min: 0%';
  const slider = createEl('input', { width: '100px', accentColor: theme.dp, cursor: 'pointer' });
  slider.type = 'range';
  slider.min = '0';
  slider.max = '50';
  slider.value = '0';
  slider.addEventListener('input', () => {
    const pctVal = parseInt(slider.value) / 100;
    const threshold = pctVal * maxLat;
    label.textContent = 'Min: ' + slider.value + '%';
    const keepSet = new Set<string>();
    for (const n of fullNodes) {
      const l = nodeLat[n.name] || 0;
      if (n.name === root || n.name === sink || critSet.has(n.name) || l >= threshold) keepSet.add(n.name);
    }
    const filtered = fullNodes.map((n) =>
      Object.assign({}, n, {
        itemStyle: Object.assign({}, n.itemStyle, { opacity: keepSet.has(n.name) ? 1 : 0.08 }),
        label: Object.assign({}, n.label, { show: keepSet.has(n.name) }),
      }),
    );
    const filteredLinks = fullLinks.map((l) =>
      Object.assign({}, l, {
        lineStyle: Object.assign({}, l.lineStyle, {
          opacity: keepSet.has(l.source) && keepSet.has(l.target) ? (l.lineStyle || {}).opacity || 0.8 : 0.03,
        }),
      }),
    );
    chart.setOption({ series: [{ data: filtered, links: filteredLinks }] });
  });
  wrap.appendChild(label);
  wrap.appendChild(slider);
  container.style.position = 'relative';
  container.appendChild(wrap);
  return wrap;
}

export interface GraphicCtx {
  buildMermaid: () => string;
  sliderPopover: HTMLElement | null;
  fullNodes: any[];
  fullLinks: any[];
  critOnlyNodes: any[];
  critOnlyLinks: any[];
  theme: ChartTheme;
}

export function buildGraphicButtons(chart: EChartsLike, ctx: GraphicCtx): any[] {
  const { buildMermaid, sliderPopover, fullNodes, fullLinks, critOnlyNodes, critOnlyLinks, theme } = ctx;
  const icoS = ICON.size;
  const icoGap = ICON.gap;
  const container = chart.getDom();
  let critOnly = false;
  return [
    {
      type: 'group',
      right: icoS * 2 + icoGap * 2 + 8,
      bottom: 8,
      z: 100,
      onclick: function () {
        navigator.clipboard.writeText(buildMermaid());
        showToast(container, 'Mermaid copied', theme);
      },
      children: [
        {
          type: 'rect',
          shape: { width: icoS, height: icoS, r: 4 },
          style: { fill: theme.buttonBg, stroke: theme.buttonStroke, lineWidth: 1 },
          z2: 1,
        },
        {
          type: 'text',
          style: { text: '📋', x: icoS / 2, y: icoS / 2, fill: theme.buttonGlyph, fontSize: 12, textAlign: 'center', textVerticalAlign: 'middle' },
          z2: 2,
        },
      ],
    },
    {
      type: 'group',
      right: icoS + icoGap + 8,
      bottom: 8,
      z: 100,
      onclick: function () {
        critOnly = !critOnly;
        chart.setOption({
          series: [{ data: critOnly ? critOnlyNodes : fullNodes, links: critOnly ? critOnlyLinks : fullLinks }],
        });
      },
      children: [
        {
          type: 'rect',
          shape: { width: icoS, height: icoS, r: 4 },
          style: { fill: theme.buttonBg, stroke: theme.buttonStroke, lineWidth: 1 },
          z2: 1,
        },
        {
          type: 'text',
          style: { text: '⚡', x: icoS / 2, y: icoS / 2, fill: theme.crit, fontSize: 13, textAlign: 'center', textVerticalAlign: 'middle' },
          z2: 2,
        },
      ],
    },
    {
      type: 'group',
      right: 8,
      bottom: 8,
      z: 100,
      onclick: function () {
        if (sliderPopover) sliderPopover.style.display = sliderPopover.style.display === 'none' ? 'flex' : 'none';
      },
      children: [
        {
          type: 'rect',
          shape: { width: icoS, height: icoS, r: 4 },
          style: { fill: theme.buttonBg, stroke: theme.buttonStroke, lineWidth: 1 },
          z2: 1,
        },
        {
          type: 'text',
          style: { text: '◔', x: icoS / 2, y: icoS / 2, fill: theme.dp, fontSize: 14, textAlign: 'center', textVerticalAlign: 'middle' },
          z2: 2,
        },
      ],
    },
  ];
}
