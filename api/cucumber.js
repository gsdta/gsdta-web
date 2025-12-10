module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['tests/e2e/support/**/*.ts', 'tests/e2e/steps/**/*.ts'],
    paths: ['tests/e2e/features/**/*.feature'],
    format: ['summary', 'progress'],
    parallel: 1,
    tags: 'not @skip',
    timeout: 30000 // 30 seconds per step (CI can be slower)
  },
};

