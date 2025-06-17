// run-recorder.js (Upgraded with Command-Line Arguments)
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { AutoDesign } = require('./src/AutoDesign.js');
const { CodeGenStrategy } = require('./src/strategies/CodeGenStrategy.js');

async function main() {
  // Use yargs to define and parse command-line arguments
  const argv = yargs(hideBin(process.argv))
    .option('url', {
      alias: 'u',
      describe: 'The starting URL for the recording session',
      type: 'string',
      demandOption: true // This makes the --url option mandatory
    })
    .option('name', {
      alias: 'n',
      describe: 'A PascalCase name for the generated feature (e.g., "LoginFlow")',
      type: 'string',
      demandOption: true // This makes the --name option mandatory
    })
    .help()
    .argv;

  // The hardcoded constants are now gone. We use the values from the command line.
  const START_URL = argv.url;
  const FEATURE_NAME = argv.name;

  console.log(`🚀 [AutoGen] Starting Test Generation for feature: ${FEATURE_NAME}`);
  
  const strategy = new CodeGenStrategy();
  const designer = new AutoDesign(strategy);

  // Pass the arguments from the command line to the generator
  await designer.generate(START_URL, FEATURE_NAME);
}

main().catch(err => {
  console.error("❌ An unexpected error occurred:", err);
  process.exit(1);
});