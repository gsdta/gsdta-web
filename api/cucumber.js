module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['tests/e2e/support/**/*.ts', 'tests/e2e/steps/**/*.ts'],
    paths: ['tests/e2e/features/**/*.feature'],
    format: ['summary', 'progress'],
    parallel: 1,
    tags: 'not @skip',
    timeout: 120000 // 120 seconds (2 minutes) for CI - some steps are very slow
  },
};

