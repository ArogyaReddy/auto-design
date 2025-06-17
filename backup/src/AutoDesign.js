// src/AutoDesign.js (Final Verified Version)
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

  // This helper function creates a valid PascalCase name (e.g., "my-feature" -> "MyFeature")
  _toPascalCase(str) {
    if (!str) return 'DefaultFeature';
    return str
      .replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '')
      .replace(/^\w/, c => c.toUpperCase());
  }

  async generate(input, featureName) {
    const plan = await this.strategy.createTestPlan(input, featureName);
    if (!plan) {
      console.warn(`⚠️  Strategy did not produce a valid plan. Skipping generation.`);
      return;
    }
    const spinner = ora('[Auto Gen] is creating files... \nPlease stand by...\n').start();
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
    // FIX: Sanitize the name ONCE here and use it for all generated assets.
    const safeFeatureName = this._toPascalCase(plan.featureName);
    const pageClassName = `${safeFeatureName}Page`;
    const pageInstanceName = `${safeFeatureName.charAt(0).toLowerCase() + safeFeatureName.slice(1)}Page`;

    return {
      feature: this.templates.feature({ ...plan, featureName: safeFeatureName }),
      pageObject: this.templates.pageObject({ ...plan, pageClassName: pageClassName, featureName: safeFeatureName }),
      steps: this.templates.steps({ ...plan, pageClassName: pageClassName, pageInstanceName: pageInstanceName, featureName: safeFeatureName }),
      test: this.templates.test({ ...plan, featureName: safeFeatureName, scenarioName: plan.scenarioName }),
    };
  }

  _writeFiles(output, plan) {
    // FIX: Use the same sanitization logic for the directory and file names.
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
      if (!err) console.log(`\n🚀 Automatically opening output folder: ${folderPath}`);
    });
  }
}

module.exports = { AutoDesign };