/**
 * Storybook test-runner hooks. Runs in CI against a served static Storybook to
 * (a) validate every story renders without throwing and (b) capture a PNG per
 * story into `screenshots/` for visual review as a CI artifact.
 *
 * @type {import('@storybook/test-runner').TestRunnerConfig}
 */
const { mkdirSync } = require('node:fs');

module.exports = {
  async preVisit(page) {
    await page.setViewportSize({ width: 1440, height: 960 });
  },
  async postVisit(page, context) {
    // The story helper flips this flag once the chart has painted.
    await page
      .waitForFunction(() => window.__story_ready === true, { timeout: 15000 })
      .catch(() => {});
    mkdirSync('screenshots', { recursive: true });
    await page.screenshot({ path: `screenshots/${context.id}.png` });
  },
};
