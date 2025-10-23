module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['tests/e2e/steps/**/*.ts'],
    paths: ['tests/e2e/features/**/*.feature'],
    format: ['summary', 'progress-bar'],
    publishQuiet: true,
  },
};

