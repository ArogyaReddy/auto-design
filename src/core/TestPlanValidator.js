const { ValidationError } = require('./ErrorHandler');

/**
 * Test Plan Validator
 */
class TestPlanValidator {
  constructor() {
    this.requiredFields = ['featureName', 'scenarioName', 'locators', 'steps'];
    this.locatorRequiredFields = ['name', 'selector'];
    this.stepRequiredFields = ['keyword', 'text'];
    this.validKeywords = ['Given', 'When', 'Then', 'And', 'But'];
  }

  /**
   * Validate a complete test plan
   * @param {Object} plan - Test plan to validate
   * @returns {ValidationResult} Validation result
   */
  validate(plan) {
    const result = {
      success: true,
      errors: [],
      warnings: []
    };

    if (!plan || typeof plan !== 'object') {
      result.success = false;
      result.errors.push('Test plan must be a valid object');
      return result;
    }

    // Validate required fields
    this._validateRequiredFields(plan, result);
    
    // Validate feature name
    this._validateFeatureName(plan.featureName, result);
    
    // Validate scenario name
    this._validateScenarioName(plan.scenarioName, result);
    
    // Validate locators
    this._validateLocators(plan.locators, result);
    
    // Validate steps
    this._validateSteps(plan.steps, result);
    
    // Cross-validate locators and steps
    this._crossValidateLocatorsAndSteps(plan.locators, plan.steps, result);

    return result;
  }

