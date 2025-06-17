const playwright = require('playwright');

class RecordingStrategy {
  constructor() {
    this.plan = this._createEmptyPlan();
    this.recordedLocators = new Map();
    this.generatedStepTexts = new Set();
    this.lastKeyword = 'Given';
  }

  _createEmptyPlan() {
    return { 
      featureName: "RecordedFeature", 
      scenarioName: "A recorded scenario", 
      userStory: {
        actor: 'user',
        action: 'interact with the application',
        benefit: 'accomplish my goals'
      },
      tags: ['smoke'],
      backgroundSteps: [],
      locators: [], 
      steps: [],
      verificationSteps: [],
      additionalScenarios: []
    };
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
    
    // Enhanced background and user story setup
    this.plan.backgroundSteps.push({ keyword: "Given", text: "I am on the application" });
    
    const pageTitle = await page.title();
    this.plan.featureName = featureName || (pageTitle.replace(/[^a-zA-Z0-9]/g, '') || "RecordedFeature");
    
    // Analyze the context to create better user story and scenario name
    const pageContext = this._analyzePageContext(pageTitle, startUrl);
    this.plan.scenarioName = pageContext.scenarioName;
    this.plan.userStory = pageContext.userStory;
    this.plan.tags = pageContext.tags;
    this.plan.verificationSteps = pageContext.verificationSteps;
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
      
      // Create more natural language for the step
      let stepText = '';
      if (elementType === 'button') {
        stepText = `I click the "${action.text}" button`;
      } else if (elementType === 'link') {
        stepText = `I click on the "${action.text}" link`;
      } else {
        stepText = `I click on the "${action.text}" element`;
      }
      
      step = { keyword, text: stepText, actionType: 'click', locatorName: locatorName };
      this.lastKeyword = keyword;
    } else if (action.type === 'fill') {
      const keyword = (this.lastKeyword === 'When' || this.lastKeyword === 'And') ? 'And' : 'When';
      step = { keyword, text: `I enter "${action.value}" in the "${action.text}" field`, actionType: 'fill', locatorName: locatorName, actionValue: action.value };
      this.lastKeyword = keyword;
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

  /**
   * Analyze page context to create better user stories and scenarios
   */
  _analyzePageContext(pageTitle, url) {
    let flowType = 'general';
    let userStory = {
      actor: 'user',
      action: 'interact with the application',
      benefit: 'accomplish my goals'
    };
    let tags = ['smoke'];
    let scenarioName = `User interacts with ${pageTitle || 'the application'}`;
    
    // Analyze URL and title for common patterns
    const lowerTitle = (pageTitle || '').toLowerCase();
    const lowerUrl = url.toLowerCase();
    
    // Login/Authentication flows
    if (lowerTitle.includes('login') || lowerTitle.includes('sign in') || lowerUrl.includes('login') || lowerUrl.includes('auth')) {
      flowType = 'authentication';
      userStory = {
        actor: 'registered user',
        action: 'log into my account',
        benefit: 'I can access my personal dashboard and account features'
      };
      tags = ['authentication', 'critical'];
      scenarioName = 'User successfully logs into their account';
    }
    // Registration/Signup flows  
    else if (lowerTitle.includes('register') || lowerTitle.includes('sign up') || lowerTitle.includes('signup') || lowerUrl.includes('register')) {
      flowType = 'registration';
      userStory = {
        actor: 'new user',
        action: 'create an account',
        benefit: 'I can access the platform\'s features and services'
      };
      tags = ['registration', 'critical'];
      scenarioName = 'New user successfully creates an account';
    }
    // Dashboard/Admin flows
    else if (lowerTitle.includes('dashboard') || lowerTitle.includes('admin') || lowerUrl.includes('dashboard') || lowerUrl.includes('admin')) {
      flowType = 'dashboard';
      userStory = {
        actor: 'authenticated user',
        action: 'navigate and manage my dashboard',
        benefit: 'I can monitor and control my account activities'
      };
      tags = ['dashboard', 'navigation'];
      scenarioName = 'User navigates through the dashboard interface';
    }
    // E-commerce/Shopping flows
    else if (lowerTitle.includes('shop') || lowerTitle.includes('cart') || lowerTitle.includes('checkout') || lowerUrl.includes('shop') || lowerUrl.includes('cart')) {
      flowType = 'ecommerce';
      userStory = {
        actor: 'customer',
        action: 'browse and purchase products',
        benefit: 'I can find and buy the items I need'
      };
      tags = ['ecommerce', 'purchase'];
      scenarioName = 'Customer completes a purchase transaction';
    }
    // Profile/Settings flows
    else if (lowerTitle.includes('profile') || lowerTitle.includes('settings') || lowerUrl.includes('profile') || lowerUrl.includes('settings')) {
      flowType = 'profile';
      userStory = {
        actor: 'user',
        action: 'manage my profile and preferences',
        benefit: 'I can customize my experience and keep my information current'
      };
      tags = ['profile', 'settings'];
      scenarioName = 'User updates their profile information';
    }
    
    // Generate verification steps based on flow type
    const verificationSteps = this._generateVerificationSteps(flowType);
    
    // Generate additional scenarios based on flow type
    const additionalScenarios = this._generateAdditionalScenarios(flowType);
    
    return {
      flowType,
      scenarioName,
      userStory,
      tags,
      verificationSteps,
      additionalScenarios
    };
  }

  /**
   * Generate verification steps based on flow type
   */
  _generateVerificationSteps(flowType) {
    const verificationSteps = [];
    
    switch (flowType) {
      case 'authentication':
        verificationSteps.push(
          { keyword: 'Then', text: 'I should be successfully logged in' },
          { keyword: 'And', text: 'I should see the main dashboard or homepage' }
        );
        break;
      case 'registration':
        verificationSteps.push(
          { keyword: 'Then', text: 'my account should be created successfully' },
          { keyword: 'And', text: 'I should receive a confirmation message' }
        );
        break;
      case 'ecommerce':
        verificationSteps.push(
          { keyword: 'Then', text: 'the transaction should be completed successfully' },
          { keyword: 'And', text: 'I should receive an order confirmation' }
        );
        break;
      case 'profile':
        verificationSteps.push(
          { keyword: 'Then', text: 'my changes should be saved successfully' },
          { keyword: 'And', text: 'I should see a confirmation message' }
        );
        break;
      default:
        verificationSteps.push(
          { keyword: 'Then', text: 'the action should be completed successfully' },
          { keyword: 'And', text: 'the system should respond appropriately' }
        );
    }
    
    return verificationSteps;
  }

  /**
   * Generate additional scenarios based on flow type
   */
  _generateAdditionalScenarios(flowType) {
    const scenarios = [];
    
    switch (flowType) {
      case 'authentication':
        scenarios.push({
          name: 'User attempts login with invalid credentials',
          tags: 'negative',
          steps: [
            { keyword: 'Given', text: 'I am on the login page' },
            { keyword: 'When', text: 'I enter invalid credentials' },
            { keyword: 'And', text: 'I click the login button' },
            { keyword: 'Then', text: 'I should see an error message' },
            { keyword: 'And', text: 'I should remain on the login page' }
          ]
        });
        break;
      case 'registration':
        scenarios.push({
          name: 'User attempts registration with existing email',
          tags: 'negative',
          steps: [
            { keyword: 'Given', text: 'I am on the registration page' },
            { keyword: 'When', text: 'I enter an email that already exists' },
            { keyword: 'And', text: 'I fill in other required fields' },
            { keyword: 'And', text: 'I submit the registration form' },
            { keyword: 'Then', text: 'I should see an error message about existing email' }
          ]
        });
        break;
      case 'ecommerce':
        scenarios.push({
          name: 'User views product details before purchasing',
          tags: 'product-details',
          steps: [
            { keyword: 'Given', text: 'I am browsing products' },
            { keyword: 'When', text: 'I click on a product' },
            { keyword: 'Then', text: 'I should see detailed product information' },
            { keyword: 'And', text: 'I should see pricing and availability' }
          ]
        });
        break;
    }
    
    return scenarios;
  }
}
module.exports = { RecordingStrategy };