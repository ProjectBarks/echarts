import { describe, test, expect } from 'vitest';
import { resolveTheme, pickTheme, withAlpha, THEMES, COLORS } from '../../graphs/common/theme.js';

describe('withAlpha', () => {
  test('applies alpha to hex, short hex, rgb, and rgba inputs', () => {
    expect(withAlpha('#ff6b6b', 0.9)).toBe('rgba(255,107,107,0.9)');
    expect(withAlpha('#fff', 0.5)).toBe('rgba(255,255,255,0.5)');
    expect(withAlpha('rgb(10, 20, 30)', 0.3)).toBe('rgba(10,20,30,0.3)');
    expect(withAlpha('rgba(10,20,30,0.8)', 0.2)).toBe('rgba(10,20,30,0.2)');
  });
});

describe('pickTheme accents from Grafana', () => {
  test('overrides semantic accents from Grafana colors (string or {main})', () => {
    const t = pickTheme(undefined, {
      isDark: true,
      colors: { error: { main: '#e0226e' }, warning: '#ff9900', info: { main: '#3871dc' }, success: { main: '#1b855e' } },
    });
    expect(t.crit).toBe('#e0226e');
    expect(t.dp).toBe('#ff9900');
    expect(t.gate).toBe('#3871dc');
    expect(t.meta).toBe('#1b855e');
    // chrome still follows dark mode
    expect(t.tooltipBg).toBe(THEMES.dark.tooltipBg);
  });
  test('keeps default accents (and preset identity) when Grafana has no colors', () => {
    const t = pickTheme(undefined, { isDark: false });
    expect(t).toBe(THEMES.light);
    expect(t.crit).toBe(COLORS.crit);
  });
});

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
