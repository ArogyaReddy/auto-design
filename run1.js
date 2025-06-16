const readline = require('readline');
const { execSync } = require('child_process');
const { AutoDesign } = require('./src/AutoDesign.js');
const { RecordingStrategy } = require('./src/strategies/RecordingStrategy.js');

require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function displayMenu() {
  console.log(`
========================================
🤖 Welcome to the Auto-Design Framework 🤖
========================================
Please choose a mode to run:

[1] Generate a Static Test (Example)
[2] Start Interactive Live Recorder
[3] Run Generated Tests

[q] Quit
  `);
  rl.question('Enter your choice: ', (choice) => {
    handleChoice(choice.trim());
  });
}

async function handleChoice(choice) {
  switch (choice) {
    case '1':
      // This case is left as an example and does not run.
      console.log("\nThis is a placeholder for a static generator.");
      break;
    case '2':
      await runInteractiveRecorder();
      break;
    case '3':
      await runTests();
      break;
    case 'q':
      console.log('Exiting...');
      rl.close();
      return;
    default:
      console.log('Invalid choice. Please try again.');
  }
  if (choice !== 'q') {
    displayMenu();
  }
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
  
  await designer.generate(startUrl, "Live Recording Session");
  console.log('--- Interactive Recorder Finished ---\n');
}

async function runTests() {
    console.log("\n--- Executing 'npm test' ---");
    try {
        execSync('npm test', { encoding: 'utf8', stdio: 'inherit' });
        console.log("\n--- ✅ Test run completed successfully. ---");
    } catch (error) {
        console.log("\n--- ❌ Test run finished with errors. ---");
    }
}

displayMenu();