  /**
   * Validate required fields exist
   * @param {Object} plan - Test plan
   * @param {ValidationResult} result - Result object to update
   */
  _validateRequiredFields(plan, result) {
    for (const field of this.requiredFields) {
      if (!(field in plan)) {
        result.success = false;
        result.errors.push(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Validate feature name
   * @param {string} featureName - Feature name
   * @param {ValidationResult} result - Result object to update
   */
  _validateFeatureName(featureName, result) {
    if (!featureName || typeof featureName !== 'string') {
      result.success = false;
      result.errors.push('Feature name must be a non-empty string');
      return;
    }

    if (featureName.trim().length === 0) {
      result.success = false;
      result.errors.push('Feature name cannot be empty');
    }

    if (featureName.length > 100) {
      result.warnings.push('Feature name is very long, consider shortening it');
    }

    // Check for invalid characters that might cause issues in file names
    if (/[<>:"/\\|?*]/.test(featureName)) {
      result.warnings.push('Feature name contains characters that may cause file system issues');
    }
  }

  /**
   * Validate scenario name
   * @param {string} scenarioName - Scenario name
   * @param {ValidationResult} result - Result object to update
   */
  _validateScenarioName(scenarioName, result) {
    if (!scenarioName || typeof scenarioName !== 'string') {
      result.success = false;
      result.errors.push('Scenario name must be a non-empty string');
      return;
    }

    if (scenarioName.trim().length === 0) {
      result.success = false;
      result.errors.push('Scenario name cannot be empty');
    }
  }

  /**
   * Validate locators array
   * @param {Array} locators - Locators array
   * @param {ValidationResult} result - Result object to update
   */
  _validateLocators(locators, result) {
    if (!Array.isArray(locators)) {
      result.success = false;
      result.errors.push('Locators must be an array');
      return;
    }

    if (locators.length === 0) {
      result.warnings.push('No locators defined - test may be incomplete');
      return;
    }

    const locatorNames = new Set();
    
    locators.forEach((locator, index) => {
      // Check required fields
      for (const field of this.locatorRequiredFields) {
        if (!(field in locator) || !locator[field]) {
          result.success = false;
          result.errors.push(`Locator ${index}: Missing required field '${field}'`);
        }
      }

      // Check for duplicate names
      if (locator.name) {
        if (locatorNames.has(locator.name)) {
          result.success = false;
          result.errors.push(`Duplicate locator name: ${locator.name}`);
        }
        locatorNames.add(locator.name);

        // Validate locator name format
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(locator.name)) {
          result.warnings.push(`Locator name '${locator.name}' should be a valid identifier`);
        }
      }

      // Validate selector
      if (locator.selector) {
        this._validateSelector(locator.selector, result, index);
      }
    });
  }

  /**
   * Validate selector syntax
   * @param {string} selector - CSS/Playwright selector
   * @param {ValidationResult} result - Result object to update
   * @param {number} index - Locator index
   */
  _validateSelector(selector, result, index) {
    // Basic validation for common Playwright selectors
    const playwrightMethods = [
      'getByRole', 'getByText', 'getByLabel', 'getByPlaceholder',
      'getByAltText', 'getByTitle', 'getByTestId', 'locator'
    ];

    const hasPlaywrightMethod = playwrightMethods.some(method => 
      selector.includes(method) || selector.includes(`page.${method}`)
    );

    if (!hasPlaywrightMethod && !selector.includes('querySelector')) {
      result.warnings.push(`Locator ${index}: Selector may not be a valid Playwright selector`);
    }
  }

  /**
   * Validate steps array
   * @param {Array} steps - Steps array
   * @param {ValidationResult} result - Result object to update
   */
  _validateSteps(steps, result) {
    if (!Array.isArray(steps)) {
      result.success = false;
      result.errors.push('Steps must be an array');
      return;
    }

    if (steps.length === 0) {
      result.success = false;
      result.errors.push('At least one step must be defined');
      return;
    }

    // Check for proper Gherkin structure
    let hasGiven = false;
    let hasWhenOrThen = false;

    steps.forEach((step, index) => {
      // Check required fields
      for (const field of this.stepRequiredFields) {
        if (!(field in step) || !step[field]) {
          result.success = false;
          result.errors.push(`Step ${index}: Missing required field '${field}'`);
        }
      }

      // Validate keyword
      if (step.keyword && !this.validKeywords.includes(step.keyword)) {
        result.success = false;
        result.errors.push(`Step ${index}: Invalid keyword '${step.keyword}'. Must be one of: ${this.validKeywords.join(', ')}`);
      }

      // Track Gherkin structure
      if (step.keyword === 'Given') hasGiven = true;
      if (step.keyword === 'When' || step.keyword === 'Then') hasWhenOrThen = true;

      // Validate step text
      if (step.text && step.text.length > 200) {
        result.warnings.push(`Step ${index}: Step text is very long, consider breaking it down`);
      }
    });

    // Validate Gherkin structure
    if (!hasGiven) {
      result.warnings.push('No Given step found - consider adding setup steps');
    }
    if (!hasWhenOrThen) {
      result.warnings.push('No When or Then steps found - test may be incomplete');
    }
  }

  /**
   * Cross-validate locators and steps
   * @param {Array} locators - Locators array
   * @param {Array} steps - Steps array
   * @param {ValidationResult} result - Result object to update
   */
  _crossValidateLocatorsAndSteps(locators, steps, result) {
    const locatorNames = new Set(locators.map(l => l.name));
    const referencedLocators = new Set();

    // Find locator references in steps
    steps.forEach((step, index) => {
      if (step.locatorName) {
        referencedLocators.add(step.locatorName);
        
        if (!locatorNames.has(step.locatorName)) {
          result.success = false;
          result.errors.push(`Step ${index}: References undefined locator '${step.locatorName}'`);
        }
      }
    });

    // Check for unused locators
    for (const locatorName of locatorNames) {
      if (!referencedLocators.has(locatorName)) {
        result.warnings.push(`Locator '${locatorName}' is defined but never used`);
      }
    }
  }

  /**
   * Validate and suggest improvements for a test plan
   * @param {Object} plan - Test plan
   * @returns {Object} Validation result with suggestions
   */
  validateWithSuggestions(plan) {
    const result = this.validate(plan);
    
    if (result.success) {
      result.suggestions = this._generateSuggestions(plan);
    }

    return result;
  }

  /**
   * Generate improvement suggestions
   * @param {Object} plan - Test plan
   * @returns {string[]} Array of suggestions
   */
  _generateSuggestions(plan) {
    const suggestions = [];

    // Suggest better organization
    if (plan.steps.length > 10) {
      suggestions.push('Consider breaking this scenario into multiple smaller scenarios');
    }

    // Suggest better locator strategies
    const selectorTypes = plan.locators.map(l => {
      if (l.selector.includes('getByRole')) return 'role';
      if (l.selector.includes('getByTestId')) return 'testId';
      if (l.selector.includes('querySelector')) return 'css';
      return 'other';
    });

    const cssSelectors = selectorTypes.filter(t => t === 'css').length;
    if (cssSelectors > selectorTypes.length * 0.5) {
      suggestions.push('Consider using more semantic selectors (getByRole, getByLabel) instead of CSS selectors for better test maintainability');
    }

    return suggestions;
  }
}

module.exports = { TestPlanValidator };
