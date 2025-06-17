const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { BaseStrategy } = require('../core/BaseStrategy');
const { ValidationError, StrategyError } = require('../core/ErrorHandler');

/**
 * CodeGen Strategy - Records user interactions using Playwright CodeGen
 */
class CodeGenStrategy extends BaseStrategy {

  /**
   * Get supported input types
   * @returns {string[]} Supported input types
   */
  getSupportedInputTypes() {
    return ['url', 'webpage'];
  }

  /**
   * Validate URL input
   * @param {string} input - URL to validate
   * @returns {ValidationResult} Validation result
   */
  validate(input) {
    const result = { success: true, errors: [], warnings: [] };

    if (!input || typeof input !== 'string') {
      result.success = false;
      result.errors.push('URL must be a non-empty string');
      return result;
    }

    try {
      new URL(input);
    } catch (error) {
      result.success = false;
      result.errors.push('Invalid URL format');
    }

    // Check for common issues
    if (input.includes('localhost') || input.includes('127.0.0.1')) {
      result.warnings.push('Local URLs may not be accessible during recording');
    }

    return result;
  }

  async createTestPlan(url, featureName, options = {}) {
    // Validate input
    const validation = this.validate(url);
    if (!validation.success) {
      throw new ValidationError(`CodeGen input validation failed: ${validation.errors.join(', ')}`);
    }

    // Test URL accessibility
    console.log(`\n🔍 Testing URL accessibility: ${url}`);
    try {
      const testUrl = new URL(url);
      console.log(`   Protocol: ${testUrl.protocol}`);
      console.log(`   Host: ${testUrl.host}`);
      console.log(`   Path: ${testUrl.pathname}`);
      console.log(`   Query: ${testUrl.search}`);
    } catch (error) {
      console.warn(`⚠️  URL parsing warning: ${error.message}`);
    }

    const tempFile = path.join(os.tmpdir(), `autodesign-flow-${Date.now()}.js`);
    console.log(`\n🚀 Launching Playwright's Official CodeGen Recorder for: ${url}`);
    console.log(`   Please perform your actions in the new browser window.`);
    console.log(`   => Close the browser when you are finished recording.`);
    console.log(`\n💡 Troubleshooting tips:`);
    console.log(`   • If browser doesn't open: Check Playwright installation`);
    console.log(`   • If site doesn't load: Check network connectivity, VPN, or authentication`);
    console.log(`   • If partial URL: Ensure quotes around URL in commands`);

    try {
      const command = `npx playwright codegen --output="${tempFile}" "${url}"`;
      
      const result = spawnSync(command, { 
        shell: true, 
        stdio: 'inherit',
        timeout: options.timeout || 300000 // 5 minutes default timeout
      });
      
      // Check for common error scenarios
      if (result.error) {
        if (result.error.code === 'ETIMEDOUT') {
          throw new StrategyError('Recording timed out. The browser may not have been closed or the site may be unresponsive.');
        } else {
          throw new StrategyError(`Recording failed: ${result.error.message}`);
        }
      }

      if (!fs.existsSync(tempFile)) {
        throw new StrategyError('Recording cancelled or failed. No output script was generated.');
      }

      console.log('\n✅ Recording finished. Analyzing captured steps...');
      const generatedCode = fs.readFileSync(tempFile, 'utf8');
      fs.removeSync(tempFile);

      return this._parseCodeGenScript(generatedCode, featureName);
    } catch (error) {
      // Clean up temp file if it exists
      if (fs.existsSync(tempFile)) {
        fs.removeSync(tempFile);
      }
      throw new StrategyError(`CodeGen recording failed: ${error.message}`);
    }
  }

  _parseCodeGenScript(code, featureName) {
    const lines = code.split(/\r?\n/).map(l => l.trim());
    
    // Analyze the recorded actions to understand the context
    const context = this._analyzeRecordedActions(lines, featureName);
    
    const plan = {
      featureName: featureName,
      scenarioName: context.scenarioName,
      userStory: context.userStory,
      tags: context.tags,
      backgroundSteps: [
        { keyword: 'Given', text: `I navigate to the application` }
      ],
      locators: [],
      steps: [],
      verificationSteps: context.verificationSteps,
      additionalScenarios: context.additionalScenarios
    };
    
    const addedLocators = new Map();
    const usedStepTexts = new Set(); // Prevent duplicate steps
    let lastKeyword = 'When';

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
        // Clean selector: remove 'page.' prefix if it exists
        const cleanSelector = this._cleanSelector(rawLocator);
        plan.locators.push({ name: action.locatorName, selector: cleanSelector, friendlyName: friendlyName });
      }
      
