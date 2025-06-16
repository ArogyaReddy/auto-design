// run-recorder.js
const { AutoDesign } = require('./src/AutoDesign.js');
const { CodeGenStrategy } = require('./src/strategies/CodeGenStrategy.js');

// --- CONFIGURATION ---
const START_URL = 'https://www.saucedemo.com/';
const FEATURE_NAME = 'SauceDemoLogin';
// -------------------

async function main() {
  console.log(`🚀 Starting Test Generation for feature: ${FEATURE_NAME}`);
  
  const strategy = new CodeGenStrategy();
  const designer = new AutoDesign(strategy);

  // The generate method will now launch the official Playwright CodeGen
  await designer.generate(START_URL, FEATURE_NAME);
}

main().catch(err => {
  console.error("❌ An unexpected error occurred:", err);
  process.exit(1);
});