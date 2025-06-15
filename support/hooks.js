const { Before, After, Status } = require('@cucumber/cucumber');
const playwright = require('playwright');
require('dotenv').config();

Before(async function () {
  const url = process.env.APP_URL;
  this.browser = await playwright.chromium.launch({ headless: true });
  this.context = await this.browser.newContext();
  this.page = await this.context.newPage();
  if (url) {
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }
});

After(async function (scenario) {
  if (scenario.result.status === Status.FAILED) {
    try {
        const buffer = await this.page.screenshot();
        this.attach(buffer, 'image/png');
    } catch (error) {
        console.error("Failed to take screenshot.", error);
    }
  }
  if (this.browser) {
    await this.browser.close();
  }
});