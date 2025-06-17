// support/hooks.js - Generic Cucumber Hooks
const { Before, After, Status } = require('@cucumber/cucumber');
const playwright = require('playwright');
require('dotenv').config();

Before({ timeout: 30 * 1000 }, async function () { // Increased timeout to 30 seconds
  // Initialize browser and page for each scenario
  const url = process.env.APP_URL || 'https://example.com'; // Use a reliable URL
  try {
    this.browser = await playwright.chromium.launch({ headless: true });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    
    // Navigate to the application URL with timeout and error handling
    console.log(`🌐 Navigating to: ${url}`);
    await this.page.goto(url, { 
      waitUntil: 'domcontentloaded', // Less strict than 'networkidle'
      timeout: 15000 // 15 second timeout for navigation
    });
    console.log(`✅ Successfully loaded: ${url}`);
  } catch (error) {
    console.error(`❌ Failed to navigate to ${url}:`, error.message);
    // If navigation fails, try a fallback URL
    const fallbackUrl = 'https://example.com';
    console.log(`🔄 Trying fallback URL: ${fallbackUrl}`);
    try {
      await this.page.goto(fallbackUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      console.log(`✅ Successfully loaded fallback: ${fallbackUrl}`);
    } catch (fallbackError) {
      console.error(`❌ Fallback navigation also failed:`, fallbackError.message);
      throw new Error(`Could not navigate to any URL. Original: ${url}, Fallback: ${fallbackUrl}`);
    }
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