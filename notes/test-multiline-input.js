#!/usr/bin/env node

// Test the new multi-line input functionality
const readline = require('readline');

// Beautiful styling
const chalk = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  white: (text) => `\x1b[37m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  bg: {
    blue: (text) => `\x1b[44m\x1b[37m${text}\x1b[0m`,
    green: (text) => `\x1b[42m\x1b[37m${text}\x1b[0m`,
    yellow: (text) => `\x1b[43m\x1b[30m${text}\x1b[0m`
  }
};

/**
 * Multi-line console input with proper line-by-line entry
 * Users can type multiple lines and type "DONE" to finish
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
      
      lines.push(input);
      rl.prompt();
    });
    
    rl.on('close', () => {
      if (lines.length > 0) {
        const result = lines.join('\n').trim();
        resolve(result);
      }
    });
  });
}

async function testMultiLineInput() {
  console.log(chalk.bg.blue(chalk.bold(' 🧪 TESTING MULTI-LINE INPUT ')));
  console.log('');
  
  try {
    const userStory = await getMultiLineInput(
      '📝 Enter your user story or test description:',
      'As a registered user\nI want to login to my account\nSo that I can access my dashboard'
    );
    
    console.log(chalk.green('\n🎉 Success! Here\'s what you entered:'));
    console.log(chalk.white(`"${userStory}"`));
    
    console.log(chalk.cyan('\n✨ This text would now be processed by the Auto-Design Platform to generate:'));
    console.log(chalk.yellow('   • BDD Feature files with user stories'));
    console.log(chalk.yellow('   • Page Object Models'));
    console.log(chalk.yellow('   • Step Definitions'));
    console.log(chalk.yellow('   • Playwright Tests'));
    
  } catch (error) {
    console.log(chalk.red(`\n❌ Error: ${error.message}`));
  }
  
  process.exit(0);
}

testMultiLineInput();
