const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { AutoDesign } = require('./src/AutoDesign.js');
const { CodeGenStrategy } = require('./src/strategies/CodeGenStrategy.js');
const { TextAnalysisStrategy } = require('./src/strategies/TextAnalysisStrategy.js');
const { ScreenshotStrategy } = require('./src/strategies/ScreenshotStrategy.js');
const { ImageScanStrategy } = require('./src/strategies/ImageScanStrategy.js');
const { HybridImageStrategy } = require('./src/strategies/HybridImageStrategy.js');

require('dotenv').config();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function displayMenu() {
  console.log(`
=================================================
🤖          Auto-Design Framework          🤖
=================================================
Choose a generation method:

[1] Live Recorder (via Playwright CodeGen)
[2] From Text (JIRA, Paragraph, etc.)
[3] From Text File (e.g., examples/jira-story.txt)
[4] From Screenshot (e.g., examples/login.png)

[5] Run Generated Tests
[q] Quit
  `);
  // rl.question('Enter your choice: ', handleChoice);
  rl.question('Enter your choice: ', (choice) => {
    handleChoice(choice.trim());
  });
}

async function handleChoice(choice) {
  let continueMenu = true;
  switch (choice.trim()) {
    case '1':
      await runCodeGenRecorder();
      continueMenu = true;
      return;
    case '2':
      await runFromPastedText();
      continueMenu = true;
      return;
    case '3':
      await runFromFile();
      continueMenu = true;
      return;
    case '4':
      await runFromScreenshot();
      continueMenu = true;
      return;
    case '5':
      await runTests();
      continueMenu = true;
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

async function runCodeGenRecorder() {
  rl.question('\nEnter a name for your feature (e.g., MyLoginFlow):\n> ', async (featureName) => {
    if (featureName) {
      const strategy = new CodeGenStrategy();
      const designer = new AutoDesign(strategy);
      await designer.generate(process.env.APP_URL, featureName);
    } else {
      console.log("No feature name provided. Aborting.");
    }
    displayMenu();
  });
}

async function runFromPastedText() {
  const strategy = new TextAnalysisStrategy();
  const designer = new AutoDesign(strategy);
  rl.question('\nPaste your text (JIRA story, etc.) and press Enter:\n> ', async (text) => {
    rl.question('Enter a name for your feature:\n> ', async (featureName) => {
        if (text && featureName) {
            await designer.generate(text, featureName);
        } else {
            console.log("Missing text or feature name. Aborting.");
        }
        displayMenu();
    });
  });
}

async function runFromFile() {
  const strategy = new TextAnalysisStrategy();
  const designer = new AutoDesign(strategy);
  rl.question('\nEnter the path to your text file (e.g., examples/jira-story.txt):\n> ', async (filePath) => {
    if (fs.existsSync(filePath)) {
      const text = fs.readFileSync(filePath, 'utf8');
      const featureName = path.basename(filePath, path.extname(filePath));
      await designer.generate(text, featureName);
    } else {
      console.error(`❌ File not found: ${filePath}`);
    }
    displayMenu();
  });
}

async function runFromScreenshot() {
  // This function now uses the new hybrid strategy
  const strategy = new HybridImageStrategy();
  const designer = new AutoDesign(strategy);
  rl.question('\nEnter the path to your screenshot (e.g., examples/plp-add-new-employee.jpg):\n> ', async (filePath) => {
    if (fs.existsSync(filePath)) {
      const featureName = path.basename(filePath, path.extname(filePath)).replace(/[^a-zA-Z0-9]/g, '');
      await designer.generate(filePath, featureName);
    } else {
      console.error(`❌ File not found: ${filePath}`);
    }
    displayMenu();
  });
  return;
}

// async function runFromScreenshot() {
//   const strategy = new ImageScanStrategy();
//   const designer = new AutoDesign(strategy);
//   rl.question('\nEnter the path to your screenshot (e.g., examples/login-screenshot.png):\n> ', async (filePath) => {
//     if (fs.existsSync(filePath)) {
//       const featureName = path.basename(filePath, path.extname(filePath));
//       await designer.generate(filePath, featureName);
//     } else {
//       console.error(`❌ File not found: ${filePath}`);
//     }
//     displayMenu();
//   });
//   return;
// }

// async function runFromScreenshot() {
//   const strategy = new ScreenshotStrategy();
//   const designer = new AutoDesign(strategy);
//   rl.question('\nEnter the path to your screenshot (e.g., examples/login-screenshot.png):\n> ', async (filePath) => {
//     if (fs.existsSync(filePath)) {
//       const featureName = path.basename(filePath, path.extname(filePath));
//       await designer.generate(filePath, featureName);
//     } else {
//       console.error(`❌ File not found: ${filePath}`);
//     }
//     displayMenu();
//   });
// }

async function runTests() {
  console.log("\n--- Executing 'npm test' ---");
  try {
    execSync('npm test', { encoding: 'utf8', stdio: 'inherit' });
  } catch (error) {
    console.log("\n--- ❌ Test run finished with errors. ---");
  }
}

displayMenu();