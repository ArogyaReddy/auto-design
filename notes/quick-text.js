#!/usr/bin/env node

// Quick text input mode for Auto-Design Platform
const { TextAnalysisStrategy } = require('../src/strategies/TextAnalysisStrategy');
const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');
const readline = require('readline');

// Beautiful styling
const chalk = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  white: (text) => `\x1b[37m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  bg: {
    blue: (text) => `\x1b[44m\x1b[37m${text}\x1b[0m`
  }
};

/**
 * Multi-line console input
 */
async function getMultiLineInput(prompt, placeholder = '') {
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
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('> ')
  });
  
  return new Promise((resolve, reject) => {
    console.log(chalk.cyan('Start typing your text (type DONE when finished):'));
    rl.prompt();
    
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
        resolve(result);
        return;
      }
      
      if (trimmedInput.toUpperCase() === 'CANCEL') {
        rl.close();
        console.log(chalk.yellow('\n⚠️  Input cancelled.'));
        reject(new Error('User cancelled input'));
        return;
      }
      
      lines.push(input);
      rl.prompt();
    });
  });
}

async function quickTextMode() {
  console.log(chalk.bg.blue(chalk.bold(' 📝 QUICK TEXT MODE - AUTO-DESIGN PLATFORM ')));
  console.log('');
  console.log(chalk.cyan('Generate BDD tests from your text description!'));
  console.log('');
  
  try {
    // Get user story
    const userStory = await getMultiLineInput(
      '📝 Describe your test scenario:',
      'As a user\nI want to login to the application\nSo that I can access my dashboard'
    );
    
    // Get feature name
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const featureName = await new Promise((resolve) => {
      rl.question(chalk.cyan('\n🏷️  Enter feature name (e.g., UserLogin): '), (answer) => {
        rl.close();
        resolve(answer.trim() || 'QuickTextFeature');
      });
    });
    
    console.log(chalk.yellow('\n⚙️  Generating test files...'));
    
    // Generate using TextAnalysisStrategy
    const strategy = new TextAnalysisStrategy({ useAI: false });
    const testPlan = await strategy.createTestPlan(userStory, featureName);
    
    // Register Handlebars helper
    require('handlebars').registerHelper('eq', function(a, b) {
      return a === b;
    });
    
    // Generate all files
    const outputDir = path.join(process.cwd(), 'output', featureName);
    fs.ensureDirSync(path.join(outputDir, 'Features'));
    fs.ensureDirSync(path.join(outputDir, 'Steps'));
    fs.ensureDirSync(path.join(outputDir, 'Pages'));
    fs.ensureDirSync(path.join(outputDir, 'Tests'));
    
    // Generate feature file
    const featureTemplate = fs.readFileSync(path.join(__dirname, 'src/templates/feature.hbs'), 'utf8');
    const compiledFeature = Handlebars.compile(featureTemplate);
    const featureContent = compiledFeature(testPlan);
    fs.writeFileSync(path.join(outputDir, 'Features', `${featureName}.feature`), featureContent);
    
    // Generate step definitions
    const stepsTemplate = fs.readFileSync(path.join(__dirname, 'src/templates/steps.hbs'), 'utf8');
    const compiledSteps = Handlebars.compile(stepsTemplate);
    const stepsContent = compiledSteps({...testPlan, pageClassName: `${featureName}Page`});
    fs.writeFileSync(path.join(outputDir, 'Steps', `${featureName}.steps.js`), stepsContent);
    
    console.log(chalk.green('\n🎉 Success! Generated files:'));
    console.log(chalk.cyan(`📁 ${outputDir}/`));
    console.log(chalk.white(`   ├── Features/${featureName}.feature`));
    console.log(chalk.white(`   └── Steps/${featureName}.steps.js`));
    console.log('');
    console.log(chalk.yellow('✨ Generated BDD Feature Preview:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(featureContent.split('\n').slice(0, 15).join('\n'));
    console.log(chalk.gray('─'.repeat(60)));
    
  } catch (error) {
    console.log(chalk.red(`\n❌ Error: ${error.message}`));
    process.exit(1);
  }
}

quickTextMode();
