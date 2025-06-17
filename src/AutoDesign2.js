const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');
const { exec } = require('child_process');
const ora = require('ora');

class AutoDesign {
  constructor(strategy) {
    if (!strategy) {
      throw new Error('A strategy must be provided.');
    }
    this.strategy = strategy;
    this.templates = this._loadTemplates();

    // Register all necessary helpers for the templates to work correctly.
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

  // Helper to convert any string to a valid PascalCase name for classes.
  _toPascalCase(str) {
    if (!str) return 'DefaultFeature';
    return str
      .replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '')
      .replace(/^\w/, c => c.toUpperCase());
  }

  async generate(input, featureName) {
    console.log(`[AutoDesign] Using strategy: ${this.strategy.constructor.name}`);
    
    const plan = await this.strategy.createTestPlan(input, featureName);

    // Robust validation of the plan received from the strategy
    if (!plan || !plan.featureName || !plan.steps || !plan.locators) {
      console.error("\n❌ Generation Failed: The strategy returned an incomplete or invalid test plan.");
      console.error("   This can happen if the input (text or image) is ambiguous or the recorder failed.");
      console.error("   Received Plan:", JSON.stringify(plan, null, 2));
      return;
    }
    
    const spinner = ora('Auto-Gen is creating files... Please stand by.').start();

    try {
      const output = this._generateCode(plan);
      this._writeFiles(output, plan);
      spinner.succeed(`Success! Test files generated in output/${this._toPascalCase(plan.featureName)}`);
    } catch (error) {
      spinner.fail('File generation failed.');
      console.error(error);
    }
  }

  _generateCode(plan) {
    const safeFeatureName = this._toPascalCase(plan.featureName);
    const pageClassName = `${safeFeatureName}Page`;
    const pageInstanceName = `${safeFeatureName.charAt(0).toLowerCase() + safeFeatureName.slice(1)}Page`;

    return {
      feature: this.templates.feature({ ...plan, featureName: safeFeatureName }),
      pageObject: this.templates.pageObject({ ...plan, pageClassName: pageClassName, featureName: safeFeatureName }),
      steps: this.templates.steps({ ...plan, pageClassName: pageClassName, pageInstanceName: pageInstanceName, featureName: safeFeatureName }),
      test: this.templates.test({ ...plan, featureName: safeFeatureName }),
    };
  }

  _writeFiles(output, plan) {
    const safeFeatureName = this._toPascalCase(plan.featureName);
    const baseOutputDir = path.join(process.cwd(), 'output', safeFeatureName);

    fs.removeSync(baseOutputDir);

    const dirs = {
      Features: path.join(baseOutputDir, 'Features'),
      Steps: path.join(baseOutputDir, 'Steps'),
      Pages: path.join(baseOutputDir, 'Pages'),
      Tests: path.join(baseOutputDir, 'Tests'),
    };

    Object.values(dirs).forEach(dir => fs.mkdirSync(dir, { recursive: true }));

    fs.writeFileSync(path.join(dirs.Features, `${safeFeatureName}.feature`), output.feature);
    fs.writeFileSync(path.join(dirs.Pages, `${safeFeatureName}.page.js`), output.pageObject);
    fs.writeFileSync(path.join(dirs.Steps, `${safeFeatureName}.steps.js`), output.steps);
    fs.writeFileSync(path.join(dirs.Tests, `${safeFeatureName}.test.js`), output.test);

    this._openFolder(baseOutputDir);
  }
 
  _openFolder(folderPath) {
    const command = process.platform === 'darwin' ? `open "${folderPath}"` : process.platform === 'win32' ? `explorer "${folderPath}"` : `xdg-open "${folderPath}"`;
    exec(command, (err) => {
      if (err) {
        console.error(`Failed to open folder: ${err}`);
      } else {
        console.log(`\n🚀 Automatically opening output folder: ${folderPath}`);
      }
    });
  }
}

module.exports = { AutoDesign };