const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './output',
  reporter: 'html',
  use: {
    headless: true,
  },
});