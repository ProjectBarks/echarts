// @vitest-environment jsdom
import { describe, test, expect, vi } from 'vitest';
import { createEl, showToast } from '../../graphs/common/dom.js';

describe('createEl', () => {
  test('creates an element and applies inline styles', () => {
    const el = createEl('div', { color: 'red' });
    expect(el.tagName).toBe('DIV');
    expect(el.style.color).toBe('red');
  });
});

describe('showToast', () => {
  test('appends a toast then removes it', () => {
    vi.useFakeTimers();
    const container = document.createElement('div');
    showToast(container, 'hello');
    expect(container.textContent).toContain('hello');
    vi.advanceTimersByTime(2000);
    expect(container.querySelector('div')).toBe(null);
    vi.useRealTimers();
  });
});
