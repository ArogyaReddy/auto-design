const readline = require('readline');
const { execSync } = require('child_process');
const { AutoDesign } = require('../src/AutoDesign.js');
const { RecordingStrategy } = require('../src/strategies/RecordingStrategy.js');
const fs = require('fs');
const path = require('path');
const { CodeGenStrategy } = require('../src/strategies/CodeGenStrategy.js');
const { ImageScanStrategy } = require('../src/strategies/ImageScanStrategy.js');

require('dotenv').config();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });


function displayMenu() {
  console.log(`
========================================
🤖 Welcome to the Auto-Design Framework 🤖
========================================
Please choose an action:

[1] Start Interactive Recorder
[2] From Screenshot (using your custom OCR scanner)
[3] Run Generated Tests
[q] Quit
  `);
  rl.question('Enter your choice: ', (choice) => {
    handleChoice(choice.trim());
  });
}

async function handleChoice(choice) {
  let continueMenu = true;
  switch (choice.trim()) {
    case '1':
      await runCodeGenRecorder();
      break;
    case '2':
      await runFromScreenshot();
      return;
    case '3':
      await runTests();
      break;
    case 'q':
      console.log('Exiting...');
      rl.close();
      continueMenu = false;
      break;
    default:
      console.log('Invalid choice. Please try again.');
  }
  if (continueMenu) {
    displayMenu();
  }
}

// async function handleChoice(choice) {
//   let continueMenu = true;
//   switch (choice) {
//     case '1':
//       await runInteractiveRecorder();
//       break;
//     case '2':
//       await runTests();
//       break;
//     case 'q':
//       console.log('Exiting...');
//       rl.close();
//       return;
//     default:
//       console.log('Invalid choice. Please try again.');
//   }
//   if (choice !== 'q') {
//     displayMenu();
//   }
// }

async function runCodeGenRecorder() {
  const strategy = new CodeGenStrategy();
  const designer = new AutoDesign(strategy);
  const url = process.env.APP_URL || 'https://www.noapp.com/';
  // Prompt for feature name
  rl.question('\nEnter a name for your feature (e.g., MyLoginFlow):\n> ', async (featureName) => {
    if (featureName) {
      await designer.generate(url, featureName);
    } else {
      console.log("No feature name provided. Aborting.");
    }
    displayMenu();
  });
  return;
}

// FUNCTION to use Image Scanner
async function runFromScreenshot() {
  const strategy = new ImageScanStrategy();
  const designer = new AutoDesign(strategy);
  rl.question('\nEnter the path to your screenshot (e.g., examples/login-screenshot.png):\n> ', async (filePath) => {
    if (fs.existsSync(filePath)) {
      const featureName = path.basename(filePath, path.extname(filePath));
      await designer.generate(filePath, featureName);
    } else {
      console.error(`❌ File not found: ${filePath}`);
    }
    displayMenu();
  });
  return;
}


async function runInteractiveRecorder() {
  console.log('\n--- Starting Interactive Recorder ---');
  const recordingStrategy = new RecordingStrategy();
  const designer = new AutoDesign(recordingStrategy);
  const startUrl = process.env.APP_URL;
  
  if (!startUrl) {
    console.error('❌ Error: APP_URL is not defined in your .env file.');
    return;
  }
  
  await designer.generate(startUrl, "RecordedSession");
  console.log('--- Interactive Recorder Finished ---\n');
}

async function runTests() {
    console.log("\n--- Executing 'npm test' ---");
    try {
        execSync('npm test', { encoding: 'utf8', stdio: 'inherit' });
        console.log("\n--- ✅ Test run completed. ---");
    } catch (error) {
        console.log("\n--- ❌ Test run finished with errors. ---");
    }
}

displayMenu();