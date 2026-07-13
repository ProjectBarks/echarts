import { THEMES } from './theme.js';
import type { ChartTheme } from './theme.js';

export function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style: Partial<CSSStyleDeclaration> = {},
  props: Record<string, unknown> = {},
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  Object.assign(el.style, style);
  Object.assign(el, props);
  return el;
}

export function showToast(container: HTMLElement, msg: string, theme: ChartTheme = THEMES.dark): void {
  const toast = createEl('div', {
    position: 'absolute',
    bottom: '40px',
    right: '8px',
    zIndex: '9999',
    padding: '6px 14px',
    borderRadius: '4px',
    fontSize: '11px',
    color: theme.successText,
    background: theme.successBg,
    pointerEvents: 'none',
    transition: 'opacity 0.3s',
  });
  toast.textContent = msg;
  container.style.position = 'relative';
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
  }, 1000);
  setTimeout(() => {
    toast.remove();
  }, 1400);
}
