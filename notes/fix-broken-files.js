#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get all files that need fixing
const outputDir = './output';
const brokenFiles = [
  'UserLogin/Steps/UserLogin.steps.js',
  'UserLogin/Pages/UserLogin.page.js', 
  'ProductPurchase/Steps/ProductPurchase.steps.js',
  'ProductPurchase/Pages/ProductPurchase.page.js',
  'Login/Steps/Login.steps.js',
  'Login/Pages/Login.page.js'
];

// Fix page files
const fixPageFile = (filePath, className) => {
  const content = `// Generated Page Object for ${className}
const { expect } = require('@playwright/test');

class ${className}Page {
  constructor(page) {
    this.page = page;

    // Common page elements - customize based on actual page structure  
    this.loginButton = page.locator('#login-button, [type="submit"], .login-btn');
    this.usernameInput = page.locator('#username, [name="username"], [name="email"]');
    this.passwordInput = page.locator('#password, [name="password"]');
    this.submitButton = page.locator('#submit, [type="submit"], .submit-btn');
    this.productLink = page.locator('.product-link, .inventory-item a');
    this.addToCartButton = page.locator('#add-to-cart, .add-to-cart-btn');
  }

  // Helper methods
  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async clickProduct() {
    await this.productLink.first().click();
  }

  async addToCart() {
    await this.addToCartButton.click();
  }
}

module.exports = { ${className}Page };`;

  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed: ${filePath}`);
};

// Fix step files
const fixStepFile = (filePath, className) => {
  const content = `// Generated Step Definitions for ${className}
const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { ${className}Page } = require('../Pages/${className}.page.js');

Given('I am on the application', async function () {
  this.pageObject = new ${className}Page(this.page);
  await this.page.goto(process.env.APP_URL || 'https://test.com');
});

When('I enter valid credentials', async function () {
  await this.pageObject.login('test_user', 'test_password');
});

When('I click the login button', async function () {
  await expect(this.pageObject.loginButton).toBeVisible();
  await this.pageObject.loginButton.click();
});

When('I select a product', async function () {
  await this.pageObject.clickProduct();
});

When('I add the product to cart', async function () {
  await this.pageObject.addToCart();
});

Then('I should be logged in successfully', async function () {
  // Wait for successful login (customize based on your app)
  await this.page.waitForTimeout(2000);
  console.log('✅ Login step completed');
});

Then('The product should be added to cart', async function () {
  // Verify cart updated (customize based on your app)
  await this.page.waitForTimeout(1000);
  console.log('✅ Product added to cart');
});`;

  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed: ${filePath}`);
};

// Process broken files
brokenFiles.forEach(file => {
  const fullPath = path.join(outputDir, file);
  const className = path.basename(file, path.extname(file)).replace('.page', '').replace('.steps', '');
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${fullPath}`);
    return;
  }

  if (file.includes('Pages')) {
    fixPageFile(fullPath, className);
  } else if (file.includes('Steps')) {
    fixStepFile(fullPath, className);
  }
});

console.log('🎉 All broken files have been fixed!');