      action.keyword = (lastKeyword === 'When' || lastKeyword === 'And') ? 'And' : 'When';
      lastKeyword = action.keyword;

      let stepText;
      if (action.actionType === 'click') {
        const elementType = (rawLocator.includes("getByRole('button") || rawLocator.includes("[type='submit']")) ? 'button' : (rawLocator.includes("getByRole('link") || rawLocator.includes("locator('a")) ? 'link' : 'element';
        stepText = `I click on "${friendlyName}"`;
        action.text = stepText;
      } else if (action.actionType === 'fill') {
        stepText = `I fill in "${friendlyName}" with ${actionValue}`;
        action.text = stepText;
        action.actionValue = actionValue.replace(/['"]/g, '');
      } else if (action.actionType === 'press') {
        stepText = `I press the ${actionValue} key in "${friendlyName}"`;
        action.text = stepText;
        action.actionValue = actionValue.replace(/['"]/g, '');
      }
      
      // Only add step if it's not a duplicate
      if (!usedStepTexts.has(stepText)) {
        plan.steps.push(action);
        usedStepTexts.add(stepText);
      } else {
        console.log(`   ⚠️  Skipping duplicate step: "${stepText}"`);
      }
    }

    // Validate selectors before finalizing the plan
    console.log('\n🔍 Validating recorded selectors...');
    this._validateRecordedSelectors(plan.locators);

    return plan;
  }

  /**
   * Analyze recorded actions to determine context and create better user stories
   */
  _analyzeRecordedActions(lines, featureName) {
    const actions = lines.filter(line => 
      line.includes('.click()') || line.includes('.fill(') || line.includes('.press(')
    );
    
    let flowType = 'general';
    let userStory = {
      actor: 'user',
      action: 'interact with the application',
      benefit: 'accomplish my goals'
    };
    let tags = ['smoke'];
    let scenarioName = 'User interaction workflow';
    
    // Analyze patterns in the recorded actions
    const actionText = actions.join(' ').toLowerCase();
    
    // Login/Authentication patterns
    if (this._containsPatterns(actionText, ['login', 'password', 'sign in', 'email', 'username'])) {
      flowType = 'authentication';
      userStory = {
        actor: 'registered user',
        action: 'login to my account',
        benefit: 'access my personal dashboard'
      };
      tags = ['smoke', 'authentication', 'critical'];
      scenarioName = 'Successful user login';
    }
    
    // Registration patterns
    else if (this._containsPatterns(actionText, ['register', 'signup', 'create account', 'confirm password'])) {
      flowType = 'registration';
      userStory = {
        actor: 'new user',
        action: 'create an account',
        benefit: 'start using the application'
      };
      tags = ['smoke', 'registration'];
      scenarioName = 'New user registration';
    }
    
    // Form submission patterns
    else if (this._containsPatterns(actionText, ['submit', 'save', 'send', 'create']) && actions.length > 3) {
      flowType = 'form';
      userStory = {
        actor: 'user',
        action: 'complete and submit a form',
        benefit: 'provide my information to the system'
      };
      tags = ['smoke', 'forms'];
      scenarioName = 'Form completion and submission';
    }
    
    // Shopping/E-commerce patterns
    else if (this._containsPatterns(actionText, ['cart', 'buy', 'purchase', 'checkout', 'payment'])) {
      flowType = 'ecommerce';
      userStory = {
        actor: 'customer',
        action: 'purchase items',
        benefit: 'get the products I need'
      };
      tags = ['smoke', 'ecommerce', 'critical'];
      scenarioName = 'Product purchase flow';
    }
    
    // Search patterns
    else if (this._containsPatterns(actionText, ['search', 'query', 'find'])) {
      flowType = 'search';
      userStory = {
        actor: 'user',
        action: 'search for information',
        benefit: 'find what I am looking for'
      };
      tags = ['smoke', 'search'];
      scenarioName = 'Information search';
    }

    const verificationSteps = this._generateVerificationSteps(flowType);
    const additionalScenarios = this._generateAdditionalScenarios(flowType);

    return {
      userStory,
      tags,
      scenarioName,
      verificationSteps,
      additionalScenarios,
      flowType
    };
  }

  /**
   * Check if text contains any of the specified patterns
   */
  _containsPatterns(text, patterns) {
    return patterns.some(pattern => text.includes(pattern));
  }

  /**
   * Generate verification steps based on flow type
   */
  _generateVerificationSteps(flowType) {
    const verifications = {
      authentication: [
        { keyword: 'Then', text: 'I should be successfully logged in' },
        { keyword: 'And', text: 'I should see my dashboard' }
      ],
      registration: [
        { keyword: 'Then', text: 'I should see a registration confirmation' },
        { keyword: 'And', text: 'I should receive a welcome message' }
      ],
      form: [
        { keyword: 'Then', text: 'I should see a success confirmation' },
        { keyword: 'And', text: 'my data should be saved' }
      ],
      search: [
        { keyword: 'Then', text: 'I should see relevant search results' }
      ],
      ecommerce: [
        { keyword: 'Then', text: 'the item should be processed' },
        { keyword: 'And', text: 'I should see a confirmation' }
      ],
      general: [
        { keyword: 'Then', text: 'the operation should complete successfully' }
      ]
    };
    
    return verifications[flowType] || verifications.general;
  }

  /**
   * Generate additional scenarios for comprehensive testing
   */
  _generateAdditionalScenarios(flowType) {
    const scenarios = [];
    
    if (flowType === 'authentication') {
      scenarios.push({
        name: 'Failed login with invalid credentials',
        tags: 'negative',
        steps: [
          { keyword: 'When', text: 'I fill in "Email" with "invalid@example.com"' },
          { keyword: 'And', text: 'I fill in "Password" with "wrongpassword"' },
          { keyword: 'And', text: 'I click on "Login"' },
          { keyword: 'Then', text: 'I should see an error message' }
        ]
      });
    }
    
    return scenarios;
  }

  /**
   * Clean selector by removing 'page.' prefix
   * @param {string} selector - Raw selector from recorded code
   * @returns {string} Clean selector ready for page object template
   */
  _cleanSelector(selector) {
    // Remove 'page.' prefix if it exists
    if (selector.startsWith('page.')) {
      return selector.substring(5); // Remove 'page.' (5 characters)
    }
    return selector;
  }

  /**
   * Validate recorded selectors and provide warnings
   * @param {Array} locators - Locators to validate
   */
  _validateRecordedSelectors(locators) {
    const warnings = [];
    
    locators.forEach((locator, index) => {
      const selector = locator.selector;
      console.log(`   Locator ${index}: ${selector}`);
      
      const locatorWarnings = [];
      
      // Check for fragile selectors
      if (selector.includes('nth(') || selector.includes('first()') || selector.includes('last()')) {
        locatorWarnings.push('Positional selector may be fragile');
        console.log(`     ⚠️  Positional selector may be fragile`);
      }
      
      if (selector.includes('text=') && selector.match(/text=['"][^'"]{1,3}['"]/)) {
        locatorWarnings.push('Short text selector may be unreliable');
        console.log(`     ⚠️  Short text selector may be unreliable`);
      }
      
      if (selector.includes('xpath=') || selector.includes('//')) {
        locatorWarnings.push('XPath selector may be brittle');
        console.log(`     ⚠️  XPath selector may be brittle - consider using semantic locators`);
      }
      
      if (selector.includes('css=') && (selector.includes('#') || selector.includes('.'))) {
        if (selector.match(/\.((?!btn|button|input|form)[a-z0-9-]{8,})/i)) {
          locatorWarnings.push('CSS class selector may be auto-generated');
          console.log(`     ⚠️  CSS class appears auto-generated - may break if styles change`);
        }
      }
      
      // Check for Playwright best practices
      if (!selector.includes('getByRole') && !selector.includes('getByLabel') && 
          !selector.includes('getByText') && !selector.includes('getByTestId')) {
        locatorWarnings.push('Consider using semantic Playwright locators (getByRole, getByLabel, etc.)');
        console.log(`     💡 Consider using semantic Playwright locators for better maintainability`);
      } else {
        console.log(`     ✅ Using semantic Playwright locator`);
      }
      
      // Check for quote escaping issues
      const quoteCount = (selector.match(/'/g) || []).length + (selector.match(/"/g) || []).length;
      if (selector.includes("'") && selector.includes('"')) {
        locatorWarnings.push('Mixed quote types detected');
        console.log(`     ⚠️  Mixed quote types detected`);
      }
      
      locator.validationWarnings = locatorWarnings;
      if (locatorWarnings.length > 0) {
        warnings.push({ locator: locator.friendlyName, warnings: locatorWarnings });
      }
    });
    
    // Report summary
    if (warnings.length > 0) {
      console.log(`\n⚠️  Found ${warnings.length} selector validation warning(s):`);
      warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning.locator}: ${warning.warnings.join(', ')}`);
      });
      console.log(`\n💡 Consider manually reviewing these selectors before running tests.`);
      console.log(`   - Use getByRole, getByLabel, getByText for better maintainability`);
      console.log(`   - Avoid positional selectors when possible`);
      console.log(`   - Add data-testid attributes for complex elements`);
    } else {
      console.log(`\n✅ All selectors passed validation checks.`);
    }
  }
}
module.exports = { CodeGenStrategy };