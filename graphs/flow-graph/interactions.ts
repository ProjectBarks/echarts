import type { EChartsLike, NodeLatMap } from '../common/types.js';
import { showToast } from '../common/dom.js';
import { iconButton, buttonOffset, togglePopover, createRangeFilterPopover } from '../common/controls.js';
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
  return createRangeFilterPopover(chart, theme, 'lat-slider', (pct, setLabel) => {
    const threshold = (pct / 100) * maxLat;
    setLabel('Min: ' + pct + '%');
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
  const container = chart.getDom();
  let critOnly = false;
  return [
    iconButton(theme, {
      right: buttonOffset(2),
      glyph: '📋',
      glyphColor: theme.buttonGlyph,
      glyphSize: 12,
      onclick: () => {
        navigator.clipboard.writeText(buildMermaid());
        showToast(container, 'Mermaid copied', theme);
      },
    }),
    iconButton(theme, {
      right: buttonOffset(1),
      glyph: '⚡',
      glyphColor: theme.crit,
      glyphSize: 13,
      onclick: () => {
        critOnly = !critOnly;
        chart.setOption({
          series: [{ data: critOnly ? critOnlyNodes : fullNodes, links: critOnly ? critOnlyLinks : fullLinks }],
        });
      },
    }),
    iconButton(theme, {
      right: buttonOffset(0),
      glyph: '◔',
      glyphColor: theme.dp,
      glyphSize: 14,
      onclick: () => togglePopover(sliderPopover),
    }),
  ];
}
