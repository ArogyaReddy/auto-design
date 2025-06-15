const playwright = require('playwright');

class RecordingStrategy {
  constructor() {
    this.plan = this._createEmptyPlan();
    this.recordedLocators = new Map();
    this.generatedStepTexts = new Set();
  }

  _createEmptyPlan() {
    return {
      featureName: "RecordedFeature",
      scenarioName: "A scenario recorded from user actions",
      locators: [],
      steps: [],
    };
  }

  async record(startUrl) {
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
      const getElementText = (el) => {
        const text = el.innerText?.trim() || el.value?.trim() || el.name || '';
        return text.split('\n')[0].trim().slice(0, 50);
      };
      const listener = (event) => {
        const el = event.target;
        if (event.type === 'click' && el.tagName) {
            window.onUserAction({
              type: 'click',
              selector: getBestSelector(el),
              text: getElementText(el),
              tag: el.tagName.toLowerCase(),
              inputType: el.tagName === 'INPUT' ? el.type : null,
            });
        } else if (event.type === 'change' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
            window.onUserAction({
              type: 'fill',
              selector: getBestSelector(el),
              text: el.closest('label')?.innerText.trim() || el.name,
              value: el.value,
            });
        }
      };
      document.addEventListener('click', listener, { capture: true, passive: true });
      document.addEventListener('change', listener, { capture: true, passive: true });
    });
    
    await page.goto(startUrl);
    this.plan.steps.push({ keyword: "Given", text: "I am on the application" });
    const pageTitle = await page.title();
    if (pageTitle) {
      this.plan.featureName = pageTitle.replace(/[^a-zA-Z0-9]/g, '') || "RecordedFeature";
      this.plan.scenarioName = `A recorded scenario on the '${pageTitle}' page`;
    }
    console.log(`  -> Test suite will be named: ${this.plan.featureName}`);
    console.log("  -> Recording has started. Interact with the browser now. Close the browser to finish.");
    await page.waitForEvent('close');
    await browser.close();
    console.log(`\n✅ Finalizing plan with ${this.plan.steps.length} steps and ${this.plan.locators.length} locators.`);
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
        const elementType = action.tag === 'a' ? 'link' : (action.tag === 'button' || action.inputType === 'submit') ? 'button' : 'element';
        step = { keyword: 'When', text: `I click on the '${action.text}' ${elementType}`, actionType: 'click', locatorName: locatorName };
    } else if (action.type === 'fill') {
        step = { keyword: 'When', text: `I fill the '${action.text}' field with '${action.value}'`, actionType: 'fill', locatorName: locatorName, actionValue: action.value };
    }
    if (step.text && !this.generatedStepTexts.has(step.text)) {
        this.generatedStepTexts.add(step.text);
        this.plan.steps.push(step);
        console.log(`  -> Recording Step: ${step.text}`);
    }
  }

  async createTestPlan(startUrl) {
    this.plan = this._createEmptyPlan();
    this.recordedLocators.clear();
    this.generatedStepTexts.clear();
    return this.record(startUrl);
  }
}

module.exports = { RecordingStrategy };