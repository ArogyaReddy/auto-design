// run.js (Upgraded with Multi-line Text Input)
require('dotenv').config();
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { execSync } = require('child_process');
const { AutoDesign } = require('../src/AutoDesign.js');
const { CodeGenStrategy } = require('../src/strategies/CodeGenStrategy.js');
const { TextAnalysisStrategy } = require('../src/strategies/TextAnalysisStrategy.js');
const { ScreenshotStrategy } = require('../src/strategies/ScreenshotStrategy.js');
const { HybridImageStrategy } = require('../src/strategies/HybridImageStrategy.js');
const { JiraStrategy } = require('../src/strategies/JiraStrategy.js');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function displayMenu() {
  console.log(`
=================================================
🤖          Auto-Design Framework          🤖
=================================================
Choose a generation method:

[1] Live Recorder (via Playwright CodeGen)
[2] From Pasted Text (JIRA, Paragraph, etc.)
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
  // We remove the old line listener before each action to prevent conflicts.
  rl.removeAllListeners('line');

  let continueMenu = true;
  switch (choice.trim()) {
    case '1':
      await runCodeGenRecorder();
      return;
    case '2':
      await runFromPastedText();
      return;
    case '3':
      await runFromFile();
      return;
    case '4':
      await runFromScreenshot();
      return;
    case '5':
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

// THIS FUNCTION HAS BEEN COMPLETELY REWRITTEN FOR A BETTER USER EXPERIENCE
async function runFromPastedText() {
  const strategy = new TextAnalysisStrategy();
  const designer = new AutoDesign(strategy);
  const lines = [];

  console.log("\n📝 Paste your multi-line text now.");
  console.log("   (Pressing Enter creates a new line).");
  console.log("   Type 'DONE' on a new line by itself and press Enter when you are finished.");
  console.log("-----------------------------------------------------------------------");
  
  rl.prompt();
  
  rl.on('line', (line) => {
    if (line.trim().toUpperCase() === 'DONE') {
      rl.removeAllListeners('line'); // Important: clean up listener
      const fullText = lines.join('\n');
      
      rl.question('\nEnter a name for your feature:\n> ', async (featureName) => {
        if (fullText && featureName) {
            await designer.generate(fullText, featureName);
        } else {
            console.log("⚠️ No text or feature name provided. Aborting.");
        }
        displayMenu();
      });
      return;
    }
    lines.push(line);
    rl.prompt();
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

async function runTests() {
  console.log("\n--- Executing 'npm test' ---");
  try {
    execSync('npm test', { encoding: 'utf8', stdio: 'inherit' });
  } catch (error) {
    console.log("\n--- ❌ Test run finished with errors. ---");
  }
}

// Start the application
displayMenu();