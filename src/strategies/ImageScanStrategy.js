const { BaseStrategy } = require('../core/BaseStrategy');
const { ValidationError, StrategyError } = require('../core/ErrorHandler');
const ImageScanner = require('./ImageScanner.js');
const path = require('path');
const fs = require('fs');

/**
 * Image Scan Strategy - Analyzes screenshots to generate tests
 */
class ImageScanStrategy extends BaseStrategy {
  
  /**
   * Get supported input types
   * @returns {string[]} Supported input types
   */
  getSupportedInputTypes() {
    return ['image', 'screenshot'];
  }

  /**
   * Validate image input
   * @param {string} input - Image path to validate
   * @returns {ValidationResult} Validation result
   */
  validate(input) {
    const result = { success: true, errors: [], warnings: [] };

    if (!input || typeof input !== 'string') {
      result.success = false;
      result.errors.push('Image path must be a non-empty string');
      return result;
    }

    // Check if file exists
    if (!fs.existsSync(input)) {
      result.success = false;
      result.errors.push(`Image file not found: ${input}`);
      return result;
    }

    // Check if it's an image file
    const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
    const ext = path.extname(input).toLowerCase();
    if (!validExtensions.includes(ext)) {
      result.success = false;
      result.errors.push(`Unsupported image format: ${ext}. Supported: ${validExtensions.join(', ')}`);
    }

    return result;
  }

