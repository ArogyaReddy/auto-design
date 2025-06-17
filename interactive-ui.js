#!/usr/bin/env node

const inquirer = require('inquirer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { getConfig } = require('./src/core/Config.js');

// Global exception class for ESC key handling
class EscapeToMainMenuException extends Error {
  constructor() {
    super('User pressed ESC to return to main menu');
    this.name = 'EscapeToMainMenuException';
  }
}

// Disable mouse support to prevent junk characters in terminal
// process.stdout.write('\x1b[?1000;1006;1015h');

// Beautiful styling
const chalk = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  white: (text) => `\x1b[37m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`, // Added missing gray
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
  bg: {
    blue: (text) => `\x1b[44m\x1b[37m${text}\x1b[0m`,
    green: (text) => `\x1b[42m\x1b[37m${text}\x1b[0m`,
    yellow: (text) => `\x1b[43m\x1b[30m${text}\x1b[0m`
  }
};

class AutoDesignUI {
  constructor() {
    this.outputDir = './output';
    this.config = getConfig();
    this.userPreferences = this.loadUserPreferences();
    this.sessionHistory = []; // Track user actions for smarter defaults
    
    // Validate and repair preferences for reliability
    this.validateAndRepairPreferences();
    
    this.showWelcome();
  }

  // Enhanced prompt wrapper that handles ESC key globally
  async safePrompt(questions, options = {}) {
    try {
      // Add ESC hint to messages if not already present
      if (Array.isArray(questions)) {
        questions = questions.map(q => ({
          ...q,
          message: q.message && !q.message.includes('ESC') ? 
            `${q.message} (Press ESC to return to main menu)` : q.message
        }));
      } else {
        questions.message = questions.message && !questions.message.includes('ESC') ? 
          `${questions.message} (Press ESC to return to main menu)` : questions.message;
      }

      const result = await inquirer.prompt(questions, options);
      
      // Check for manual ESC commands in text inputs
      if (typeof result === 'object') {
        for (const [key, value] of Object.entries(result)) {
          if (typeof value === 'string' && (value.toUpperCase() === 'ESC' || value.toUpperCase() === 'MAIN')) {
            throw new EscapeToMainMenuException();
          }
        }
      }
      
      return result;
    } catch (error) {
      if (error.isTtyError || error.name === 'EscapeToMainMenuException') {
        throw new EscapeToMainMenuException();
      }
      throw error;
    }
  }

  loadUserPreferences() {
    const prefPath = path.join(__dirname, '.autodesign-preferences.json');
    if (fs.existsSync(prefPath)) {
      try {
        return JSON.parse(fs.readFileSync(prefPath, 'utf8'));
      } catch (error) {
        return {};
      }
    }
    return {};
  }

  saveUserPreferences() {
    const prefPath = path.join(__dirname, '.autodesign-preferences.json');
    try {
      fs.writeFileSync(prefPath, JSON.stringify(this.userPreferences, null, 2));
    } catch (error) {
      // Silently fail - preferences are nice to have but not critical
    }
  }

  getDefaultValue(key, fallback = '', category = null) {
    // Priority: session history > user preferences > config > environment > fallback
    const sessionValue = this.getSessionDefault(key);
    const prefValue = this.getPreferenceValue(key, category);
    const configValue = this.config.get(key);
    const envValue = process.env[key.toUpperCase()] || process.env[key];
    
    return sessionValue || prefValue || configValue || envValue || fallback;
  }

