// run.js (Updated to use .env for JIRA)
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { AutoDesign } = require('./src/AutoDesign.js');
const { CodeGenStrategy } = require('./src/strategies/CodeGenStrategy.js');
const { JiraStrategy } = require('./src/strategies/JiraStrategy.js');

require('dotenv').config(); // This loads your .env file

async function main() {
  const parser = yargs(hideBin(process.argv))
    .command('record', 'Record a new test using Playwright CodeGen', y => y
      .option('name', { describe: 'The name for the generated feature', type: 'string', demandOption: true })
    )
    .command('jira', 'Generate a test from a JIRA story', y => y
      .option('key',   { describe: 'The JIRA issue key (e.g., "JRA-9")', type: 'string', demandOption: true })
    )
    .demandCommand(1, 'You must choose a command: record or jira')
    .help();

  const argv = parser.argv;
  const mode = argv._[0];

  let strategy, input, featureName;

  if (mode === 'record') {
    strategy = new CodeGenStrategy();
    input = process.env.APP_URL; // Use URL from .env
    featureName = argv.name;
  } else if (mode === 'jira') {
    strategy = new JiraStrategy();
    // Read JIRA details directly from .env file
    input = {
      url: process.env.JIRA_URL,
      key: argv.key,
      auth: { user: process.env.JIRA_USER, token: process.env.JIRA_API_TOKEN }
    };
    featureName = argv.key;
  }

  if (!input) {
    console.error("❌ Input missing. For 'record', check APP_URL in .env. For 'jira', check JIRA variables in .env.");
    return;
  }
  
  const designer = new AutoDesign(strategy);
  await designer.generate(input, featureName);
}

main().catch(err => {
  console.error("❌ An unexpected error occurred:", err);
});