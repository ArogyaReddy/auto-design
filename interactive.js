#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for beautiful output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m'
};

// Emojis for visual appeal
const emoji = {
  rocket: '🚀',
  sparkles: '✨',
  gear: '⚙️',
  check: '✅',
  warning: '⚠️',
  info: 'ℹ️',
  play: '▶️',
  stop: '⏹️',
  magic: '🪄',
  robot: '🤖',
  camera: '📸',
  document: '📄',
  bug: '🐛',
  test: '🧪',
  trophy: '🏆',
  fire: '🔥',
  lightning: '⚡',
  target: '🎯',
  party: '🎉'
};

class InteractiveRunner {
  constructor() {
    this.outputDir = './output';
    this.clear();
    this.showWelcome();
  }

  clear() {
    console.clear();
  }

  log(message, color = 'white') {
    console.log(colors[color] + message + colors.reset);
  }

  header(text) {
    const border = '═'.repeat(text.length + 4);
    this.log(`\n${colors.bgBlue}${colors.white}${colors.bright}  ${text}  ${colors.reset}`);
    this.log(colors.blue + border + colors.reset);
  }

  success(message) {
    this.log(`${emoji.check} ${colors.green}${message}${colors.reset}`);
  }

  warning(message) {
    this.log(`${emoji.warning} ${colors.yellow}${message}${colors.reset}`);
  }

  info(message) {
    this.log(`${emoji.info} ${colors.cyan}${message}${colors.reset}`);
  }

  showWelcome() {
    this.log(`\n${colors.bgGreen}${colors.white}${colors.bright}                                                    ${colors.reset}`);
    this.log(`${colors.bgGreen}${colors.white}${colors.bright}  ${emoji.robot} AUTO-DESIGN PLATFORM INTERACTIVE RUNNER ${emoji.sparkles}  ${colors.reset}`);
    this.log(`${colors.bgGreen}${colors.white}${colors.bright}                                                    ${colors.reset}\n`);
    
    this.log(`${colors.cyan}Welcome to the most ${colors.bright}user-friendly${colors.reset}${colors.cyan} test automation generator!${colors.reset}`);
    this.log(`${colors.magenta}Transform your ideas into ${colors.bright}Playwright tests${colors.reset}${colors.magenta} with just a few clicks! ${emoji.magic}${colors.reset}\n`);
  }

  async showMainMenu() {
    this.header(`${emoji.target} MAIN MENU`);
    
    const options = [
      { key: '1', label: `${emoji.rocket} Generate New Tests`, desc: 'Create tests from your ideas' },
      { key: '2', label: `${emoji.test} Run Existing Tests`, desc: 'Execute generated tests' },
      { key: '3', label: `${emoji.fire} Quick Demos`, desc: 'See the platform in action' },
      { key: '4', label: `${emoji.gear} Verify Setup`, desc: 'Check all functionalities' },
      { key: '5', label: `${emoji.document} Browse Generated Files`, desc: 'View your test outputs' },
      { key: '6', label: `${emoji.lightning} Batch Operations`, desc: 'Run multiple tests' },
      { key: 'q', label: `${emoji.stop} Exit`, desc: 'Goodbye!' }
    ];

    this.displayMenu(options);
    return await this.getUserInput('\nWhat would you like to do? ');
  }

  displayMenu(options) {
    options.forEach(opt => {
      const keyColor = colors.bright + colors.yellow;
      const labelColor = colors.bright + colors.white;
      const descColor = colors.cyan;
      this.log(`  ${keyColor}[${opt.key}]${colors.reset} ${labelColor}${opt.label}${colors.reset}`);
      this.log(`      ${descColor}${opt.desc}${colors.reset}`);
    });
  }

  async showGenerateMenu() {
    this.clear();
    this.header(`${emoji.rocket} GENERATE NEW TESTS`);
    
    const options = [
      { key: '1', label: `${emoji.robot} Playwright Recording`, desc: 'Record your actions live' },
      { key: '2', label: `${emoji.document} Text/User Story`, desc: 'From descriptive text' },
      { key: '3', label: `${emoji.camera} Image/Screenshot`, desc: 'Analyze UI images' },
      { key: '4', label: `${emoji.document} Summary File`, desc: 'From text files' },
      { key: '5', label: `${emoji.bug} JIRA Story`, desc: 'From JIRA tickets' },
      { key: 'b', label: `${emoji.target} Back to Main Menu`, desc: '' }
    ];

    this.displayMenu(options);
    return await this.getUserInput('\nChoose generation method: ');
  }

