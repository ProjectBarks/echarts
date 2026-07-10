const { getJestConfig } = require('@storybook/test-runner');
module.exports = { ...getJestConfig(), watchman: false, haste: { throwOnModuleCollision: false } };
