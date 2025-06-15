const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const { exec } = require('child_process');

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

  async generate(input, sourceName) {
    const plan = await this.strategy.createTestPlan(input);
    if (!plan || !plan.featureName) return;
    const output = this._generateCode(plan);
    this._writeFiles(output, plan);
    const safeFeatureName = plan.featureName.replace(/[^a-zA-Z0-9]/g, '');
    console.log(`✅ Success! Test files generated in output/${safeFeatureName}`);
  }

  _generateCode(plan) {
    const featureName = plan.featureName.replace(/[^a-zA-Z0-9]/g, '');
    const pageClassName = `${featureName.charAt(0).toUpperCase() + featureName.slice(1)}Page`;
    return {
      feature: this.templates.feature(plan),
      pageObject: this.templates.pageObject({ ...plan, pageClassName }),
      steps: this.templates.steps({ ...plan, pageClassName }),
      test: this.templates.test(plan),
    };
  }

  _writeFiles(output, plan) {
    const safeFeatureName = plan.featureName.replace(/[^a-zA-Z0-9]/g, '');
    const baseOutputDir = path.join(process.cwd(), 'output', safeFeatureName);
    const featuresDir = path.join(baseOutputDir, 'Features');
    const stepsDir = path.join(baseOutputDir, 'Steps');
    const pagesDir = path.join(baseOutputDir, 'Pages');
    const testsDir = path.join(baseOutputDir, 'Tests');
    [featuresDir, stepsDir, pagesDir, testsDir].forEach(dir => fs.mkdirSync(dir, { recursive: true }));
    fs.writeFileSync(path.join(featuresDir, `${safeFeatureName}.feature`), output.feature);
    fs.writeFileSync(path.join(pagesDir, `${safeFeatureName}.page.js`), output.pageObject);
    fs.writeFileSync(path.join(stepsDir, `${safeFeatureName}.steps.js`), output.steps);
    fs.writeFileSync(path.join(testsDir, `${safeFeatureName}.test.js`), output.test);
    this._openFolder(baseOutputDir);
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