  async showDemoMenu() {
    this.clear();
    this.header(`${emoji.fire} QUICK DEMOS`);
    
    const options = [
      { key: '1', label: `${emoji.document} Text Analysis Demo`, desc: 'AI-powered text parsing' },
      { key: '2', label: `${emoji.camera} Image Analysis Demo`, desc: 'OCR + test generation' },
      { key: '3', label: `${emoji.robot} Fallback Parser Demo`, desc: 'Simple pattern matching' },
      { key: '4', label: `${emoji.document} Summary File Demo`, desc: 'File-based analysis' },
      { key: '5', label: `${emoji.party} Run All Demos`, desc: 'See everything in action' },
      { key: 'b', label: `${emoji.target} Back to Main Menu`, desc: '' }
    ];

    this.displayMenu(options);
    return await this.getUserInput('\nChoose demo: ');
  }

  async showTestMenu() {
    this.clear();
    this.header(`${emoji.test} RUN EXISTING TESTS`);
    
    // Get available test directories
    const testDirs = this.getTestDirectories();
    
    if (testDirs.length === 0) {
      this.warning('No test files found! Generate some tests first.');
      await this.pause();
      return 'b';
    }

    const options = [
      { key: '1', label: `${emoji.lightning} Run All Tests`, desc: 'Execute all generated tests' },
      { key: '2', label: `${emoji.target} Run Specific Test`, desc: 'Choose individual test' },
      { key: '3', label: `${emoji.fire} Run Latest Test`, desc: 'Run most recent generation' },
      { key: 'b', label: `${emoji.target} Back to Main Menu`, desc: '' }
    ];

    this.displayMenu(options);
    
    this.log(`\n${colors.cyan}Available test projects:${colors.reset}`);
    testDirs.forEach((dir, i) => {
      this.log(`  ${colors.yellow}${i + 1}.${colors.reset} ${colors.white}${dir}${colors.reset}`);
    });

    return await this.getUserInput('\nChoose option: ');
  }

