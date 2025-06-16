#!/usr/bin/env node
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { AutoDesign } = require('./src/AutoDesign.js');
const { CodeGenStrategy } = require('./src/strategies/CodeGenStrategy.js');
const { ScreenshotStrategy } = require('./src/strategies/ScreenshotStrategy.js');

async function main() {
  const parser = yargs(hideBin(process.argv))
    .command('record', 'Record a new test using Playwright CodeGen', y => y
      .option('url',  { describe: 'The starting URL for the recording session', type: 'string', demandOption: true })
      .option('name', { describe: 'The name for the generated feature (e.g., "LoginFlow")', type: 'string', demandOption: true })
    )
    .command('text', 'Generate a test from a JIRA story or description', y => y
      .option('file', { describe: 'Path to the .txt file containing the description', type: 'string', demandOption: true })
      .option('name', { describe: 'The name for the generated feature', type: 'string', demandOption: true })
    )
    .command('image', 'Generate a test from a UI screenshot', y => y
      .option('path', { describe: 'Path to the screenshot image file', type: 'string', demandOption: true })
      .option('name', { describe: 'The name for the generated feature', type: 'string', demandOption: true })
    )
    .demandCommand(1, 'You must choose a command: record, text, or image')
    .help();

  const argv = parser.argv;
  const mode = argv._[0];

  let strategy;
  let input;

  switch(mode) {
    case 'record':
      strategy = new CodeGenStrategy();
      input = argv.url;
      break;
    case 'text':
      strategy = new LocalAiStrategy();
      input = { type: 'text', data: argv.file };
      break;
    case 'image':
      strategy = new ScreenshotStrategy();
      input = { type: 'image', data: argv.path };
      break;
  }
  
  const designer = new AutoDesign(strategy);
  await designer.generate(input, argv.name);
}

main().catch(err => {
  console.error("❌ An unexpected error occurred:", err);
  process.exit(1);
});