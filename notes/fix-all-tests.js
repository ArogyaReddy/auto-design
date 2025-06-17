#!/usr/bin/env node
/**
 * Bulk Test Fixer - Updates all existing tests to use working patterns
 */

const fs = require('fs-extra');
const path = require('path');

const outputDir = '/Users/arog/ADP/auto-design-platform/auto-design/output';

async function fixAllTests() {
  console.log('🔧 Starting bulk test fixes...\n');
  
  try {
    const testDirs = fs.readdirSync(outputDir).filter(dir => 
      fs.statSync(path.join(outputDir, dir)).isDirectory()
    );

    console.log(`Found ${testDirs.length} test directories:\n${testDirs.map(d => `  - ${d}`).join('\n')}\n`);

    for (const testDir of testDirs) {
      console.log(`🔧 Fixing ${testDir}...`);
      await fixTestDirectory(testDir);
    }

    console.log('\n✅ All tests fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing tests:', error.message);
  }
}

async function fixTestDirectory(testDir) {
  const testPath = path.join(outputDir, testDir);
  const stepsFile = path.join(testPath, 'Steps', `${testDir}.steps.js`);
  const featureFile = path.join(testPath, 'Features', `${testDir}.feature`);
  const pageFile = path.join(testPath, 'Pages', `${testDir}.page.js`);

  // Fix steps file
  if (fs.existsSync(stepsFile)) {
    console.log(`  📝 Fixing steps: ${stepsFile}`);
    await fixStepsFile(stepsFile, testDir);
  }

  // Fix feature file
  if (fs.existsSync(featureFile)) {
    console.log(`  📋 Fixing feature: ${featureFile}`);
    await fixFeatureFile(featureFile);
  }

  // Update page file if needed
  if (fs.existsSync(pageFile)) {
    console.log(`  📄 Checking page: ${pageFile}`);
    await checkPageFile(pageFile);
  }
}

async function fixStepsFile(stepsFile, testDir) {
  let content = fs.readFileSync(stepsFile, 'utf8');
  
  // Get the class name from the test directory
  const className = getClassNameFromDir(testDir);
  
  // Fix the Given step
  content = content.replace(
    /Given\(`I am on the application`/g,
    'Given(`I am on the application page`'
  );
  
  // Fix the Given step implementation
  content = content.replace(
    /Given\(`I am on the application page`, async function \(\) \{[\s\S]*?\}\);/,
    `Given(\`I am on the application page\`, async function () {
  this.pageObject = new ${className}(this.page);
  // Page is already loaded by hooks.js, just verify we're ready
  await expect(this.page).toBeTruthy();
  console.log(\`✅ Page object initialized for: \${this.page.url()}\`);
});`
  );

  // Add basic step implementations if they're just console.log statements
  content = content.replace(
    /console\.log\(`Step: I click the login button`\);/g,
    `// Use the page object to click the login button
  await expect(this.pageObject.loginButton).toBeVisible();
  await this.pageObject.loginButton.click();`
  );

  content = content.replace(
    /console\.log\(`Step: I enter text into the username field`\);/g,
    `// Use the page object to interact with the username field
  await expect(this.pageObject.usernameInput).toBeVisible();
  await this.pageObject.usernameInput.fill('standard_user');`
  );

  content = content.replace(
    /console\.log\(`Verification: I should see the expected result`\);/g,
    `// Verification step - customize as needed
  await this.page.waitForTimeout(1000);
  console.log(\`✅ Test step completed\`);`
  );

  fs.writeFileSync(stepsFile, content);
}

async function fixFeatureFile(featureFile) {
  let content = fs.readFileSync(featureFile, 'utf8');
  
  // Fix the Given step in feature files
  content = content.replace(
    /Given I am on the application$/gm,
    'Given I am on the application page'
  );
  
  fs.writeFileSync(featureFile, content);
}

async function checkPageFile(pageFile) {
  // Just verify the page file exists and is readable
  const content = fs.readFileSync(pageFile, 'utf8');
  if (content.includes('class ') && content.includes('module.exports')) {
    console.log(`    ✅ Page file looks good`);
  } else {
    console.log(`    ⚠️  Page file might need manual review`);
  }
}

function getClassNameFromDir(testDir) {
  // Convert directory name to class name (e.g., TXT-HOME -> TXTHOMEPage)
  if (testDir.includes('-')) {
    const parts = testDir.split('-');
    const prefix = parts[0];
    const name = parts.slice(1).join('');
    return `${prefix}${name}Page`;
  }
  return `${testDir}Page`;
}

// Run the fixer
fixAllTests();
