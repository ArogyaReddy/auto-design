const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { AutoDesign } = require('./src/AutoDesign.js');
const { CodeGenStrategy } = require('./src/strategies/CodeGenStrategy.js');
const { JiraStrategy } = require('./src/strategies/JiraStrategy.js');
const { ImageScanStrategy } = require('./src/strategies/ImageScanStrategy.js');
const { AIFreeTextAnalysisStrategy } = require('./src/strategies/AIFreeTextAnalysisStrategy.js');
const { getConfig } = require('./src/core/Config.js');
const { getStrategyRegistry } = require('./src/core/StrategyRegistry.js');

require('dotenv').config();

async function initializeFramework() {
  const config = getConfig();
  const strategyRegistry = getStrategyRegistry();

  // Register available strategies (AI-free implementations)
  strategyRegistry.register('CodeGenStrategy', CodeGenStrategy, true);
  strategyRegistry.register('JiraStrategy', JiraStrategy);
  strategyRegistry.register('ImageScanStrategy', ImageScanStrategy);
  strategyRegistry.register('AIFreeTextAnalysisStrategy', AIFreeTextAnalysisStrategy);

  return new AutoDesign();
}

async function main() {
  try {
    const designer = await initializeFramework();
    const config = getConfig();

    const parser = yargs(hideBin(process.argv))
      .command('record [name]', 'Record a new test using Playwright CodeGen', y => y
        .positional('name', { 
          describe: 'The name for the generated feature', 
          type: 'string', 
          demandOption: true 
        })
        .option('url', {
          describe: 'URL to record (overrides config)',
          type: 'string'
        })
        .option('timeout', {
          describe: 'Recording timeout in milliseconds',
          type: 'number',
          default: 300000
        })
      )
      .command('jira [key]', 'Generate a test from a JIRA story', y => y
        .positional('key', { 
          describe: 'The JIRA issue key (e.g., "JRA-9")', 
          type: 'string', 
          demandOption: true 
        })
        .option('url', {
          describe: 'JIRA URL (overrides config)',
          type: 'string'
        })
      )
      .command('image [path] [name]', 'Generate a test from a screenshot/image', y => y
        .positional('path', {
          describe: 'Path to the image file',
          type: 'string',
          demandOption: true
        })
        .positional('name', {
          describe: 'Name for the generated feature',
          type: 'string'
        })
        .option('ocr', {
          describe: 'Enable OCR text recognition (downloads language data)',
          type: 'boolean',
          default: true
        })
        .option('no-ocr', {
          describe: 'Disable OCR text recognition',
          type: 'boolean'
        })
        .option('fallback', {
          describe: 'Enable element detection fallback',
          type: 'boolean',
          default: true
        })
      )
      .command('text [input] [name]', 'Generate a test from text input', y => y
        .positional('input', {
          describe: 'Text input for test generation',
          type: 'string',
          demandOption: true
        })
        .positional('name', {
          describe: 'Name for the generated feature',
          type: 'string'
        })
      )
      .command('summary [file] [name]', 'Generate a test from a text summary file', y => y
        .positional('file', {
          describe: 'Path to the text summary file',
          type: 'string',
          demandOption: true
        })
        .positional('name', {
          describe: 'Name for the generated feature',
          type: 'string'
        })
      )
      .command('list-strategies', 'List available strategies')
      .option('strategy', {
        describe: 'Strategy to use for generation',
        type: 'string',
        choices: designer.getAvailableStrategies()
      })
      .option('output-dir', {
        describe: 'Custom output directory',
        type: 'string'
      })
      .demandCommand(1, 'You must choose a command: record, jira, image, text, summary, or list-strategies')
      .help();

    const argv = parser.argv;
    const command = argv._[0];

    if (command === 'list-strategies') {
      console.log('Available strategies:');
      designer.getAvailableStrategies().forEach(strategy => {
        console.log(`  - ${strategy}`);
      });
      return;
    }

    let input, featureName, strategyName;

    if (command === 'record') {
      input = argv.url || config.get('playwright.defaultUrl');
      featureName = `APP-${argv.name}`;
      strategyName = 'CodeGenStrategy';
      
      if (!input) {
        console.error("❌ No URL provided. Use --url or set playwright.defaultUrl in config.");
        process.exit(1);
      }
    } else if (command === 'jira') {
      const jiraUrl = argv.url || config.get('jira.url');
      const jiraUser = config.get('jira.user');
      const jiraToken = config.get('jira.token');
      
      if (!jiraUrl || !jiraUser || !jiraToken) {
        console.error("❌ JIRA configuration incomplete. Please check your config or environment variables.");
        console.error("Required: JIRA_URL, JIRA_USER, JIRA_API_TOKEN");
        process.exit(1);
      }
      
      input = {
        url: jiraUrl,
        key: argv.key,
        auth: { user: jiraUser, token: jiraToken }
      };
      featureName = `JIRA-${argv.key}`;
      strategyName = 'JiraStrategy';
    } else if (command === 'image') {
      input = argv.path;
      featureName = `IMG-${argv.name || 'ImageFlow'}`;
      strategyName = 'ImageScanStrategy';
      
      if (!input) {
        console.error("❌ No image path provided.");
        process.exit(1);
      }
      
      // Handle OCR settings
      const useOCR = argv.noOcr ? false : (argv.ocr !== undefined ? argv.ocr : config.get('image.useOCR', true));
      const useFallback = argv.fallback !== undefined ? argv.fallback : config.get('image.fallbackToElementDetection', true);
      
      if (!useOCR) {
        console.log("⚡ OCR disabled - using fallback element detection");
      }
      if (useOCR && useFallback) {
        console.log("🔍 OCR enabled with element detection fallback");
      }
      
      // Temporarily override config for this operation
      config.set('image.useOCR', useOCR);
      config.set('image.fallbackToElementDetection', useFallback);
    } else if (command === 'text') {
      input = argv.input;
      featureName = `TXT-${argv.name || 'TextFlow'}`;
      strategyName = 'AIFreeTextAnalysisStrategy';
      
      if (!input) {
        console.error("❌ No text input provided.");
        process.exit(1);
      }
    } else if (command === 'summary') {
      input = argv.file;
      featureName = `TXT-${argv.name || 'SummaryFlow'}`;
      strategyName = 'AIFreeTextAnalysisStrategy';
      
      if (!input) {
        console.error("❌ No summary file provided.");
        process.exit(1);
      }
    } else {
      console.error(`❌ Unknown command: ${command}`);
      process.exit(1);
    }

    const options = {
      strategy: argv.strategy || strategyName,
      outputDir: argv.outputDir,
      timeout: argv.timeout
    };

    const result = await designer.generate(input, featureName, options);
    
    if (result.success) {
      console.log(`\n✅ Generation completed successfully!`);
      console.log(`📁 Output directory: ${result.outputDirectory}`);
      console.log(`📄 Files created: ${result.filesCreated.length}`);
      
      if (result.validation.warnings.length > 0) {
        console.log(`⚠️  Warnings: ${result.validation.warnings.length}`);
      }
    } else {
      console.error(`❌ Generation failed: ${result.reason}`);
      process.exit(1);
    }

  } catch (error) {
    console.error("❌ An unexpected error occurred:", error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();