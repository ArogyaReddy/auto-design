// run.js (Upgraded to a Professional CLI)
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { AutoDesign } = require('../src/AutoDesign.js');
const { CodeGenStrategy } = require('../src/strategies/CodeGenStrategy.js');
const { JiraStrategy } = require('../src/strategies/JiraStrategy.js');

require('dotenv').config();

async function main() {
  const parser = yargs(hideBin(process.argv))
    .command('record', 'Record a new test using Playwright CodeGen', y => y
      .option('url',  { describe: 'The starting URL for the recording session', type: 'string', default: process.env.APP_URL })
      .option('name', { describe: 'The name for the generated feature (e.g., "LoginFlow")', type: 'string', demandOption: true })
    )
    .command('jira', 'Generate a test from a JIRA story', y => y
      .option('url',   { describe: 'Your JIRA instance URL (e.g., "https://my-company.atlassian.net")', type: 'string', demandOption: true })
      .option('key',   { describe: 'The JIRA issue key (e.g., "PROJ-123")', type: 'string', demandOption: true })
      .option('user',  { describe: 'Your JIRA email address', type: 'string', demandOption: true })
      .option('token', { describe: 'Your JIRA API token', type: 'string', demandOption: true })
    )
    .demandCommand(1, 'You must choose a command: record or jira')
    .help();

  const argv = parser.argv;
  const mode = argv._[0];

  let strategy, input, featureName;

  if (mode === 'record') {
    strategy = new CodeGenStrategy();
    input = argv.url;
    featureName = argv.name;
  } else if (mode === 'jira') {
    strategy = new JiraStrategy();
    input = { url: argv.url, key: argv.key, auth: { user: argv.user, token: argv.token } };
    featureName = argv.key;
  }

  const designer = new AutoDesign(strategy);
  await designer.generate(input, featureName);
}

main().catch(err => {
  console.error("❌ An unexpected error occurred:", err);
  process.exit(1);
});