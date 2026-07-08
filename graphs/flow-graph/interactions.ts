import type { EChartsLike, NodeLatMap } from '../common/types.js';
import { showToast, createEl } from '../common/dom.js';
import { ICON } from './constants.js';

export interface SliderCtx {
  fullNodes: any[];
  fullLinks: any[];
  nodeLat: NodeLatMap;
  maxLat: number;
  critSet: Set<string>;
  root: string;
  sink: string;
}

export function setupSlider(chart: EChartsLike, ctx: SliderCtx): HTMLElement | null {
  const { fullNodes, fullLinks, nodeLat, maxLat, critSet, root, sink } = ctx;
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
    background: 'rgba(30,33,40,0.95)',
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid rgba(150,150,160,0.3)',
  });
  wrap.className = 'lat-slider';
  const label = createEl('span', { color: '#999', fontSize: '10px', whiteSpace: 'nowrap' });
  label.textContent = 'Min: 0%';
  const slider = createEl('input', { width: '100px', accentColor: '#ffa94d', cursor: 'pointer' });
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
}

export function buildGraphicButtons(chart: EChartsLike, ctx: GraphicCtx): any[] {
  const { buildMermaid, sliderPopover, fullNodes, fullLinks, critOnlyNodes, critOnlyLinks } = ctx;
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
        showToast(container, 'Mermaid copied');
      },
      children: [
        {
          type: 'rect',
          shape: { width: icoS, height: icoS, r: 4 },
          style: { fill: 'rgba(60,63,70,0.9)', stroke: 'rgba(150,150,160,0.4)', lineWidth: 1 },
          z2: 1,
        },
        {
          type: 'text',
          style: { text: '📋', x: icoS / 2, y: icoS / 2, fill: '#aaa', fontSize: 12, textAlign: 'center', textVerticalAlign: 'middle' },
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
          style: { fill: 'rgba(60,63,70,0.9)', stroke: 'rgba(150,150,160,0.4)', lineWidth: 1 },
          z2: 1,
        },
        {
          type: 'text',
          style: { text: '⚡', x: icoS / 2, y: icoS / 2, fill: '#ff6b6b', fontSize: 13, textAlign: 'center', textVerticalAlign: 'middle' },
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
          style: { fill: 'rgba(60,63,70,0.9)', stroke: 'rgba(150,150,160,0.4)', lineWidth: 1 },
          z2: 1,
        },
        {
          type: 'text',
          style: { text: '◔', x: icoS / 2, y: icoS / 2, fill: '#ffa94d', fontSize: 14, textAlign: 'center', textVerticalAlign: 'middle' },
          z2: 2,
        },
      ],
    },
  ];
}