  getTestDirectories() {
    if (!fs.existsSync(this.outputDir)) return [];
    
    return fs.readdirSync(this.outputDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .sort((a, b) => {
        const aPath = path.join(this.outputDir, a);
        const bPath = path.join(this.outputDir, b);
        return fs.statSync(bPath).mtime - fs.statSync(aPath).mtime;
      });
  }

  async getUserInput(prompt) {
    process.stdout.write(colors.bright + colors.green + prompt + colors.reset);
    
    return new Promise((resolve) => {
      process.stdin.once('data', (data) => {
        resolve(data.toString().trim().toLowerCase());
      });
    });
  }

  async pause() {
    await this.getUserInput(`\n${colors.cyan}Press Enter to continue...${colors.reset}`);
  }

  async runCommand(command, description) {
    this.info(`Running: ${description}`);
    this.log(`${colors.yellow}Command: ${colors.reset}${colors.white}${command}${colors.reset}\n`);
    
    try {
      const startTime = Date.now();
      execSync(command, { stdio: 'inherit', cwd: process.cwd() });
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      this.success(`Completed in ${duration}s! ${emoji.party}`);
      return true;
    } catch (error) {
      this.log(`${colors.red}${emoji.warning} Command failed: ${error.message}${colors.reset}`);
      return false;
    }
  }

  async handlePlaywrightRecording() {
    this.clear();
    this.header(`${emoji.robot} PLAYWRIGHT RECORDING`);
    
    this.info('This will open the recorder in your browser');
    const featureName = await this.getUserInput('Enter feature name (e.g., LoginFlow): ');
    const url = await this.getUserInput('Enter URL (or press Enter for example.com): ');
    
    const targetUrl = url || 'https://example.com';
    const safeName = featureName || 'RecordedFlow';
    
    this.log(`\n${emoji.magic} Opening recorder...`);
    await this.runCommand(`npm run demo:record`, 'Recorder Demo');
    await this.pause();
  }

  async handleTextGeneration() {
    this.clear();
    this.header(`${emoji.document} TEXT GENERATION`);
    
    this.info('Describe your test scenario in natural language');
    this.log(`${colors.cyan}Example: "As a user, I want to login with username and password"${colors.reset}\n`);
    
    const userStory = await this.getUserInput('Enter your user story: ');
    const featureName = await this.getUserInput('Enter feature name (optional): ');
    
    if (!userStory) {
      this.warning('User story is required!');
      await this.pause();
      return;
    }

    const safeName = featureName || 'TextGeneratedFlow';
    const command = `node run.js text "${userStory}" ${safeName}`;
    
    await this.runCommand(command, 'Text Analysis Generation');
    await this.pause();
  }

  async handleImageGeneration() {
    this.clear();
    this.header(`${emoji.camera} IMAGE GENERATION`);
    
    this.info('Generate tests from UI screenshots or mockups');
    
    // Show available images
    const exampleImages = ['examples/home.png', 'examples/plp-add-new-employee.jpg'];
    this.log(`\n${colors.cyan}Available example images:${colors.reset}`);
    exampleImages.forEach((img, i) => {
      if (fs.existsSync(img)) {
        this.log(`  ${colors.yellow}${i + 1}.${colors.reset} ${colors.white}${img}${colors.reset}`);
      }
    });
    
    const imagePath = await this.getUserInput('\nEnter image path (or press Enter for demo): ');
    const featureName = await this.getUserInput('Enter feature name (optional): ');
    
    const targetImage = imagePath || 'examples/home.png';
    const safeName = featureName || 'ImageGeneratedFlow';
    
    if (!fs.existsSync(targetImage)) {
      this.warning(`Image not found: ${targetImage}`);
      await this.pause();
      return;
    }

    const command = `node run.js image "${targetImage}" ${safeName}`;
    await this.runCommand(command, 'Image Analysis Generation');
    await this.pause();
  }

  async handleSummaryGeneration() {
    this.clear();
    this.header(`${emoji.document} SUMMARY FILE GENERATION`);
    
    this.info('Generate tests from text summary files');
    
    const summaryPath = await this.getUserInput('Enter file path (or press Enter for demo): ');
    const featureName = await this.getUserInput('Enter feature name (optional): ');
    
    const targetFile = summaryPath || 'examples/jira-story.txt';
    const safeName = featureName || 'SummaryGeneratedFlow';
    
    if (!fs.existsSync(targetFile)) {
      this.warning(`File not found: ${targetFile}`);
      await this.pause();
      return;
    }

    const command = `node run.js summary "${targetFile}" ${safeName}`;
    await this.runCommand(command, 'Summary File Analysis');
    await this.pause();
  }

  async handleJiraGeneration() {
    this.clear();
    this.header(`${emoji.bug} JIRA GENERATION`);
    
    this.info('Generate tests from JIRA stories');
    this.warning('Requires JIRA configuration (URL, username, API token)');
    
    const jiraKey = await this.getUserInput('Enter JIRA key (e.g., ABC-123): ');
    
    if (!jiraKey) {
      this.warning('JIRA key is required!');
      await this.pause();
      return;
    }

    const command = `node run.js jira ${jiraKey}`;
    await this.runCommand(command, 'JIRA Integration');
    await this.pause();
  }

  async handleVerifySetup() {
    this.clear();
    this.header(`${emoji.gear} VERIFY SETUP`);
    
    this.info('Testing all platform functionalities...\n');
    
    const verifications = [
      { name: 'Image Analysis', command: 'npm run verify:images' },
      { name: 'Text Analysis', command: 'npm run verify:text' },
      { name: 'Summary Analysis', command: 'npm run verify:summary' },
      { name: 'Fallback Parser', command: 'npm run verify:fallback' }
    ];

    let passed = 0;
    for (const verification of verifications) {
      this.log(`${colors.bright}${colors.blue}Testing ${verification.name}...${colors.reset}`);
      const success = await this.runCommand(verification.command, verification.name);
      if (success) passed++;
      this.log(''); // Empty line for spacing
    }

    if (passed === verifications.length) {
      this.success(`All ${passed} verifications passed! ${emoji.trophy}`);
    } else {
      this.warning(`${passed}/${verifications.length} verifications passed`);
    }
    
    await this.pause();
  }

  async handleBrowseFiles() {
    this.clear();
    this.header(`${emoji.document} BROWSE GENERATED FILES`);
    
    const testDirs = this.getTestDirectories();
    
    if (testDirs.length === 0) {
      this.warning('No generated files found! Create some tests first.');
      await this.pause();
      return;
    }

    this.log(`${colors.cyan}Generated test projects:${colors.reset}\n`);
    
    testDirs.forEach((dir, i) => {
      const dirPath = path.join(this.outputDir, dir);
      const stats = fs.statSync(dirPath);
      const modified = stats.mtime.toLocaleString();
      
      this.log(`${colors.bright}${colors.yellow}${i + 1}. ${dir}${colors.reset}`);
      this.log(`   ${colors.cyan}Modified: ${modified}${colors.reset}`);
      
      // Show file structure
      const subDirs = ['Features', 'Pages', 'Steps', 'Tests'];
      subDirs.forEach(subDir => {
        const subPath = path.join(dirPath, subDir);
        if (fs.existsSync(subPath)) {
          const files = fs.readdirSync(subPath);
          if (files.length > 0) {
            this.log(`   ${colors.green}${subDir}/${colors.reset} ${files.join(', ')}`);
          }
        }
      });
      this.log(''); // Empty line
    });

    const choice = await this.getUserInput('Enter project number to open folder (or Enter to continue): ');
    
    if (choice && !isNaN(choice)) {
      const index = parseInt(choice) - 1;
      if (index >= 0 && index < testDirs.length) {
        const dirPath = path.join(this.outputDir, testDirs[index]);
        try {
          execSync(`open "${dirPath}"`, { stdio: 'ignore' });
          this.success(`Opened folder: ${testDirs[index]}`);
        } catch (error) {
          this.warning(`Could not open folder: ${error.message}`);
        }
      }
    }
    
    await this.pause();
  }

  async handleRunTests() {
    const choice = await this.showTestMenu();
    
    switch (choice) {
      case '1':
        await this.runAllTests();
        break;
      case '2':
        await this.runSpecificTest();
        break;
      case '3':
        await this.runLatestTest();
        break;
      case 'b':
        return;
      default:
        this.warning('Invalid choice!');
        await this.pause();
    }
  }

  async runAllTests() {
    this.clear();
    this.header(`${emoji.lightning} RUN ALL TESTS`);
    
    await this.runCommand('npm test', 'Running all Playwright tests');
    await this.pause();
  }

  async runSpecificTest() {
    this.clear();
    this.header(`${emoji.target} RUN SPECIFIC TEST`);
    
    const testDirs = this.getTestDirectories();
    
    this.log(`${colors.cyan}Available tests:${colors.reset}`);
    testDirs.forEach((dir, i) => {
      this.log(`  ${colors.yellow}${i + 1}.${colors.reset} ${colors.white}${dir}${colors.reset}`);
    });

    const choice = await this.getUserInput('\nEnter test number: ');
    const index = parseInt(choice) - 1;
    
    if (index >= 0 && index < testDirs.length) {
      const testDir = testDirs[index];
      const testPath = path.join(this.outputDir, testDir, 'Tests');
      
      if (fs.existsSync(testPath)) {
        const testFiles = fs.readdirSync(testPath).filter(f => f.endsWith('.test.js'));
        if (testFiles.length > 0) {
          const testFile = path.join(testPath, testFiles[0]);
          await this.runCommand(`npx playwright test "${testFile}"`, `Running ${testDir} tests`);
        } else {
          this.warning('No test files found in this project');
        }
      } else {
        this.warning('Test directory not found');
      }
    } else {
      this.warning('Invalid test number');
    }
    
    await this.pause();
  }

  async runLatestTest() {
    this.clear();
    this.header(`${emoji.fire} RUN LATEST TEST`);
    
    const testDirs = this.getTestDirectories();
    
    if (testDirs.length > 0) {
      const latestDir = testDirs[0]; // Already sorted by modification time
      const testPath = path.join(this.outputDir, latestDir, 'Tests');
      
      if (fs.existsSync(testPath)) {
        const testFiles = fs.readdirSync(testPath).filter(f => f.endsWith('.test.js'));
        if (testFiles.length > 0) {
          const testFile = path.join(testPath, testFiles[0]);
          this.info(`Running latest test: ${latestDir}`);
          await this.runCommand(`npx playwright test "${testFile}"`, `Running ${latestDir} tests`);
        } else {
          this.warning('No test files found in latest project');
        }
      } else {
        this.warning('Test directory not found');
      }
    } else {
      this.warning('No tests available');
    }
    
    await this.pause();
  }

  async handleDemos() {
    const choice = await this.showDemoMenu();
    
    switch (choice) {
      case '1':
        await this.runCommand('npm run demo:text', 'Text Analysis Demo');
        break;
      case '2':
        await this.runCommand('npm run demo:image', 'Image Analysis Demo');
        break;
      case '3':
        await this.runCommand('npm run demo:fallback', 'Fallback Parser Demo');
        break;
      case '4':
        await this.runCommand('npm run demo:summary', 'Summary File Demo');
        break;
      case '5':
        this.clear();
        this.header(`${emoji.party} RUNNING ALL DEMOS`);
        await this.runCommand('npm run verify:all', 'All Demos');
        break;
      case 'b':
        return;
      default:
        this.warning('Invalid choice!');
        await this.pause();
        return;
    }
    
    await this.pause();
  }

  async handleBatchOperations() {
    this.clear();
    this.header(`${emoji.lightning} BATCH OPERATIONS`);
    
    const options = [
      { key: '1', label: `${emoji.test} Run All Strategy Tests`, desc: 'Test all generation methods' },
      { key: '2', label: `${emoji.fire} Run All Demos`, desc: 'Show all capabilities' },
      { key: '3', label: `${emoji.gear} Complete Verification`, desc: 'Verify entire platform' },
      { key: '4', label: `${emoji.rocket} Generate Examples`, desc: 'Create sample projects' },
      { key: 'b', label: `${emoji.target} Back to Main Menu`, desc: '' }
    ];

    this.displayMenu(options);
    const choice = await this.getUserInput('\nChoose batch operation: ');
    
    switch (choice) {
      case '1':
        await this.runCommand('npm run test:all-strategies', 'All Strategy Tests');
        break;
      case '2':
        await this.runCommand('npm run verify:all', 'All Demos');
        break;
      case '3':
        await this.handleVerifySetup();
        return; // handleVerifySetup includes its own pause
      case '4':
        await this.generateExamples();
        break;
      case 'b':
        return;
      default:
        this.warning('Invalid choice!');
        break;
    }
    
    if (choice !== '3') {
      await this.pause();
    }
  }

  async generateExamples() {
    this.clear();
    this.header(`${emoji.rocket} GENERATING EXAMPLES`);
    
    const examples = [
      { name: 'Login Example', command: 'npm run example:login' },
      { name: 'E-commerce Example', command: 'npm run example:ecommerce' },
      { name: 'Contact Form Example', command: 'npm run example:form' }
    ];

    for (const example of examples) {
      await this.runCommand(example.command, example.name);
      this.log(''); // spacing
    }
    
    this.success(`Generated ${examples.length} example projects! ${emoji.party}`);
  }

  async run() {
    // Set up input handling
    process.stdin.setEncoding('utf8');
    process.stdin.setRawMode(true);
    
    while (true) {
      const choice = await this.showMainMenu();
      
      switch (choice) {
        case '1':
          const genChoice = await this.showGenerateMenu();
          switch (genChoice) {
            case '1':
              await this.handlePlaywrightRecording();
              break;
            case '2':
              await this.handleTextGeneration();
              break;
            case '3':
              await this.handleImageGeneration();
              break;
            case '4':
              await this.handleSummaryGeneration();
              break;
            case '5':
              await this.handleJiraGeneration();
              break;
            case 'b':
              break;
            default:
              this.warning('Invalid choice!');
              await this.pause();
          }
          break;
          
        case '2':
          await this.handleRunTests();
          break;
          
        case '3':
          await this.handleDemos();
          break;
          
        case '4':
          await this.handleVerifySetup();
          break;
          
        case '5':
          await this.handleBrowseFiles();
          break;
          
        case '6':
          await this.handleBatchOperations();
          break;
          
        case 'q':
          this.clear();
          this.log(`\n${emoji.party} ${colors.bright}${colors.green}[Auto Co] Thank you for using Auto-Design-Platform[ADP]!${colors.reset}`);
          this.log(`${colors.cyan}Happy testing! ${emoji.rocket}${colors.reset}\n`);
          process.exit(0);
          
        default:
          this.warning('Invalid choice! Please try again.');
          await this.pause();
      }
    }
  }
}

// Handle graceful exit
process.on('SIGINT', () => {
  console.log(`\n\n${emoji.party} ${colors.bright}${colors.green}Goodbye! Thanks for using Auto-Design Platform!${colors.reset}`);
  process.exit(0);
});

// Start the interactive runner
const runner = new InteractiveRunner();
runner.run().catch(console.error);
