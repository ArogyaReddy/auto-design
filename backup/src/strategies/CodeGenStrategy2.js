const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

class CodeGenStrategy {
  _sanitize(str = '') {
    if (!str) return 'element';
    const sanitized = str.toString().replace(/[^a-zA-Z0-9]/g, ' ').trim().split(/\s+/)
      .map((w, i) => i ? w[0].toUpperCase() + w.slice(1) : w.toLowerCase()).join('');
    return /^\d/.test(sanitized) ? `element${sanitized}` : sanitized;
  }

  async createTestPlan(url, featureName) {
    const tempFile = path.join(os.tmpdir(), `autodesign-flow-${Date.now()}.js`);
    console.log(`\n🚀 Launching Playwright's Official CodeGen Recorder for: ${url}`);
    spawnSync(`npx playwright codegen --output="${tempFile}" "${url}"`, { shell: true, stdio: 'inherit' });
    if (!fs.existsSync(tempFile)) return null;
    console.log('\n✅ Recording finished. Analyzing captured steps...');
    const generatedCode = fs.readFileSync(tempFile, 'utf8');
    fs.removeSync(tempFile);
    return this._parseCodeGenScript(generatedCode, featureName);
  }

  _parseCodeGenScript(code, featureName) {
    const lines = code.split(/\r?\n/).map(l => l.trim());
    const plan = {
      featureName: featureName,
      scenarioName: `A recorded scenario for ${featureName}`,
      locators: [],
      steps: []
    };
    const addedLocators = new Map();
    let lastKeyword = 'Given';
    plan.steps.push({ keyword: 'Given', text: `I am on the application` });
    addedLocators.add(plan.steps[0].text);

    for (const line of lines) {
      const clickMatch = line.match(/^await (.+?)\.click\(\);/);
      const fillMatch = line.match(/^await (.+?)\.fill\((.+)\);/);
      let action = {}, rawLocator, actionValue, friendlyName;
      if (clickMatch) {
        action.actionType = 'click';
        rawLocator = clickMatch[1];
      } else if (fillMatch) {
        action.actionType = 'fill';
        rawLocator = fillMatch[1];
        actionValue = fillMatch[2];
      } else { continue; }
      
      const nameMatch = rawLocator.match(/getByLabel\('([^']+)'\)|getByPlaceholder\('([^']+)'\)|getByText\('([^']+)'\)|getByRole\([^,]+,\s*{[\s\S]*?name:\s*'([^']+)'/);
      friendlyName = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4]) : this._sanitize(rawLocator.split('.').pop());
      action.locatorName = this._sanitize(friendlyName);
      if (!addedLocators.has(rawLocator)) {
        addedLocators.set(rawLocator, action.locatorName);
        plan.locators.push({ name: action.locatorName, selector: rawLocator, friendlyName: friendlyName });
      }
      action.keyword = (lastKeyword === 'When' || lastKeyword === 'And') ? 'And' : 'When';
      lastKeyword = action.keyword;
      if (action.actionType === 'click') {
        const elementType = (rawLocator.includes("getByRole('button")) ? 'button' : (rawLocator.includes("getByRole('link")) ? 'link' : 'element';
        action.text = `I click the '${friendlyName}' ${elementType}`;
      } else if (action.actionType === 'fill') {
        action.text = `I fill the '${friendlyName}' field with ${actionValue}`;
        action.actionValue = actionValue.replace(/['"]/g, '');
      }
      if (action.text && !addedLocators.has(action.text)) {
        addedLocators.add(action.text);
        plan.steps.push(action);
      }
    }
    return plan;
  }
}
module.exports = { CodeGenStrategy };