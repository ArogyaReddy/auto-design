// src/strategies/OfficialCodeGenStrategy.js (Final De-duplication Fix)
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
    console.log(`\n🚀 [AutoGen] Launching Playwright's CodeGen Recorder for App/URL : \n ${url}`);
    console.log(`\n🚀 [AutoGen] Please perform your actions in the new browser window.`);
    console.log(`\n🚀 [AutoGen] Close the browser when you are finished recording.`);

    spawnSync(`npx playwright codegen --output="${tempFile}" "${url}"`, { shell: true, stdio: 'inherit' });

    if (!fs.existsSync(tempFile)) {
      console.error('❌ Recording cancelled or failed. No output script was generated.');
      return null;
    }

    console.log('\n✅ [AutoRecorder] Recording finished. \n✅ [AutoDesign] Analyzing captured steps...');
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
    // THIS IS THE KEY: We use a Set to track the unique step text we've already added.
    const addedStepTexts = new Set();
    let lastKeyword = 'Given';

    plan.steps.push({ keyword: 'Given', text: `I am on the application` });
    addedStepTexts.add(plan.steps[0].text);

    for (const line of lines) {
      const clickMatch = line.match(/^await (.+?)\.click\(\);/);
      const fillMatch = line.match(/^await (.+?)\.fill\((.+)\);/);
      const pressMatch = line.match(/^await (.+?)\.press\((.+)\);/);

      let action = {}, rawLocator, actionValue, friendlyName;

      if (clickMatch) {
        action.actionType = 'click';
        rawLocator = clickMatch[1];
      } else if (fillMatch) {
        action.actionType = 'fill';
        rawLocator = fillMatch[1];
        actionValue = fillMatch[2];
      } else if (pressMatch) {
        action.actionType = 'press';
        rawLocator = pressMatch[1];
        actionValue = pressMatch[2];
      } else {
        continue;
      }
      
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
        const elementType = (rawLocator.includes("getByRole('button") || rawLocator.includes("[type='submit']")) ? 'button' : (rawLocator.includes("getByRole('link") || rawLocator.includes("locator('a")) ? 'link' : 'element';
        action.text = `I click the '${friendlyName}' ${elementType}`;
      } else if (action.actionType === 'fill') {
        action.text = `I fill the '${friendlyName}' field with ${actionValue}`;
        action.actionValue = actionValue.replace(/['"]/g, '');
      } else if (action.actionType === 'press') {
        action.text = `I press the ${actionValue} key on the '${friendlyName}' field`;
        action.actionValue = actionValue.replace(/['"]/g, '');
      }
      
      // THIS IS THE CRITICAL FIX: Only add the step to our plan if its text is unique.
      if (action.text && !addedStepTexts.has(action.text)) {
        addedStepTexts.add(action.text);
        plan.steps.push(action);
      }
    }
    return plan;
  }
}
module.exports = { CodeGenStrategy };