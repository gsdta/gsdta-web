const common = {
  requireModule: ['ts-node/register'],
  require: ['support/**/*.ts', 'steps/**/*.ts'],
  paths: ['features/**/*.feature'],
  format: ['summary', 'progress-bar'],
  formatOptions: {
    snippetInterface: 'async-await'
  },
  worldParameters: {
    baseUrl: process.env.UAT_BASE_URL || 'https://app.qa.gsdta.com'
  }
};

module.exports = {
  default: {
    ...common,
    parallel: 1, // Sequential execution for stability
    timeout: 90000, // 90 seconds per step
    tags: 'not @skip and not @wip'
  },
  smoke: {
    ...common,
    tags: '@smoke and not @wip',
    timeout: 30000
  },
  ci: {
    ...common,
    parallel: 2,
    timeout: 120000, // 2 minutes for CI stability
    tags: 'not @skip and not @wip and not @manual',
    retry: 1, // Retry failed scenarios once
    format: [
      'summary',
      'progress-bar',
      ['json', 'reports/cucumber-report.json'],
      ['html', 'reports/cucumber-report.html']
    ]
  },
  shakeout: {
    ...common,
    tags: '@shakeout',
    timeout: 30000,
    format: [
      'summary',
      'progress-bar',
      ['json', 'reports/shakeout-report.json'],
      ['html', 'reports/shakeout-report.html']
    ]
  }
};