  async createTestPlan(imagePath, featureName, options = {}) {
    // Validate input
    const validation = this.validate(imagePath);
    if (!validation.success) {
      throw new ValidationError(`Image input validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      // Call ImageScanner to get the fields
      const { fields } = await ImageScanner.fromScreenshots([imagePath]);

      if (!fields || fields.length === 0) {
        throw new StrategyError("ImageScanner did not find any actionable fields to process");
      }

      console.log('\n🔍 Validating detected selectors...');
      // Add selector validation with warnings
      const validatedFields = this._validateSelectors(fields);
      
      // Analyze the context to create better user stories
      const context = this._analyzeImageContext(validatedFields, imagePath);
      
      const plan = {
        featureName: featureName || this._sanitize(path.basename(imagePath, path.extname(imagePath))),
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
      
      let lastKeyword = 'When';
      const usedStepTexts = new Set(); // Prevent duplicate steps

      // Convert the fields from scanner into a proper TestPlan
      for (const field of validatedFields) {
        const locatorName = this._sanitize(field.label);
        let step = {};
        
        // Use the improved selector from the scanner
        const selector = field.selector || this._generateFallbackSelector(field);
        
        if (field.type === 'button' || field.actionType === 'click') {
          plan.locators.push({
            name: locatorName,
            selector: selector,
            friendlyName: field.label,
            validationWarnings: field.validationWarnings || []
          });
          
          const stepText = `I click on "${field.label}"`;
          if (!usedStepTexts.has(stepText)) {
            step = {
              keyword: (lastKeyword === 'When' || lastKeyword === 'And') ? 'And' : 'When',
              text: stepText,
              actionType: 'click',
              locatorName: locatorName
            };
            usedStepTexts.add(stepText);
            lastKeyword = step.keyword;
          }
        } else if (field.type === 'input' || field.actionType === 'fill') {
          plan.locators.push({
            name: locatorName,
            selector: selector,
            friendlyName: field.label,
            validationWarnings: field.validationWarnings || []
          });
          
          const stepText = `I fill in "${field.label}" with "${field.value || 'test data'}"`;
          if (!usedStepTexts.has(stepText)) {
            step = {
              keyword: (lastKeyword === 'When' || lastKeyword === 'And') ? 'And' : 'When',
              text: stepText,
              actionType: 'fill',
              locatorName: locatorName,
              actionValue: field.value || 'test data'
            };
            usedStepTexts.add(stepText);
            lastKeyword = step.keyword;
          }
        }
        
        if (step.keyword) {
          plan.steps.push(step);
        }
      }

      // Report validation warnings
      this._reportValidationWarnings(plan.locators);

      return plan;
    } catch (error) {
      throw new StrategyError(`Failed to create test plan from image: ${error.message}`);
    }
  }

  /**
   * Validate selectors and provide warnings
   * @param {Array} fields - Fields with selectors to validate
   * @returns {Array} Fields with validation warnings
   */
  _validateSelectors(fields) {
    return fields.map((field, index) => {
      const warnings = field.validationWarnings || [];
      const selector = field.selector;

      console.log(`   Locator ${index}: ${selector}`);

      // Check for common selector issues
      if (!selector) {
        warnings.push('Missing selector - using fallback');
        console.log(`     ⚠️  Missing selector - will use fallback`);
      } else {
        // Check for potential issues
        if (selector.includes("'") && selector.includes('"')) {
          warnings.push('Mixed quote types may cause issues');
          console.log(`     ⚠️  Mixed quote types detected`);
        }

        if (selector.includes('getByText') && field.label && field.label.length < 3) {
          warnings.push('Short text selector may be unreliable');
          console.log(`     ⚠️  Short text selector may be unreliable`);
        }

        if (selector.includes('.first()') || selector.includes('.nth(')) {
          warnings.push('Positional selector may be fragile');
          console.log(`     ⚠️  Positional selector may be fragile`);
        }

        // Check for Playwright selector validity
        if (!this._isValidPlaywrightSelector(selector)) {
          warnings.push('Selector may not be valid Playwright syntax');
          console.log(`     ⚠️  Selector may not be valid Playwright syntax`);
        } else {
          console.log(`     ✅ Selector appears valid`);
        }
      }

      return { ...field, validationWarnings: warnings };
    });
  }

  /**
   * Check if a selector follows Playwright syntax rules
   * @param {string} selector - Selector to validate
   * @returns {boolean} Whether the selector appears valid
   */
  _isValidPlaywrightSelector(selector) {
    try {
      // Basic Playwright selector patterns
      const validPatterns = [
        /^getBy(Role|Label|Text|PlaceholderText|AltText|Title|TestId)\s*\(/,
        /^locator\s*\(/,
        /^page\./,
        /^\w+\s*>>/  // CSS selector
      ];

      // Check if it matches any valid pattern
      const isValid = validPatterns.some(pattern => pattern.test(selector));
      
      // Additional checks for common issues
      if (isValid) {
        // Check for unbalanced parentheses
        const openParens = (selector.match(/\(/g) || []).length;
        const closeParens = (selector.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
          return false;
        }

        // Check for unbalanced quotes
        const singleQuotes = (selector.match(/'/g) || []).length;
        const doubleQuotes = (selector.match(/"/g) || []).length;
        if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
          return false;
        }
      }

      return isValid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate fallback selector for fields missing selectors
   * @param {Object} field - Field needing a selector
   * @returns {string} Fallback selector
   */
  _generateFallbackSelector(field) {
    const cleanLabel = field.label.replace(/['"]/g, '');
    
    if (field.type === 'button' || field.actionType === 'click') {
      return `getByRole('button', { name: /${cleanLabel}/i })`;
    } else if (field.type === 'input' || field.actionType === 'fill') {
      return `getByLabel(/${cleanLabel}/i)`;
    } else {
      return `getByText('${cleanLabel}')`;
    }
  }

  /**
   * Report validation warnings to console
   * @param {Array} locators - Locators with potential warnings
   */
  _reportValidationWarnings(locators) {
    const warningsFound = locators.filter(loc => loc.validationWarnings && loc.validationWarnings.length > 0);
    
    if (warningsFound.length > 0) {
      console.log(`\n⚠️  Found ${warningsFound.length} selector validation warning(s):`);
      warningsFound.forEach((loc, index) => {
        console.log(`   ${index + 1}. ${loc.friendlyName}: ${loc.validationWarnings.join(', ')}`);
      });
      console.log(`\n💡 Consider manually reviewing these selectors before running tests.`);
    } else {
      console.log(`\n✅ All selectors passed validation checks.`);
    }
  }

  /**
   * Analyze image context to create better user stories and scenarios
   * @param {Array} fields - Detected fields from image
   * @param {string} imagePath - Path to the image
   * @returns {Object} Context information for better feature generation
   */
  _analyzeImageContext(fields, imagePath) {
    const fileName = path.basename(imagePath, path.extname(imagePath)).toLowerCase();
    const buttonLabels = fields.filter(f => f.type === 'button').map(f => f.label.toLowerCase());
    const textLabels = fields.filter(f => f.type === 'text').map(f => f.label.toLowerCase());
    
    // Determine the type of flow based on field analysis
    let flowType = 'general';
    let userStory = {
      actor: 'user',
      action: 'interact with the application',
      benefit: 'accomplish my tasks'
    };
    let tags = ['smoke'];
    let scenarioName = 'User interaction workflow';
    
    // Login/Authentication flows
    if (this._containsAny(textLabels, ['user', 'username', 'email', 'password', 'login']) ||
        this._containsAny(buttonLabels, ['login', 'sign in', 'signin', 'submit'])) {
      flowType = 'authentication';
      userStory = {
        actor: 'registered user',
        action: 'login using my credentials',
        benefit: 'access my account securely'
      };
      tags = ['smoke', 'authentication', 'critical'];
      scenarioName = 'Successful user authentication';
    }
    
    // Registration/Signup flows
    else if (this._containsAny(textLabels, ['firstname', 'lastname', 'confirm', 'register']) ||
             this._containsAny(buttonLabels, ['register', 'sign up', 'signup', 'create account'])) {
      flowType = 'registration';
      userStory = {
        actor: 'new user',
        action: 'create an account',
        benefit: 'access the application services'
      };
      tags = ['smoke', 'registration'];
      scenarioName = 'New user account creation';
    }
    
    // Form submission flows
    else if (this._containsAny(buttonLabels, ['submit', 'save', 'send', 'create', 'update']) ||
             textLabels.length > 2) {
      flowType = 'form';
      userStory = {
        actor: 'user',
        action: 'fill out and submit the form',
        benefit: 'provide my information to the system'
      };
      tags = ['smoke', 'forms'];
      scenarioName = 'Form completion and submission';
    }
    
    // Search flows
    else if (this._containsAny(textLabels, ['search', 'query', 'find']) ||
             this._containsAny(buttonLabels, ['search', 'find', 'go'])) {
      flowType = 'search';
      userStory = {
        actor: 'user',
        action: 'search for information',
        benefit: 'find what I am looking for quickly'
      };
      tags = ['smoke', 'search'];
      scenarioName = 'Information search and retrieval';
    }
    
    // E-commerce flows
    else if (this._containsAny(buttonLabels, ['add to cart', 'buy', 'purchase', 'checkout', 'order'])) {
      flowType = 'ecommerce';
      userStory = {
        actor: 'customer',
        action: 'purchase products',
        benefit: 'get the items I need'
      };
      tags = ['smoke', 'ecommerce', 'critical'];
      scenarioName = 'Product purchase workflow';
    }

    // Generate verification steps based on flow type
    const verificationSteps = this._generateVerificationSteps(flowType);
    
    // Generate additional scenarios based on context
    const additionalScenarios = this._generateAdditionalScenarios(flowType, fields);

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
   * Check if array contains any of the specified terms
   */
  _containsAny(array, terms) {
    return terms.some(term => array.some(item => item.includes(term)));
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
        { keyword: 'Then', text: 'I should see a success confirmation' },
        { keyword: 'And', text: 'I should receive a welcome message' }
      ],
      form: [
        { keyword: 'Then', text: 'I should see a success message' },
        { keyword: 'And', text: 'my information should be saved' }
      ],
      search: [
        { keyword: 'Then', text: 'I should see relevant search results' },
        { keyword: 'And', text: 'the results should be accurate' }
      ],
      ecommerce: [
        { keyword: 'Then', text: 'the item should be added to my cart' },
        { keyword: 'And', text: 'I should see the cart total updated' }
      ],
      general: [
        { keyword: 'Then', text: 'the action should be completed successfully' }
      ]
    };
    
    return verifications[flowType] || verifications.general;
  }

  /**
   * Generate additional scenarios for comprehensive testing
   */
  _generateAdditionalScenarios(flowType, fields) {
    const scenarios = [];
    
    if (flowType === 'authentication') {
      scenarios.push({
        name: 'Login with invalid credentials',
        tags: 'negative',
        steps: [
          { keyword: 'When', text: 'I fill in "Email" with "invalid@email.com"' },
          { keyword: 'And', text: 'I fill in "Password" with "wrongpassword"' },
          { keyword: 'And', text: 'I click on "Login"' },
          { keyword: 'Then', text: 'I should see "Invalid credentials" error message' }
        ]
      });
    }
    
    if (flowType === 'form') {
      const requiredFields = fields.filter(f => f.type === 'text').slice(0, 2);
      if (requiredFields.length > 0) {
        scenarios.push({
          name: 'Form validation with missing required fields',
          tags: 'validation',
          steps: [
            { keyword: 'When', text: 'I leave required fields empty' },
            { keyword: 'And', text: 'I click on "Submit"' },
            { keyword: 'Then', text: 'I should see validation error messages' }
          ]
        });
      }
    }
    
    return scenarios;
  }
}

module.exports = { ImageScanStrategy };