// support/shared-steps.js - Common step definitions across all features
const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

// Common application setup step
Given('I am on the application', async function () {
  // The page navigation is already handled in hooks.js Before hook
  // This step just confirms we're ready to interact with the page
  await expect(this.page).toBeTruthy();
  console.log(`✅ Application loaded: ${this.page.url()}`);
});

// Generic button click steps
When('I click the {string} button', async function (buttonText) {
  // Try multiple selector strategies for buttons
  const selectors = [
    `button:has-text("${buttonText}")`,
    `[role="button"]:has-text("${buttonText}")`,
    `input[type="button"][value*="${buttonText}"]`,
    `input[type="submit"][value*="${buttonText}"]`,
    `*:has-text("${buttonText}"):visible`
  ];
  
  let buttonFound = false;
  for (const selector of selectors) {
    try {
      const element = this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        await element.click();
        buttonFound = true;
        console.log(`✅ Clicked button: "${buttonText}" using selector: ${selector}`);
        break;
      }
    } catch (error) {
      // Continue to next selector
    }
  }
  
  if (!buttonFound) {
    throw new Error(`Could not find button with text: "${buttonText}"`);
  }
});

// Generic link click steps
When('I click the {string} link', async function (linkText) {
  const selectors = [
    `a:has-text("${linkText}")`,
    `[role="link"]:has-text("${linkText}")`,
    `*:has-text("${linkText}"):visible`
  ];
  
  let linkFound = false;
  for (const selector of selectors) {
    try {
      const element = this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        await element.click();
        linkFound = true;
        console.log(`✅ Clicked link: "${linkText}" using selector: ${selector}`);
        break;
      }
    } catch (error) {
      // Continue to next selector
    }
  }
  
  if (!linkFound) {
    throw new Error(`Could not find link with text: "${linkText}"`);
  }
});

// Generic element click steps
When('I click the {string} element', async function (elementText) {
  const selectors = [
    `*:has-text("${elementText}"):visible`,
    `[aria-label*="${elementText}"]`,
    `[title*="${elementText}"]`,
    `[placeholder*="${elementText}"]`,
    `[data-testid*="${elementText}"]`
  ];
  
  let elementFound = false;
  for (const selector of selectors) {
    try {
      const element = this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        await element.click();
        elementFound = true;
        console.log(`✅ Clicked element: "${elementText}" using selector: ${selector}`);
        break;
      }
    } catch (error) {
      // Continue to next selector
    }
  }
  
  if (!elementFound) {
    throw new Error(`Could not find element with text: "${elementText}"`);
  }
});

// Generic input field steps
When('I fill the {string} field with {string}', async function (fieldLabel, value) {
  const selectors = [
    `input[placeholder*="${fieldLabel}"]`,
    `input[aria-label*="${fieldLabel}"]`,
    `input[name*="${fieldLabel}"]`,
    `textarea[placeholder*="${fieldLabel}"]`,
    `textarea[aria-label*="${fieldLabel}"]`,
    `[data-testid*="${fieldLabel}"] input`,
    `label:has-text("${fieldLabel}") + input`,
    `label:has-text("${fieldLabel}") input`
  ];
  
  let fieldFound = false;
  for (const selector of selectors) {
    try {
      const element = this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        await element.clear();
        await element.fill(value);
        fieldFound = true;
        console.log(`✅ Filled field: "${fieldLabel}" with value: "${value}" using selector: ${selector}`);
        break;
      }
    } catch (error) {
      // Continue to next selector
    }
  }
  
  if (!fieldFound) {
    throw new Error(`Could not find field with label: "${fieldLabel}"`);
  }
});

// Generic verification steps
Then('I should see {string}', async function (text) {
  await expect(this.page.locator(`*:has-text("${text}")`).first()).toBeVisible();
  console.log(`✅ Verified text is visible: "${text}"`);
});

Then('I should be on {string}', async function (expectedUrl) {
  await expect(this.page).toHaveURL(new RegExp(expectedUrl));
  console.log(`✅ Verified URL contains: "${expectedUrl}"`);
});
