// support/hooks.js (Final Robust Version)
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

// THIS IS THE UPDATED AFTER HOOK
After({ timeout: 30 * 1000 }, async function (scenario) { // Increased timeout to 30 seconds
  
  // Take a screenshot if the scenario failed
  if (scenario.result?.status === Status.FAILED) {
    try {
        const buffer = await this.page.screenshot();
        this.attach(buffer, 'image/png');
    } catch (error) {
        console.error("Could not take a failure screenshot, the page might have already closed.", error.message);
    }
  }
  
  // Gracefully close the browser
  if (this.browser) {
    try {
        await this.browser.close();
    } catch(error) {
        console.error("Failed to close browser gracefully. It may have already been closed or crashed.", error.message);
    }
  }
});