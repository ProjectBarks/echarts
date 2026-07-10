import { describe, test, expect } from 'vitest';
import { resolveTheme, pickTheme, THEMES, COLORS } from '../../graphs/common/theme.js';

describe('pickTheme', () => {
  test('an explicit option always wins over the Grafana theme', () => {
    expect(pickTheme('light', { isDark: true })).toBe(THEMES.light);
    expect(pickTheme('dark', { isDark: false })).toBe(THEMES.dark);
  });
  test('infers from the Grafana theme (isDark, then colors.mode) when no option is given', () => {
    expect(pickTheme(undefined, { isDark: true })).toBe(THEMES.dark);
    expect(pickTheme(undefined, { isDark: false })).toBe(THEMES.light);
    expect(pickTheme(undefined, { colors: { mode: 'light' } })).toBe(THEMES.light);
    expect(pickTheme(undefined, { colors: { mode: 'dark' } })).toBe(THEMES.dark);
  });
  test('falls back to auto (dark without matchMedia) when nothing is provided', () => {
    expect(pickTheme(undefined, undefined, {})).toBe(THEMES.dark);
    expect(pickTheme(undefined, undefined, { matchMedia: () => ({ matches: false }) })).toBe(THEMES.light);
  });
});

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
