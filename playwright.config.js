const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './output',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    headless: false,
  },
});