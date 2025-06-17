const playwright = require('playwright');

class RecordingStrategy {
  constructor() {
    this.plan = this._createEmptyPlan();
    this.recordedLocators = new Map();
    this.generatedStepTexts = new Set();
    this.lastKeyword = 'Given';
  }

  _createEmptyPlan() {
    return { featureName: "RecordedFeature", scenarioName: "A recorded scenario", locators: [], steps: [] };
  }

  async record(startUrl, featureName) {
    console.log("🚀 Starting Interactive Recording Session...");
    const browser = await playwright.chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.exposeFunction('onUserAction', this._processAction.bind(this));
    await page.addInitScript(() => {
      const getBestSelector = (el) => {
        if (el.getAttribute('data-testid')) return `[data-testid="${el.getAttribute('data-testid')}"]`;
        if (el.getAttribute('data-test')) return `[data-test="${el.getAttribute('data-test')}"]`;
        if (el.id && !/^\d+$/.test(el.id)) return `#${el.id}`;
        if (el.name) return `[name="${el.name}"]`;
        if ((el.tagName === 'A' || el.tagName === 'BUTTON' || el.type === 'submit') && el.innerText) {
          return `text=${el.innerText.trim().split('\n')[0]}`;
        }
        return `${el.tagName.toLowerCase()}`;
      };
      const getElementText = (el) => (el.innerText?.trim() || el.value?.trim() || el.name || el.getAttribute('aria-label') || '').split('\n')[0].trim().slice(0, 50);
      const listener = (event) => {
        const el = event.target;
        if (!el || !el.tagName) return;
        if (event.type === 'blur' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.value) {
          window.onUserAction({ type: 'fill', selector: getBestSelector(el), text: el.closest('label')?.innerText.trim() || el.name, value: el.value });
        } else if (event.type === 'click') {
          window.onUserAction({ type: 'click', selector: getBestSelector(el), text: getElementText(el), tag: el.tagName.toLowerCase(), inputType: el.tagName === 'INPUT' ? el.type : null, role: el.getAttribute('role') });
        }
      };
      document.addEventListener('blur', listener, { capture: true });
      document.addEventListener('click', listener, { capture: true });
    });
    
    await page.goto(startUrl);
    this.plan.steps.push({ keyword: "Given", text: "I am on the application" });
    const pageTitle = await page.title();
    this.plan.featureName = featureName || (pageTitle.replace(/[^a-zA-Z0-9]/g, '') || "RecordedFeature");
    this.plan.scenarioName = `A recorded scenario on the '${pageTitle}' page`;
    console.log(`  -> Test suite will be named: ${this.plan.featureName}`);
    console.log("  -> Recording has started. Interact with the browser now. Close the browser to finish.");
    await page.waitForEvent('close', { timeout: 0 });
    await browser.close();
    console.log(`\n✅ Finalizing plan with ${this.plan.steps.length} steps.`);
    return this.plan;
  }

  _processAction(action) {
    let baseName = (action.text || action.type).replace(/[^a-zA-Z0-9]/g, '');
    if (!baseName || /^\d/.test(baseName)) { baseName = `element${baseName}`; }
    let locatorName = baseName.charAt(0).toLowerCase() + baseName.slice(1);
    if (!this.recordedLocators.has(action.selector)) {
        this.recordedLocators.set(action.selector, locatorName);
        this.plan.locators.push({ name: locatorName, selector: action.selector });
    } else {
        locatorName = this.recordedLocators.get(action.selector);
    }
    let step = {};
    if (action.type === 'click') {
      const keyword = (this.lastKeyword === 'When' || this.lastKeyword === 'And') ? 'And' : 'When';
      const elementType = (action.role === 'button' || action.tag === 'button' || action.inputType === 'submit') ? 'button' : (action.role === 'link' || action.tag === 'a') ? 'link' : 'element';
      step = { keyword, text: `I click on the '${action.text}' ${elementType}`, actionType: 'click', locatorName: locatorName };
      this.lastKeyword = keyword;
    } else if (action.type === 'fill') {
      step = { keyword: 'When', text: `I fill the '${action.text}' field with '${action.value}'`, actionType: 'fill', locatorName: locatorName, actionValue: action.value };
      this.lastKeyword = 'When';
    }
    if (step.text && !this.generatedStepTexts.has(step.text)) {
        this.generatedStepTexts.add(step.text);
        this.plan.steps.push(step);
        console.log(`  -> Recording Step: ${step.keyword} ${step.text}`);
    }
  }

  async createTestPlan(startUrl, featureName) {
    this.plan = this._createEmptyPlan();
    this.recordedLocators.clear();
    this.generatedStepTexts.clear();
    this.lastKeyword = 'Given';
    return this.record(startUrl, featureName);
  }
}
module.exports = { RecordingStrategy };