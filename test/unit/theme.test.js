import { describe, test, expect } from 'vitest';
import { resolveTheme, THEMES, COLORS } from '../../graphs/common/theme.js';

describe('resolveTheme', () => {
  test('defaults to auto and maps explicit names to presets', () => {
    // default name is 'auto': resolves via prefers-color-scheme, falling back to dark
    expect(resolveTheme(undefined, { matchMedia: () => ({ matches: false }) })).toBe(THEMES.light);
    expect(resolveTheme(undefined, {})).toBe(THEMES.dark);
    expect(resolveTheme('dark')).toBe(THEMES.dark);
    expect(resolveTheme('light')).toBe(THEMES.light);
  });
  test('auto follows prefers-color-scheme, falling back to dark', () => {
    expect(resolveTheme('auto', { matchMedia: () => ({ matches: true }) })).toBe(THEMES.dark);
    expect(resolveTheme('auto', { matchMedia: () => ({ matches: false }) })).toBe(THEMES.light);
    expect(resolveTheme('auto', {})).toBe(THEMES.dark);
  });
  test('light and dark differ on chrome tokens but share the accent palette', () => {
    expect(THEMES.dark.tooltipBg).not.toBe(THEMES.light.tooltipBg);
    expect(THEMES.dark.text).not.toBe(THEMES.light.text);
    expect(COLORS.crit).toBe('#ff6b6b');
  });
});
