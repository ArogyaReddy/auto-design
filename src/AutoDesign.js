const fs = require('fs-extra');
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

  async generate(input, featureName) {
    const plan = await this.strategy.createTestPlan(input, featureName);
    if (!plan) return;
    console.log('\n✅ [AutoDesign] Generating features, steps, pages, and tests from analysis...');
    const output = this._generateCode(plan);
    this._writeFiles(output, plan);
  }

  _generateCode(plan) {
    const pageClassName = `${plan.featureName}Page`;
    const pageInstanceName = `${plan.featureName.charAt(0).toLowerCase() + plan.featureName.slice(1)}Page`;
    console.log('\n✅ [AutoCoder] Created the code and test files...');
    return {
      feature: this.templates.feature(plan),
      pageObject: this.templates.pageObject({ ...plan, pageClassName }),
      steps: this.templates.steps({ ...plan, pageClassName, pageInstanceName }),
      test: this.templates.test(plan),
    };
  }

  _writeFiles(output, plan) {
    const baseOutputDir = path.join(process.cwd(), 'output', plan.featureName);
    fs.removeSync(baseOutputDir);
    const dirs = {
      Features: path.join(baseOutputDir, 'Features'),
      Steps: path.join(baseOutputDir, 'Steps'),
      Pages: path.join(baseOutputDir, 'Pages'),
      Tests: path.join(baseOutputDir, 'Tests'),
    };
    Object.values(dirs).forEach(dir => fs.mkdirSync(dir, { recursive: true }));
    fs.writeFileSync(path.join(dirs.Features, `${plan.featureName}.feature`), output.feature);
    fs.writeFileSync(path.join(dirs.Pages, `${plan.featureName}.page.js`), output.pageObject);
    fs.writeFileSync(path.join(dirs.Steps, `${plan.featureName}.steps.js`), output.steps);
    fs.writeFileSync(path.join(dirs.Tests, `${plan.featureName}.test.js`), output.test);
    // this._openFolder(baseOutputDir);
  }
 
  _openFolder(folderPath) {
    const command = process.platform === 'darwin' ? `open "${folderPath}"` : process.platform === 'win32' ? `explorer "${folderPath}"` : `xdg-open "${folderPath}"`;
    exec(command, (err) => {
      if (!err) console.log(`\n🚀 Automatically opening output folder: ${folderPath}`);
    });
  }
}
module.exports = { AutoDesign };