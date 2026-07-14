// Single source of truth for the build identity that renderers log on every
// render. Bump BUILD_STAMP whenever you cut a change you want to be able to
// confirm is live: esm.sh serves `@main` from a cache, so the console line is
// how you verify the panel is running the build you just pushed rather than a
// stale one. Keep SEMVER in sync with package.json's "version".
export const SEMVER = '1.0.2';
export const BUILD_STAMP = '2026-07-13';
export const VERSION = SEMVER + ' (' + BUILD_STAMP + ')';

// Log once per render. `chart` is only used to disambiguate which renderer
// emitted the line when both are on one dashboard.
export function logVersion(chart: string): void {
  try {
    // eslint-disable-next-line no-console
    console.log('[echarts-internal] ' + chart + ' render v' + VERSION);
  } catch {
    // console is not guaranteed in every host; never let logging break a render.
  }
}
