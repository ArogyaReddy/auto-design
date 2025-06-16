// src/AutoDesign.js (Final Version with Forced Delay for Debugging)
const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');
const { exec } = require('child_process');
const ora = require('ora');

class AutoDesign {
  constructor(strategy) {
    if (!strategy) throw new Error('A strategy must be provided.');
    this.strategy = strategy;
    this.templates = this._loadTemplates();
    Handlebars.registerHelper('eq', (v1, v2) => v1 === v2);
    Handlebars.registerHelper('ne', (v1, v2) => v1 !== v2);
  }

  _loadTemplates() {
    const templateDir = path.join(__dirname, 'templates');
    return {
      feature: Handlebars.compile(fs.readFileSync(path.join(templateDir, 'feature.hbs'), 'utf8')),
      pageObject: Handlebars.compile(fs.readFileSync(path.join(templateDir, 'pageObject.hbs'), 'utf8')),
      steps: Handlebars.compile(fs.readFileSync(path.join(templateDir, 'steps.hbs'), 'utf8')),
      test: Handlebars.compile(fs.readFileSync(path.join(templateDir, 'test.hbs'), 'utf8'))
    };
  }

  async generate(input, featureNameFromCli) {
    console.log(`[AutoDesign] Using strategy: ${this.strategy.constructor.name}`);
    console.log(`[AutoDesign] Analyzing input from "${featureNameFromCli}"...`);
    
    const plan = await this.strategy.createTestPlan(input);
    if (!plan || !plan.featureName) {
      console.warn(`⚠️  Strategy did not produce a valid plan for "${sourceName}". Skipping generation.`);
      return;
    }
    
    plan.featureName = featureNameFromCli || plan.featureName;
    
    const spinner = ora('Auto-Gen is creating files for you. Please stand by...').start();
    
    // FOR DEBUGGING: We add a 2-second delay to ensure the spinner is visible.
    // You can safely remove this line later if you wish.
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const output = this._generateCode(plan);
      this._writeFiles(output, plan);
      
      const safeFeatureName = plan.featureName.replace(/[^a-zA-Z0-9]/g, '');
      spinner.succeed(`Success! Auto-Design created files in output/${safeFeatureName}`);

    } catch (error) {
      spinner.fail('File generation failed.');
      console.error(error);
    }
  }

  _generateCode(plan) {
    const featureName = plan.featureName.replace(/[^a-zA-Z0-9]/g, '');
    const pageClassName = `${featureName.charAt(0).toUpperCase() + featureName.slice(1)}Page`;
    const pageInstanceName = `${featureName.charAt(0).toLowerCase() + featureName.slice(1)}Page`;

    return {
      feature: this.templates.feature(plan),
      pageObject: this.templates.pageObject({ ...plan, pageClassName }),
      steps: this.templates.steps({ ...plan, pageClassName, pageInstanceName }),
      test: this.templates.test(plan),
    };
  }

  _writeFiles(output, plan) {
    const safeFeatureName = plan.featureName.replace(/[^a-zA-Z0-9]/g, '');
    const baseOutputDir = path.join(process.cwd(), 'output', safeFeatureName);
    fs.removeSync(baseOutputDir);

    const featuresDir = path.join(baseOutputDir, 'Features');
    const stepsDir = path.join(baseOutputDir, 'Steps');
    const pagesDir = path.join(baseOutputDir, 'Pages');
    const testsDir = path.join(baseOutputDir, 'Tests');

    [featuresDir, stepsDir, pagesDir, testsDir].forEach(dir => fs.mkdirSync(dir, { recursive: true }));

    fs.writeFileSync(path.join(featuresDir, `${safeFeatureName}.feature`), output.feature);
    fs.writeFileSync(path.join(pagesDir, `${safeFeatureName}.page.js`), output.pageObject);
    fs.writeFileSync(path.join(stepsDir, `${safeFeatureName}.steps.js`), output.steps);
    fs.writeFileSync(path.join(testsDir, `${safeFeatureName}.test.js`), output.test);

    // this._openFolder(baseOutputDir);
  }
 
  _openFolder(folderPath) {
    const command = process.platform === 'darwin' ? `open "${folderPath}"` : process.platform === 'win32' ? `explorer "${folderPath}"` : `xdg-open "${folderPath}"`;
    exec(command, (err) => {
      if (err) console.error(`Failed to open folder: ${err}`);
      else console.log(`\n🚀 Automatically opening output folder: ${folderPath}`);
    });
  }
}

module.exports = { AutoDesign };