  getPreferenceValue(key, category = null) {
    // Support hierarchical preferences like recording.URL or general.outputDirectory
    if (category && this.userPreferences[category] && this.userPreferences[category][key]) {
      return this.userPreferences[category][key];
    }
    
    // Support direct key access for backward compatibility
    if (this.userPreferences[key]) {
      return this.userPreferences[key];
    }
    
    // Support dot notation like 'recording.URL'
    if (key.includes('.')) {
      const parts = key.split('.');
      let value = this.userPreferences;
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return null;
        }
      }
      return value;
    }
    
    return null;
  }

  setUserPreference(key, value, category = null) {
    if (category) {
      if (!this.userPreferences[category]) {
        this.userPreferences[category] = {};
      }
      this.userPreferences[category][key] = value;
    } else if (key.includes('.')) {
      // Support dot notation like 'recording.URL'
      const parts = key.split('.');
      let current = this.userPreferences;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part] || typeof current[part] !== 'object') {
          current[part] = {};
        }
        current = current[part];
      }
      current[parts[parts.length - 1]] = value;
    } else {
      this.userPreferences[key] = value;
    }
    this.saveUserPreferences();
  }

  getSessionDefault(key) {
    // Get the most recent value from this session
    const recentActions = this.sessionHistory.slice(-5); // Last 5 actions
    for (let i = recentActions.length - 1; i >= 0; i--) {
      if (recentActions[i][key]) {
        return recentActions[i][key];
      }
    }
    return null;
  }

  recordSessionAction(actionData) {
    this.sessionHistory.push({
      timestamp: new Date().toISOString(),
      ...actionData
    });
    // Keep only last 10 actions to avoid memory buildup
    if (this.sessionHistory.length > 10) {
      this.sessionHistory = this.sessionHistory.slice(-10);
    }
  }

  setUserPreference(key, value) {
    this.userPreferences[key] = value;
    this.saveUserPreferences();
  }

  showWelcome() {
    console.clear();
    console.log(chalk.bg.blue(chalk.bold('                              ')));
    console.log(chalk.bg.blue(chalk.bold('  🚀 AUTO-DESIGN PLATFORM ✨  ')));
    console.log(chalk.bg.blue(chalk.bold('                              ')));
    console.log('');
    console.log(chalk.cyan('[Auto Gen] Generate Automated tests from your ideas! 🪄'));
    console.log('');
  }

  async runCommand(command, description) {
    console.log(chalk.cyan(`\n▶️  ${description}`));
    console.log(chalk.yellow(`Command: ${command}\n`));
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      const child = spawn('npm', ['run', ...command.split(' ').slice(2)], {
        stdio: 'inherit',
        shell: true
      });

      child.on('close', (code) => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        if (code === 0) {
          console.log(chalk.green(`\n✅ Completed in ${duration}s! 🎉`));
        } else {
          console.log(chalk.red(`\n❌ Failed with code ${code}`));
        }
        resolve(code === 0);
      });
    });
  }

  async runDirectCommand(command, description) {
    console.log(chalk.cyan(`\n▶️  ${description}`));
    console.log(chalk.yellow(`Command: ${command}\n`));
    
    try {
      const startTime = Date.now();
      const output = execSync(command, { 
        stdio: ['inherit', 'pipe', 'inherit'], // Capture stdout only
        cwd: process.cwd(),
        encoding: 'utf8'
      });
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(chalk.green(`\n✅ Completed in ${duration}s! 🎉`));
      
      // Extract output directory if present
      const outputMatch = output.match(/[Auto Coder] Success! Test files generated in (.+)/);
      const result = { success: true, output };
      if (outputMatch) {
        result.outputDirectory = outputMatch[1].trim();
      }
      
      return result;
    } catch (error) {
      console.log(chalk.red(`\n❌ Command failed: ${error.message}`));
      return { success: false, error: error.message };
    }
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

  async showMainMenu() {
    const { action } = await this.safePrompt([
      {
        type: 'list',
        name: 'action',
        message: chalk.bold('[Auto Design] What would you like to do? (Use arrow keys)'),
        choices: [
          {
            name: '🚀 [Auto Coder] Generate Tests using Auto Coder',
            value: 'generate'
          },
          {
            name: '🧪 [Auto Runner] Run Tests using Auto Runner',
            value: 'run'
          },
          {
            name: '📁 [Auto Gen] Browse Files',
            value: 'browse'
          },
          new inquirer.Separator('──────────────────────────────'),
          {
            name: '🚪 Exit',
            value: 'exit'
          }
        ]
      }
    ]);

    return action;
  }

  async showGenerateMenu() {
    console.log(chalk.bg.blue(chalk.bold(' 🚀 GENERATE TESTS ')));
    console.log('');

    const { method } = await this.safePrompt([
      {
        type: 'list',
        name: 'method',
        message: '[Auto Gen] Choose generation method:',
        choices: [
          {
            name: '🎬 [Auto Recorder] Record Actions using Auto Recorder',
            value: 'recording'
          },
          {
            name: '📝 [Auto Coder] Text/User Story conversion using Auto Coder',
            value: 'text'
          },
          {
            name: '📸 [Auto Coder] Image/Screenshot conversion using Auto Coder',
            value: 'image'
          },
          {
            name: '🎫 [Auto Coder] JIRA Story/Feature extraction using Auto Coder',
            value: 'jira'
          },
          {
            name: '📄 [Auto Coder] Summary/Text File conversion using Auto Coder',
            value: 'summary'
          },
          new inquirer.Separator('──────────────────────────────'),
          {
            name: '⬅️  Back to Main Menu',
            value: 'back'
          }
        ]
      }
    ]);

    return method;
  }

  async handlePlaywrightRecording() {
    try {
      console.log(chalk.bg.blue(chalk.bold(' 🎬 [AUTO RECORDER] PLAYWRIGHT RECORDING ')));
      console.log('');
      console.log(chalk.cyan('[Auto Recorder] This will open the recorder in your browser'));
      
      // Get comprehensive defaults for recording
      const defaultUrl = this.getDefaultValue('URL', 'https://example.com', 'recording') || 
                        this.getDefaultValue('APP_URL') || 
                        'https://example.com';
      const defaultFeature = this.getDefaultValue('featureName', 'RecordedFlow', 'recording');
      const defaultBrowser = this.getDefaultValue('defaultBrowser', 'chromium', 'recording');
      const defaultHeadless = this.getDefaultValue('headless', false, 'recording');
    


    const answers = await this.safePrompt([
      {
        type: 'input',
        name: 'featureName',
        message: 'Enter feature name:',
        default: defaultFeature,
        validate: (input) => {
          return input.trim().length > 0 || 'Feature name is required';
        }
      },
      {
        type: 'input',
        name: 'url',
        message: 'Enter URL to record:',
        default: defaultUrl,
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'URL is required';
          }
          
          const trimmed = input.trim();
          
          try {
            new URL(trimmed);
            return true;
          } catch (error) {
            return 'Please enter a valid URL (e.g., https://example.com)';
          }
        }
      },
      {
        type: 'list',
        name: 'browser',
        message: 'Choose browser:',
        default: defaultBrowser,
        choices: [
          { name: '🌐 Chromium (Recommended)', value: 'chromium' },
          { name: '🦊 Firefox', value: 'firefox' },
          { name: '🧭 WebKit (Safari)', value: 'webkit' }
        ]
      },
      {
        type: 'confirm',
        name: 'headless',
        message: 'Run in headless mode?',
        default: defaultHeadless
      }
    ]);

    // Save comprehensive preferences
    this.setUserPreference('featureName', answers.featureName, 'recording');
    this.setUserPreference('URL', answers.url, 'recording');
    this.setUserPreference('defaultBrowser', answers.browser, 'recording');
    this.setUserPreference('headless', answers.headless, 'recording');
    
    // Also save to general preferences for backward compatibility
    this.setUserPreference('APP_URL', answers.url);
    this.setUserPreference('generationMethod', 'recording', 'general');
    
    this.recordSessionAction({
      action: 'recording',
      featureName: answers.featureName,
      url: answers.url,
      browser: answers.browser,
      headless: answers.headless
    });

    const browserFlag = answers.browser !== 'chromium' ? ` --browser ${answers.browser}` : '';
    const headlessFlag = answers.headless ? ' --headless' : '';
    
    const urlForCommand = answers.url.trim();
    const command = `node run.js record ${answers.featureName} --url "${urlForCommand}"${browserFlag}${headlessFlag}`;
    
    const result = await this.runDirectCommand(command, `[Auto Recorder] Recording ${answers.featureName}`);
    
    if (result.success) {
      console.log(chalk.green(`\n✅ [Auto Recorder] Successfully recorded ${answers.featureName}!`));
      console.log(chalk.cyan(`📁 [Auto Coder] Check output/${answers.featureName}/ for generated files`));
    }
    
    await this.returnToMenu();
    } catch (error) {
      if (error instanceof EscapeToMainMenuException) {
        throw error; // Re-throw to be caught by main run loop
      }
      console.log(chalk.red(`❌ Recording failed: ${error.message}`));
    }
  }

  async runGeneratedTest(featureName) {
    console.log(chalk.cyan(`\n🧪 Running test for ${featureName}...`));
    
    // Convert to PascalCase to match what AutoDesign generates
    const actualFeatureName = this._toPascalCase(featureName);
    
    const testPath = path.join(this.outputDir, actualFeatureName);
    if (!fs.existsSync(testPath)) {
      console.log(chalk.red(`❌ Test directory not found: ${testPath}`));
      console.log(chalk.yellow(`💡 Expected directory: output/${actualFeatureName}/`));
      
      // Try to find any directory that might match
      const directories = this.getTestDirectories();
      const possibleMatch = directories.find(dir => 
        dir.toLowerCase().includes(featureName.toLowerCase()) ||
        featureName.toLowerCase().includes(dir.toLowerCase())
      );
      
      if (possibleMatch) {
        console.log(chalk.cyan(`🔍 Found possible match: ${possibleMatch}`));
        const { useMatch } = await this.safePrompt([
          {
            type: 'confirm',
            name: 'useMatch',
            message: `Run test for ${possibleMatch} instead?`,
            default: true
          }
        ]);
        
        if (useMatch) {
          return await this.runGeneratedTest(possibleMatch);
        }
      }
      
      return false;
    }

    const command = `npx playwright test output/${actualFeatureName}/Tests/${actualFeatureName}.test.js`;
    return await this.runTestCommand(command, `Running ${actualFeatureName} test`, actualFeatureName);
  }

  /**
   * Convert string to PascalCase (matches AutoDesign._toPascalCase)
   */
  _toPascalCase(str) {
    if (!str) return 'DefaultFeature';
    return str
      .replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '')
      .replace(/^\w/, c => c.toUpperCase());
  }

  async handleTextGeneration() {
    console.log(chalk.bg.blue(chalk.bold(' 📝 [AUTO CODER] TEXT GENERATION ')));
    console.log('');

    let userStory;
    
    // Ask user for input preference
    const inputChoice = await this.safePrompt([
      {
        type: 'list',
        name: 'inputMethod',
        message: 'How would you like to enter your user story?',
        choices: [
          { name: '📝 Multi-line input', value: 'multiline' },
          { name: '✏️  Single-line input', value: 'singleline' },
          { name: '📄 External editor', value: 'editor' }
        ],
        default: 'singleline'
      }
    ]);
    
    try {
      if (inputChoice.inputMethod === 'multiline') {
        userStory = await this.getMultiLineInput(
          '📝 Enter your user story or test description:',
          'As a user I want to login'
        );
      } else if (inputChoice.inputMethod === 'editor') {
        const editorAnswer = await this.safePrompt([
          {
            type: 'editor',
            name: 'userStory',
            message: 'Enter your user story/description:',
            validate: (input) => input.trim().length > 0 || 'User story is required'
          }
        ]);
        userStory = editorAnswer.userStory;
      } else {
        const singleAnswer = await this.safePrompt([
          {
            type: 'input',
            name: 'userStory',
            message: 'Enter your user story/description:',
            validate: (input) => input.trim().length > 0 || 'User story is required'
          }
        ]);
        userStory = singleAnswer.userStory;
      }
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Input failed. Using fallback...`));
      
      const fallbackAnswer = await this.safePrompt([
        {
          type: 'input',
          name: 'userStory',
          message: 'Enter your user story:',
          default: 'As a user I want to test the application',
          validate: (input) => input.trim().length > 0 || 'User story is required'
        }
      ]);
      userStory = fallbackAnswer.userStory;
    }

    const additionalAnswers = await this.safePrompt([
      {
        type: 'input',
        name: 'featureName',
        message: 'Feature name:',
        default: 'TestFeature',
        validate: (input) => {
          return input.trim().length > 0 || 'Feature name is required';
        }
      },
      {
        type: 'list',
        name: 'testType',
        message: 'Test type:',
        default: 'e2e',
        choices: [
          { name: ' E2E', value: 'e2e' },
          { name: '� Functional', value: 'functional' },
          { name: '💨 Smoke', value: 'smoke' }
        ]
      }
    ]);

    // Combine the answers
    const answers = {
      userStory,
      featureName: additionalAnswers.featureName,
      testType: additionalAnswers.testType,
      includeValidation: true
    };

    const typeFlag = answers.testType !== 'functional' ? ` --type ${answers.testType}` : '';
    const command = `node run.js text "${answers.userStory.replace(/"/g, '\\"')}" ${answers.featureName}${typeFlag} --validation`;
    
    const result = await this.runDirectCommand(command, `Generating ${answers.featureName}`);
    
    if (result.success) {
      let actualFeatureName = answers.featureName;
      if (result.outputDirectory) {
        const dirMatch = result.outputDirectory.match(/output\/(.+)/);
        if (dirMatch) {
          actualFeatureName = dirMatch[1];
        }
      }
      
      console.log(chalk.green(`\n✅ [Auto Coder] Generated ${actualFeatureName}!`));
      console.log(chalk.cyan(`📁 Files in output/${actualFeatureName}/`));
    }
    
    await this.returnToMenu();
  }

  async handleImageGeneration() {
    console.log(chalk.bg.blue(chalk.bold(' 📸 [AUTO CODER] IMAGE GENERATION ')));
    console.log('');
    console.log(chalk.cyan('[Auto Coder] Analyze UI screenshots and mockups to generate tests'));

    // Get comprehensive defaults for image generation
    const defaultFeature = this.getDefaultValue('featureName', 'ImageAnalyzedFlow', 'image');
    const defaultImagePath = this.getDefaultValue('defaultImagePath', 'examples/', 'image');
    const defaultUseOCR = this.getDefaultValue('useOCR', true, 'image');
    const defaultFallback = this.getDefaultValue('fallbackToElementDetection', true, 'image');
    
    // Show available images
    const exampleImages = ['examples/home.png', 'examples/plp-add-new-employee.jpg', 'examples/plp-full-add-new-emp.png'];
    const availableImages = exampleImages.filter(img => fs.existsSync(img));

    const imageChoices = [
      ...availableImages.map(img => ({ name: `📁 ${img}`, value: img })),
      { name: '📁 Browse for custom image...', value: 'custom' }
    ];

    const answers = await this.safePrompt([
      {
        type: 'list',
        name: 'imagePath',
        message: 'Choose an image:',
        choices: imageChoices
      },
      {
        type: 'input',
        name: 'featureName',
        message: 'Enter feature name:',
        default: defaultFeature,
        validate: (input) => {
          return input.trim().length > 0 || 'Feature name is required';
        }
      },
      {
        type: 'confirm',
        name: 'useOCR',
        message: 'Use OCR text recognition?',
        default: defaultUseOCR
      },
      {
        type: 'confirm',
        name: 'fallbackToElementDetection',
        message: 'Enable element detection fallback?',
        default: defaultFallback
      },
      {
        type: 'list',
        name: 'analysisDepth',
        message: 'Select analysis depth:',
        default: 'standard',
        choices: [
          { name: '🚀 Quick - Basic elements only', value: 'quick' },
          { name: '⚖️  Standard - Balanced analysis', value: 'standard' },
          { name: '🔬 Deep - Comprehensive analysis', value: 'deep' }
        ]
      }
    ]);

    let imagePath = answers.imagePath;
    
    if (answers.imagePath === 'custom') {
      const lastPath = this.getDefaultValue('imagePath', defaultImagePath, 'image');
      const { customPath } = await this.safePrompt([
        {
          type: 'input',
          name: 'customPath',
          message: 'Enter image path:',
          default: lastPath,
          validate: (input) => {
            if (!input.trim()) return 'Path is required';
            if (!fs.existsSync(input.trim())) return 'File does not exist';
            return true;
          }
        }
      ]);
      imagePath = customPath;
      this.setUserPreference('imagePath', customPath, 'image');
    }

    // Save comprehensive preferences
    this.setUserPreference('featureName', answers.featureName, 'image');
    this.setUserPreference('useOCR', answers.useOCR, 'image');
    this.setUserPreference('fallbackToElementDetection', answers.fallbackToElementDetection, 'image');
    this.setUserPreference('generationMethod', 'image', 'general');
    
    this.recordSessionAction({
      action: 'image',
      featureName: answers.featureName,
      imagePath: imagePath,
      useOCR: answers.useOCR,
      analysisDepth: answers.analysisDepth
    });

    const ocrFlag = answers.useOCR ? ' --ocr' : '';
    const fallbackFlag = answers.fallbackToElementDetection ? ' --fallback' : '';
    const depthFlag = answers.analysisDepth !== 'standard' ? ` --depth ${answers.analysisDepth}` : '';
    const command = `node run.js image "${imagePath}" ${answers.featureName}${ocrFlag}${fallbackFlag}${depthFlag}`;
    
    const result = await this.runDirectCommand(command, `Analyzing image: ${answers.featureName}`);
    
    if (result.success) {
      console.log(chalk.green(`\n✅ [Auto Coder] Successfully analyzed image for ${answers.featureName}!`));
      console.log(chalk.cyan(`📁 [Auto Coder] Check output/${answers.featureName}/ for generated files`));
    }
    
    await this.returnToMenu();
  }

  async handleSummaryGeneration() {
    console.log(chalk.bg.blue(chalk.bold(' 📄 [AUTO CODER] SUMMARY FILE GENERATION ')));
    console.log('');

    // Load smart defaults from preferences
    const defaultFeature = this.getDefaultValue('featureName', 'SummaryGeneratedFlow', 'summary');
    const defaultSummaryPath = this.getDefaultValue('defaultSummaryPath', 'examples/', 'summary');
    const defaultFileType = this.getDefaultValue('lastFileType', 'txt', 'summary');
    const defaultParseFormat = this.getDefaultValue('parseFormat', 'markdown', 'summary');
    const lastFilePath = this.getDefaultValue('filePath', '', 'summary');

    // Find available summary files
    const summaryFiles = ['examples/jira-story.txt'];
    const availableFiles = summaryFiles.filter(file => fs.existsSync(file));

    const fileChoices = [
      ...availableFiles.map(file => ({ name: `📁 ${file}`, value: file })),
      { name: '📁 Browse for custom file...', value: 'custom' }
    ];

    const answers = await this.safePrompt([
      {
        type: 'input',
        name: 'featureName',
        message: 'Enter feature name:',
        default: defaultFeature,
        validate: (input) => input.trim().length > 0 || 'Feature name is required'
      },
      {
        type: 'list',
        name: 'filePath',
        message: 'Choose a summary file:',
        choices: fileChoices,
        default: lastFilePath && availableFiles.includes(lastFilePath) ? lastFilePath : availableFiles[0]
      },
      {
        type: 'list',
        name: 'parseFormat',
        message: 'Select parse format:',
        default: defaultParseFormat,
        choices: [
          { name: '📝 Markdown - Structured document parsing', value: 'markdown' },
          { name: '📄 Plain Text - Simple text analysis', value: 'text' },
          { name: '🔍 Auto-detect - Smart format detection', value: 'auto' }
        ]
      },
      {
        type: 'confirm',
        name: 'includeMetadata',
        message: 'Include file metadata in analysis?',
        default: true
      },
      {
        type: 'confirm',
        name: 'enhancedParsing',
        message: 'Use enhanced parsing for complex documents?',
        default: true
      }
    ]);

    let filePath = answers.filePath;
    
    if (answers.filePath === 'custom') {
      const { customPath } = await this.safePrompt([
        {
          type: 'input',
          name: 'customPath',
          message: 'Enter file path:',
          default: lastFilePath || defaultSummaryPath,
          validate: (input) => {
            if (!input.trim()) return 'Path is required';
            if (!fs.existsSync(input.trim())) return 'File does not exist';
            return true;
          }
        }
      ]);
      filePath = customPath;
    }

    // Save comprehensive preferences
    this.setUserPreference('featureName', answers.featureName, 'summary');
    this.setUserPreference('filePath', filePath, 'summary');
    this.setUserPreference('parseFormat', answers.parseFormat, 'summary');
    this.setUserPreference('fileType', path.extname(filePath).slice(1) || 'txt', 'summary');
    this.setUserPreference('generationMethod', 'summary', 'general');
    
    this.recordSessionAction({
      action: 'summary',
      featureName: answers.featureName,
      filePath: filePath,
      parseFormat: answers.parseFormat,
      enhancedParsing: answers.enhancedParsing
    });

    // Build command with options
    const formatFlag = answers.parseFormat !== 'auto' ? ` --format ${answers.parseFormat}` : '';
    const metadataFlag = answers.includeMetadata ? ' --metadata' : '';
    const enhancedFlag = answers.enhancedParsing ? ' --enhanced' : '';
    const command = `node run.js summary "${filePath}" ${answers.featureName}${formatFlag}${metadataFlag}${enhancedFlag}`;
    
    const result = await this.runDirectCommand(command, `Analyzing summary: ${answers.featureName}`);
    
    if (result.success) {
      console.log(chalk.green(`\n✅ Successfully generated ${answers.featureName}!`));
      console.log(chalk.cyan(`📁 [Auto Coder] Check output/${answers.featureName}/ for generated files`));
    }
    
    await this.pause();
  }

  async handleJiraGeneration() {
    console.log(chalk.bg.blue(chalk.bold(' 🐛 [AUTO CODER] JIRA GENERATION ')));
    console.log('');

    // Load smart defaults from preferences
    const defaultFeature = this.getDefaultValue('featureName', 'JiraStoryFlow', 'jira');
    const defaultTicketKey = this.getDefaultValue('ticketKey', '', 'jira');
    const defaultJiraURL = this.getDefaultValue('lastJiraURL', '', 'jira');
    const defaultProject = this.getDefaultValue('defaultProject', '', 'jira');
    const defaultAssignee = this.getDefaultValue('lastAssignee', '', 'jira');
    const defaultEpic = this.getDefaultValue('lastEpic', '', 'jira');

    console.log(chalk.yellow('⚠️  Requires JIRA configuration (URL, username, API token)'));
    console.log(chalk.cyan('   Set JIRA_URL, JIRA_USERNAME, JIRA_API_TOKEN environment variables'));
    console.log('');

    const answers = await this.safePrompt([
      {
        type: 'input',
        name: 'featureName',
        message: 'Enter feature name:',
        default: defaultFeature,
        validate: (input) => input.trim().length > 0 || 'Feature name is required'
      },
      {
        type: 'input',
        name: 'jiraKey',
        message: 'Enter JIRA ticket key (e.g., ABC-123):',
        default: defaultTicketKey,
        validate: (input) => {
          const trimmed = input.trim();
          if (!trimmed) return 'JIRA key is required';
          if (!/^[A-Z]+-\d+$/i.test(trimmed)) return 'Format should be PROJECT-123';
          return true;
        }
      },
      {
        type: 'input',
        name: 'jiraURL',
        message: 'Enter JIRA base URL (optional, uses env var if empty):',
        default: defaultJiraURL,
        validate: (input) => {
          if (input.trim() && !input.trim().startsWith('http')) {
            return 'URL should start with http:// or https://';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'project',
        message: 'Enter project key (optional):',
        default: defaultProject
      },
      {
        type: 'confirm',
        name: 'includeComments',
        message: 'Include JIRA comments in analysis?',
        default: true
      },
      {
        type: 'confirm',
        name: 'includeSubtasks',
        message: 'Include subtasks in test generation?',
        default: true
      },
      {
        type: 'list',
        name: 'testComplexity',
        message: 'Select test complexity level:',
        default: 'standard',
        choices: [
          { name: '🚀 Simple - Basic workflow only', value: 'simple' },
          { name: '⚖️  Standard - Comprehensive testing', value: 'standard' },
          { name: '🔬 Complex - Edge cases and validations', value: 'complex' }
        ]
      },
      {
        type: 'confirm',
        name: 'enhancedParsing',
        message: 'Use enhanced JIRA field parsing?',
        default: true
      }
    ]);

    // Save comprehensive preferences
    this.setUserPreference('featureName', answers.featureName, 'jira');
    this.setUserPreference('ticketKey', answers.jiraKey, 'jira');
    if (answers.jiraURL.trim()) {
      this.setUserPreference('jiraURL', answers.jiraURL.trim(), 'jira');
    }
    if (answers.project.trim()) {
      this.setUserPreference('defaultProject', answers.project.trim(), 'jira');
    }
    this.setUserPreference('generationMethod', 'jira', 'general');
    
    this.recordSessionAction({
      action: 'jira',
      featureName: answers.featureName,
      jiraKey: answers.jiraKey,
      project: answers.project,
      testComplexity: answers.testComplexity,
      includeComments: answers.includeComments
    });

    // Build command with options
    const urlFlag = answers.jiraURL.trim() ? ` --url "${answers.jiraURL.trim()}"` : '';
    const projectFlag = answers.project.trim() ? ` --project ${answers.project.trim()}` : '';
    const commentsFlag = answers.includeComments ? ' --comments' : '';
    const subtasksFlag = answers.includeSubtasks ? ' --subtasks' : '';
    const complexityFlag = answers.testComplexity !== 'standard' ? ` --complexity ${answers.testComplexity}` : '';
    const enhancedFlag = answers.enhancedParsing ? ' --enhanced' : '';
    
    const command = `node run.js jira ${answers.jiraKey} ${answers.featureName}${urlFlag}${projectFlag}${commentsFlag}${subtasksFlag}${complexityFlag}${enhancedFlag}`;
    
    const result = await this.runDirectCommand(command, `Fetching JIRA: ${answers.jiraKey}`);
    
    if (result.success) {
      console.log(chalk.green(`\n✅ Successfully generated ${answers.featureName}!`));
      console.log(chalk.cyan(`📁 [Auto Coder] Check output/${answers.featureName}/ for generated files`));
    }
    
    await this.returnToMenu();
  }

  async handleDemos() {
    console.log(chalk.bg.blue(chalk.bold(' 🔥 QUICK DEMOS ')));
    console.log('');

    const { demo } = await this.safePrompt([
      {
        type: 'list',
        name: 'demo',
        message: 'Choose a demo:',
        choices: [
          {
            name: '📝 Text Analysis Demo - AI-powered text parsing',
            value: 'text'
          },
          {
            name: '📸 Image Analysis Demo - OCR + test generation',
            value: 'image'
          },
          {
            name: '🤖 Fallback Parser Demo - Simple pattern matching',
            value: 'fallback'
          },
          {
            name: '📄 Summary File Demo - File-based analysis',
            value: 'summary'
          },
          {
            name: '🎉 Run All Demos - See everything in action',
            value: 'all'
          },
          new inquirer.Separator(),
          {
            name: '⬅️  Back to Main Menu',
            value: 'back'
          }
        ]
      }
    ]);

    if (demo === 'back') return;

    const commands = {
      text: { cmd: 'npm run demo:text', desc: 'Text Analysis Demo' },
      image: { cmd: 'npm run demo:image', desc: 'Image Analysis Demo' },
      fallback: { cmd: 'npm run demo:fallback', desc: 'Fallback Parser Demo' },
      summary: { cmd: 'npm run demo:summary', desc: 'Summary File Demo' },
      all: { cmd: 'npm run verify:all', desc: 'All Demos' }
    };

    const { cmd, desc } = commands[demo];
    await this.runCommand(cmd, desc);
    await this.pause();
  }

  async handleRunTests() {
    console.log(chalk.bg.blue(chalk.bold(' 🧪 [AUTO RUNNER] RUN EXISTING TESTS ')));
    console.log('');

    const testDirs = this.getTestDirectories();

    if (testDirs.length === 0) {
      console.log(chalk.yellow('⚠️  No test files found! Generate some tests first.'));
      await this.pause();
      return;
    }

    const { action } = await this.safePrompt([
      {
        type: 'list',
        name: 'action',
        message: 'Choose test action:',
        choices: [
          {
            name: '⚡ Run All Tests - Execute all generated tests',
            value: 'all'
          },
          {
            name: '🎯 Run Specific Test - Choose individual test',
            value: 'specific'
          },
          {
            name: '🔥 Run Latest Test - Run most recent generation',
            value: 'latest'
          },
          new inquirer.Separator(),
          {
            name: '⬅️  Back to Main Menu',
            value: 'back'
          }
        ]
      }
    ]);

    switch (action) {
      case 'all':
        await this.runTestCommand('npm test', 'Running all Playwright tests');
        break;
      case 'specific':
        await this.runSpecificTest(testDirs);
        break;
      case 'latest':
        await this.runLatestTest(testDirs);
        break;
      case 'back':
        return;
    }

    if (action !== 'back') {
      await this.pause();
    }
  }

  async runSpecificTest(testDirs) {
    const choices = testDirs.map((dir, i) => {
      const dirPath = path.join(this.outputDir, dir);
      const stats = fs.statSync(dirPath);
      const modified = stats.mtime.toLocaleString();
      return {
        name: `${dir} (${modified})`,
        value: dir
      };
    });

    const { selectedTest } = await this.safePrompt([
      {
        type: 'list',
        name: 'selectedTest',
        message: 'Choose test to run:',
        choices: choices
      }
    ]);

    const testPath = path.join(this.outputDir, selectedTest, 'Tests');
    if (fs.existsSync(testPath)) {
      const testFiles = fs.readdirSync(testPath).filter(f => f.endsWith('.test.js'));
      if (testFiles.length > 0) {
        const testFile = path.join(testPath, testFiles[0]);
        await this.runTestCommand(`npx playwright test "${testFile}"`, `Running ${selectedTest} tests`);
      } else {
        console.log(chalk.yellow('⚠️  No test files found in this project'));
      }
    } else {
      console.log(chalk.yellow('⚠️  Test directory not found'));
    }
  }

  async runLatestTest(testDirs) {
    const latestDir = testDirs[0]; // Already sorted by modification time
    const testPath = path.join(this.outputDir, latestDir, 'Tests');

    if (fs.existsSync(testPath)) {
      const testFiles = fs.readdirSync(testPath).filter(f => f.endsWith('.test.js'));
      if (testFiles.length > 0) {
        const testFile = path.join(testPath, testFiles[0]);
        console.log(chalk.cyan(`Running latest test: ${latestDir}`));
        await this.runTestCommand(`npx playwright test "${testFile}"`, `Running ${latestDir} tests`);
      } else {
        console.log(chalk.yellow('⚠️  No test files found in latest project'));
      }
    } else {
      console.log(chalk.yellow('⚠️  Test directory not found'));
    }
  }

  async handleVerifySetup() {
    console.log(chalk.bg.blue(chalk.bold(' ⚙️  VERIFY SETUP ')));
    console.log('');
    console.log(chalk.cyan('Testing all platform functionalities...'));
    console.log('');

    const verifications = [
      { name: 'Image Analysis', command: 'npm run verify:images' },
      { name: 'Text Analysis', command: 'npm run verify:text' },
      { name: 'Summary Analysis', command: 'npm run verify:summary' },
      { name: 'Fallback Parser', command: 'npm run verify:fallback' }
    ];

    let passed = 0;
    for (const verification of verifications) {
      console.log(chalk.bold(chalk.blue(`Testing ${verification.name}...`)));
      const success = await this.runCommand(verification.command, verification.name);
      if (success) passed++;
      console.log(''); // spacing
    }

    if (passed === verifications.length) {
      console.log(chalk.green(`✅ All ${passed} verifications passed! 🏆`));
    } else {
      console.log(chalk.yellow(`⚠️  ${passed}/${verifications.length} verifications passed`));
    }

    await this.pause();
  }

  async handleBrowseFiles() {
    console.log(chalk.bg.blue(chalk.bold(' 📁 [AUTO GEN] BROWSE GENERATED FILES ')));
    console.log('');

    const testDirs = this.getTestDirectories();

    if (testDirs.length === 0) {
      console.log(chalk.yellow('⚠️  No generated files found! Create some tests first.'));
      await this.pause();
      return;
    }

    const choices = testDirs.map((dir, i) => {
      const dirPath = path.join(this.outputDir, dir);
      const stats = fs.statSync(dirPath);
      const modified = stats.mtime.toLocaleString();
      
      // Count files
      let fileCount = 0;
      const subDirs = ['Features', 'Pages', 'Steps', 'Tests'];
      subDirs.forEach(subDir => {
        const subPath = path.join(dirPath, subDir);
        if (fs.existsSync(subPath)) {
          fileCount += fs.readdirSync(subPath).length;
        }
      });

      return {
        name: `${dir} - ${fileCount} files (${modified})`,
        value: dir
      };
    });

    choices.push(new inquirer.Separator());
    choices.push({ name: '⬅️  Back to Main Menu', value: 'back' });

    const { selectedDir } = await this.safePrompt([
      {
        type: 'list',
        name: 'selectedDir',
        message: 'Choose project to open:',
        choices: choices
      }
    ]);

    if (selectedDir !== 'back') {
      const dirPath = path.join(this.outputDir, selectedDir);
      try {
        execSync(`open "${dirPath}"`, { stdio: 'ignore' });
        console.log(chalk.green(`✅ Opened folder: ${selectedDir}`));
      } catch (error) {
        console.log(chalk.yellow(`⚠️  Could not open folder: ${error.message}`));
      }
      await this.pause();
    }
  }

  async handleBatchOperations() {
    console.log(chalk.bg.blue(chalk.bold(' ⚡ BATCH OPERATIONS ')));
    console.log('');

    const { operation } = await this.safePrompt([
      {
        type: 'list',
        name: 'operation',
        message: 'Choose batch operation:',
        choices: [
          {
            name: '🧪 Run All Strategy Tests - Test all generation methods',
            value: 'strategies'
          },
          {
            name: '🔥 Run All Demos - Show all capabilities',
            value: 'demos'
          },
          {
            name: '⚙️  Complete Verification - Verify entire platform',
            value: 'verify'
          },
          {
            name: '🚀 Generate Examples - Create sample projects',
            value: 'examples'
          },
          new inquirer.Separator(),
          {
            name: '⬅️  Back to Main Menu',
            value: 'back'
          }
        ]
      }
    ]);

    switch (operation) {
      case 'strategies':
        await this.runCommand('npm run test:all-strategies', 'All Strategy Tests');
        break;
      case 'demos':
        await this.runCommand('npm run verify:all', 'All Demos');
        break;
      case 'verify':
        await this.handleVerifySetup();
        return; // handleVerifySetup includes its own pause
      case 'examples':
        await this.generateExamples();
        break;
      case 'back':
        return;
    }

    if (operation !== 'verify') {
      await this.pause();
    }
  }

  async generateExamples() {
    const examples = [
      { name: 'Login Example', command: 'npm run example:login' },
      { name: 'E-commerce Example', command: 'npm run example:ecommerce' },
      { name: 'Contact Form Example', command: 'npm run example:form' }
    ];

    for (const example of examples) {
      await this.runCommand(example.command, example.name);
      console.log(''); // spacing
    }

    console.log(chalk.green(`✅ Generated ${examples.length} example projects! 🎉`));
  }

  async pause() {
    await this.safePrompt([
      {
        type: 'input',
        name: 'continue',
        message: chalk.cyan('Press Enter to continue...')
      }
    ]);
  }

  async returnToMenu() {
    console.log('');
    
    // Show a brief summary of what was just done
    const recentAction = this.sessionHistory[this.sessionHistory.length - 1];
    if (recentAction) {
      console.log(chalk.green(`✅ [Auto Coder] Just completed: ${recentAction.action}`));
      if (recentAction.featureName) {
        console.log(chalk.cyan(`📁 [Auto Coder] Generated: ${recentAction.featureName}`));
      }
      console.log('');
    }
    
    const { action } = await this.safePrompt([
      {
        type: 'list',
        name: 'action',
        message: chalk.bold('🎯 What would you like to do next?'),
        choices: [
          {
            name: '🏠 Return to Main Menu',
            value: 'menu'
          },
          {
            name: '🚀 Generate Another Test',
            value: 'generate'
          },
          {
            name: '🧪 Run Tests',
            value: 'run'
          },
          {
            name: '📁 Browse Generated Files',
            value: 'browse'
          },
          {
            name: '🔥 Quick Demo',
            value: 'demo'
          },
          new inquirer.Separator(),
          {
            name: '🚪 Exit',
            value: 'exit'
          }
        ]
      }
    ]);

    switch (action) {
      case 'menu':
        return; // Will return to main menu loop
      case 'generate':
        await this.handleGenerate();
        await this.returnToMenu(); // Continue the loop
        break;
      case 'run':
        await this.handleRunTests();
        await this.returnToMenu(); // Continue the loop
        break;
      case 'browse':
        await this.handleBrowseFiles();
        await this.returnToMenu(); // Continue the loop
        break;
      case 'demo':
        await this.handleDemos();
        await this.returnToMenu(); // Continue the loop
        break;
      case 'exit':
        console.clear();
        console.log(chalk.green('\n🎉 [Auto Co] Thank you for using Auto-Design-Platform![ADP]'));
        console.log(chalk.cyan('[Auto Coder] Happy testing! 🚀\n'));
        if (this.sessionHistory.length > 0) {
          console.log(chalk.yellow(`📊 Session summary: ${this.sessionHistory.length} actions completed`));
        }
        process.exit(0);
    }
  }

  async handleGenerate() {
    const method = await this.showGenerateMenu();
    switch (method) {
      case 'recording':
        await this.handlePlaywrightRecording();
        break;
      case 'text':
        await this.handleTextGeneration();
        break;
      case 'image':
        await this.handleImageGeneration();
        break;
      case 'summary':
        await this.handleSummaryGeneration();
        break;
      case 'jira':
        await this.handleJiraGeneration();
        break;
      case 'back':
        break;
    }
  }

  async run() {
    while (true) {
      try {
        const action = await this.showMainMenu();

        switch (action) {
          case 'generate':
            const method = await this.showGenerateMenu();
            switch (method) {
              case 'recording':
                await this.handlePlaywrightRecording();
                break;
              case 'text':
                await this.handleTextGeneration();
                break;
              case 'image':
                await this.handleImageGeneration();
                break;
              case 'summary':
                await this.handleSummaryGeneration();
                break;
              case 'jira':
                await this.handleJiraGeneration();
                break;
              case 'back':
                break;
            }
            break;

          case 'run':
            await this.handleRunTests();
            break;

          case 'demos':
            await this.handleDemos();
            break;

          case 'verify':
            await this.handleVerifySetup();
            break;

          case 'browse':
            await this.handleBrowseFiles();
            break;

          case 'batch':
            await this.handleBatchOperations();
            break;

          case 'preferences':
            await this.handlePreferencesManagement();
            break;

          case 'exit':
            console.clear();
            console.log(chalk.green('\n🎉 [Auto Coder] Thank you for using Auto-Design-Platform [ADP]!'));
            console.log(chalk.cyan('[Auto Coder] Happy testing! 🚀\n'));
            process.exit(0);
        }
      } catch (error) {
        if (error instanceof EscapeToMainMenuException) {
          console.log(chalk.yellow('\n⬅️  Returning to main menu...'));
          continue; // Return to main menu
        }
        throw error; // Re-throw other errors
      }
    }
  }

  validateAndRepairPreferences() {
    // Define the expected structure for preferences
    const expectedStructure = {
      recording: {
        featureName: 'RecordedFlow',
        URL: 'https://example.com',
        defaultBrowser: 'chromium',
        headless: false,
        timeout: 30000,
        defaultDescription: 'Interactive recording-based test flow',
        autoSaveScreenshots: true,
        waitStrategy: 'networkidle'
      },
      text: {
        featureName: 'TextGeneratedFlow',
        userStory: '',
        defaultDescription: 'As a user, I want to...',
        testType: 'functional',
        storyTemplates: [
          'As a {user_type}, I want to {action} so that {benefit}',
          'Given {context}, when {action}, then {outcome}',
          'The user should be able to {capability}'
        ],
        analysisDepth: 'standard'
      },
      image: {
        featureName: 'ImageAnalyzedFlow',
        imagePath: 'examples/',
        defaultImagePath: 'examples/',
        useOCR: true,
        fallbackToElementDetection: true,
        supportedFormats: ['jpg', 'png', 'jpeg', 'gif', 'bmp', 'webp'],
        ocrLanguage: 'eng',
        confidenceThreshold: 0.7,
        defaultDescription: 'UI component analysis and test generation'
      },
      jira: {
        featureName: 'JiraStoryFlow',
        ticketKey: '',
        jiraURL: '',
        defaultProject: '',
        assignee: '',
        epic: '',
        ticketKeyPattern: '^[A-Z]+-\\d+$',
        defaultDescription: 'JIRA ticket-based test scenario',
        includeAcceptanceCriteria: true,
        includeComments: true,
        includeSubtasks: true,
        fieldMappings: {
          summary: 'title',
          description: 'description',
          acceptanceCriteria: 'customfield_10000',
          testSteps: 'customfield_10001'
        }
      },
      summary: {
        featureName: 'SummaryBasedFlow',
        filePath: 'examples/',
        defaultSummaryPath: 'examples/',
        fileType: 'txt',
        parseFormat: 'markdown',
        supportedFormats: ['txt', 'md', 'json', 'csv', 'doc', 'docx'],
        defaultDescription: 'Document-based test scenario generation',
        encoding: 'utf8',
        chunkSize: 1000,
        includeMetadata: true,
        enhancedParsing: true
      },
      general: {
        outputDirectory: 'output',
        generationMethod: 'recording',
        alwaysRunAfterGeneration: false,
        preferredReporter: 'html',
        saveSessionHistory: true,
        autoBackup: true,
        maxBackups: 10,
        defaultTimeout: 30000,
        retryAttempts: 3,
        parallelExecution: false,
        verboseLogging: false
      },
      advanced: {
        customTemplatesPath: 'src/templates',
        debugMode: false,
        logLevel: 'info',
        backupGeneratedFiles: true,
        autoOpenResults: true,
        experimentalFeatures: false,
        cacheResults: true,
        optimizeGeneration: true,
        customHooks: {
          beforeGeneration: '',
          afterGeneration: '',
          beforeTest: '',
          afterTest: ''
        }
      },
      environments: {
        development: {
          baseUrl: 'http://localhost:3000',
          database: 'test_db',
          apiKey: ''
        },
        staging: {
          baseUrl: 'https://staging.example.com',
          database: 'staging_db',
          apiKey: ''
        },
        production: {
          baseUrl: 'https://example.com',
          database: 'prod_db',
          apiKey: ''
        }
      },
      descriptions: {
        defaultTemplates: {
          functional: 'Functional test to verify {feature} works correctly',
          integration: 'Integration test to validate {component} connectivity',
          e2e: 'End-to-end test covering {workflow} user journey',
          smoke: 'Smoke test to check basic {functionality}',
          performance: 'Performance test to measure {metric} under load'
        },
        customDescriptions: {},
        placeholders: {
          feature: 'Feature name',
          component: 'Component name',
          workflow: 'User workflow',
          functionality: 'Core functionality',
          metric: 'Performance metric'
        }
      }
    };

    let repairsMade = false;

    // Ensure all categories exist
    for (const [category, defaults] of Object.entries(expectedStructure)) {
      if (!this.userPreferences[category] || typeof this.userPreferences[category] !== 'object') {
        this.userPreferences[category] = {};
        repairsMade = true;
      }

      // Handle nested objects recursively
      this.ensureNestedStructure(this.userPreferences[category], defaults);
    }

    // Validate and fix data types
    const typeValidations = {
      'recording.headless': 'boolean',
      'recording.timeout': 'number',
      'recording.autoSaveScreenshots': 'boolean',
      'text.storyTemplates': 'array',
      'image.useOCR': 'boolean',
      'image.fallbackToElementDetection': 'boolean',
      'image.supportedFormats': 'array',
      'image.confidenceThreshold': 'number',
      'jira.includeAcceptanceCriteria': 'boolean',
      'jira.includeComments': 'boolean',
      'jira.includeSubtasks': 'boolean',
      'jira.fieldMappings': 'object',
      'summary.supportedFormats': 'array',
      'summary.chunkSize': 'number',
      'summary.includeMetadata': 'boolean',
      'summary.enhancedParsing': 'boolean',
      'general.alwaysRunAfterGeneration': 'boolean',
      'general.saveSessionHistory': 'boolean',
      'general.autoBackup': 'boolean',
      'general.maxBackups': 'number',
      'general.defaultTimeout': 'number',
      'general.retryAttempts': 'number',
      'general.parallelExecution': 'boolean',
      'general.verboseLogging': 'boolean',
      'advanced.debugMode': 'boolean',
      'advanced.backupGeneratedFiles': 'boolean',
      'advanced.autoOpenResults': 'boolean',
      'advanced.experimentalFeatures': 'boolean',
      'advanced.maxTokens': 'number',
      'advanced.temperature': 'number',
      'advanced.cacheResults': 'boolean',
      'advanced.optimizeGeneration': 'boolean',
      'advanced.customHooks': 'object'
    };

    for (const [keyPath, expectedType] of Object.entries(typeValidations)) {
      const value = this.getPreferenceValue(keyPath);
      
      if (value !== undefined && !this.isCorrectType(value, expectedType)) {
        // Try to convert to the expected type
        const [category, key] = keyPath.split('.');
        const defaultValue = this.getNestedValue(expectedStructure, keyPath);
        this.setUserPreference(key, defaultValue, category);
        repairsMade = true;
      }
    }

    // Validate file paths exist or reset to defaults
    const pathValidations = [
      'image.imagePath',
      'image.defaultImagePath',
      'summary.filePath',
      'summary.defaultSummaryPath',
      'general.outputDirectory',
      'advanced.customTemplatesPath'
    ];

    for (const keyPath of pathValidations) {
      const currentPath = this.getPreferenceValue(keyPath);
      
      if (currentPath && !fs.existsSync(currentPath)) {
        const [category, key] = keyPath.split('.');
        const defaultValue = this.getNestedValue(expectedStructure, keyPath);
        this.setUserPreference(key, defaultValue, category);
        repairsMade = true;
      }
    }

    if (repairsMade) {
      this.saveUserPreferences();
      if (this.userPreferences.advanced?.debugMode) {
        console.log(chalk.green('✅ Preferences validated and repaired'));
      }
    }

    return repairsMade;
  }

  ensureNestedStructure(target, template) {
    for (const [key, value] of Object.entries(template)) {
      if (!(key in target)) {
        target[key] = value;
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (typeof target[key] !== 'object' || target[key] === null || Array.isArray(target[key])) {
          target[key] = {};
        }
        this.ensureNestedStructure(target[key], value);
      }
    }
  }

  isCorrectType(value, expectedType) {
    switch (expectedType) {
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return typeof value === expectedType;
    }
  }

  getNestedValue(obj, keyPath) {
    const parts = keyPath.split('.');
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }
    return current;
  }

  async exportPreferences() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `autodesign-preferences-backup-${timestamp}.json`;
    const backupPath = path.join(process.cwd(), filename);
    
    try {
      // Create a clean copy with metadata
      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        platform: process.platform,
        preferences: this.userPreferences
      };
      
      fs.writeFileSync(backupPath, JSON.stringify(exportData, null, 2));
      console.log(chalk.green(`✅ Preferences exported to: ${filename}`));
      return backupPath;
    } catch (error) {
      console.log(chalk.red(`❌ Export failed: ${error.message}`));
      return null;
    }
  }

  async importPreferences(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(chalk.red(`❌ File not found: ${filePath}`));
        return false;
      }

      const importData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Handle both new format (with metadata) and old format (direct preferences)
      const preferencesToImport = importData.preferences || importData;
      
      // Backup current preferences
      const backupPath = await this.exportPreferences();
      if (!backupPath) {
        console.log(chalk.red('❌ Could not create backup - import cancelled'));
        return false;
      }

      // Import new preferences
      this.userPreferences = preferencesToImport;
      
      // Validate and repair imported preferences
      const repaired = this.validateAndRepairPreferences();
      
      console.log(chalk.green('✅ Preferences imported successfully!'));
      if (repaired) {
        console.log(chalk.yellow('⚠️  Some preferences were repaired during import'));
      }
      if (importData.exportDate) {
        console.log(chalk.cyan(`📅 Original export date: ${importData.exportDate}`));
      }
      
      return true;
    } catch (error) {
      console.log(chalk.red(`❌ Import failed: ${error.message}`));
      return false;
    }
  }

  /**
   * Multi-line console input with proper line-by-line entry
   * Users can type multiple lines and type "DONE" to finish
   */
  async getMultiLineInput(prompt, placeholder = '') {
    console.log(chalk.cyan(`\n${prompt}`));
    console.log(chalk.yellow('💡 Tips:'));
    console.log(chalk.yellow('   • Press Enter to go to the next line'));
    console.log(chalk.yellow('   • Type "DONE" on a new line when finished'));
    console.log(chalk.yellow('   • Type "CANCEL" to abort'));
    if (placeholder) {
      console.log(chalk.gray(`   • Example: ${placeholder}`));
    }
    console.log(chalk.yellow('─'.repeat(60)));
    
    const lines = [];
    const readline = require('readline');
    
    // Ensure clean terminal state
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> ',
      terminal: true
    });
    
    return new Promise((resolve, reject) => {
      console.log(chalk.cyan('Start typing your text (type DONE when finished):'));
      
      // Give a small delay to ensure terminal is ready
      setTimeout(() => {
        rl.prompt();
      }, 100);
      
      rl.on('line', (input) => {
        const trimmedInput = input.trim();
        
        if (trimmedInput.toUpperCase() === 'DONE') {
          if (lines.length === 0) {
            console.log(chalk.red('❌ No content entered. Please type some text or use CANCEL.'));
            rl.prompt();
            return;
          }
          rl.close();
          const result = lines.join('\n').trim();
          console.log(chalk.green('\n✅ Input completed!'));
          console.log(chalk.gray('─'.repeat(60)));
          console.log(chalk.cyan('Your input:'));
          console.log(chalk.white(result));
          console.log(chalk.gray('─'.repeat(60)));
          resolve(result);
          return;
        }
        
        if (trimmedInput.toUpperCase() === 'CANCEL') {
          rl.close();
          console.log(chalk.yellow('\n⚠️  Input cancelled.'));
          reject(new Error('User cancelled input'));
          return;
        }
        
        // Add the line and continue
        lines.push(input);
        console.log(chalk.gray(`   Line ${lines.length}: ${input}`));
        rl.prompt();
      });
      
      rl.on('close', () => {
        // Restore normal terminal behavior
        this.resetTerminalState();
        
        // Handle unexpected close
        if (lines.length > 0) {
          const result = lines.join('\n').trim();
          console.log(chalk.yellow('\n⚠️  Input session ended. Using entered text.'));
          resolve(result);
        } else {
          console.log(chalk.yellow('\n⚠️  Input session ended without content.'));
          reject(new Error('No input provided'));
        }
      });
      
      // Handle Ctrl+C and other interrupt signals
      rl.on('SIGINT', () => {
        rl.close();
        this.resetTerminalState();
        console.log(chalk.yellow('\n⚠️  Input interrupted.'));
        reject(new Error('User interrupted input'));
      });
      
      // Handle errors
      rl.on('error', (error) => {
        rl.close();
        this.resetTerminalState();
        console.log(chalk.red(`\n❌ Input error: ${error.message}`));
        reject(error);
      });
    });
  }

  /**
   * Reset terminal state to ensure proper behavior after multi-line input
   */
  resetTerminalState() {
    try {
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
      }
      // Clear any pending input
      if (process.stdin.readable) {
        process.stdin.pause();
        process.stdin.resume();
      }
    } catch (error) {
      // Ignore errors in terminal reset
    }
  }

  async handlePreferencesManagement() {
    console.log(chalk.bg.blue(chalk.bold(' ⚙️  PREFERENCES MANAGEMENT ')));
    console.log('');
    
    const { action } = await this.safePrompt([
      {
        type: 'list',
        name: 'action',
        message: 'Choose preference action:',
        choices: [
          { name: '📋 View Current Preferences', value: 'view' },
          { name: '💾 Export Preferences', value: 'export' },
          { name: '📥 Import Preferences', value: 'import' },
          { name: '🔧 Reset to Defaults', value: 'reset' },
          { name: '🔍 Validate & Repair', value: 'validate' },
          new inquirer.Separator(),
          { name: '← Back to Main Menu', value: 'back' }
        ]
      }
    ]);

    switch (action) {
      case 'view':
        console.log('\n📋 Current Preferences:');
        console.log(JSON.stringify(this.userPreferences, null, 2));
        break;
        
      case 'export':
        await this.exportPreferences();
        break;
        
      case 'import':
        const { filePath } = await this.safePrompt([
          {
            type: 'input',
            name: 'filePath',
            message: 'Enter path to preferences file:',
            validate: (input) => input.trim().length > 0 || 'Path is required'
          }
        ]);
        await this.importPreferences(filePath.trim());
        break;
        
      case 'reset':
        const { confirm } = await this.safePrompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to reset all preferences to defaults?',
            default: false
          }
        ]);
        
        if (confirm) {
          // Backup first
          await this.exportPreferences();
          this.userPreferences = {};
          this.validateAndRepairPreferences();
          console.log(chalk.green('✅ Preferences reset to defaults'));
        }
        break;
        
      case 'validate':
        const repaired = this.validateAndRepairPreferences();
        if (repaired) {
          console.log(chalk.green('✅ Preferences validated and repaired'));
        } else {
          console.log(chalk.green('✅ Preferences are valid'));
        }
        break;
        
      case 'back':
        return;
    }
    
    if (action !== 'back') {
      await this.pause();
      await this.handlePreferencesManagement(); // Return to prefs menu
    }
  }

  async runTestCommand(command, description, featureName = null) {
    console.log(chalk.cyan(`\n▶️  ${description}`));
    console.log(chalk.yellow(`Command: ${command}\n`));
    
    try {
      const startTime = Date.now();
      execSync(command, { stdio: 'inherit', cwd: process.cwd() });
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(chalk.green(`\n✅ Test completed in ${duration}s! 🎉`));
      
      // Show HTML report path
      const reportPath = path.resolve('playwright-report/index.html');
      if (fs.existsSync(reportPath)) {
        console.log(chalk.cyan(`📊 HTML Report: file://${reportPath}`));
        console.log(chalk.yellow(`💡 You can open this file in your browser to view detailed test results`));
      }
      
      return true;
    } catch (error) {
      console.log(chalk.red(`\n❌ Test failed: ${error.message}`));
      
      // Still show HTML report path even if tests failed
      const reportPath = path.resolve('playwright-report/index.html');
      if (fs.existsSync(reportPath)) {
        console.log(chalk.cyan(`📊 HTML Report: file://${reportPath}`));
        console.log(chalk.yellow(`💡 Check the report for detailed failure information`));
      }
      
      return false;
    }
  }
}

// Handle graceful exit
process.on('SIGINT', () => {
  // Disable mouse support before exit
  process.stdout.write('\x1b[?1000;1006;1015l');
  console.log(chalk.green('\n\n🎉 Goodbye! Thanks for using Auto-Design Platform!'));
  process.exit(0);
});

// Clean exit handler
process.on('exit', () => {
  // Disable mouse support on any exit
  process.stdout.write('\x1b[?1000;1006;1015l');
});

// Start the enhanced UI
const ui = new AutoDesignUI();
ui.run().catch(console.error);
