/**
 * Base Strategy Interface
 * All test generation strategies must extend this class
 */
class BaseStrategy {
  /**
   * Create a test plan from the given input
   * @param {any} input - The input data (URL, file path, JIRA details, etc.)
   * @param {string} featureName - The name for the generated feature
   * @param {Object} options - Additional options for the strategy
   * @returns {Promise<TestPlan|null>} The generated test plan or null if failed
   */
  async createTestPlan(input, featureName, options = {}) {
    throw new Error('createTestPlan must be implemented by strategy');
  }

  /**
   * Validate the input before processing
   * @param {any} input - The input to validate
   * @returns {ValidationResult} Validation result with success/error info
   */
  validate(input) {
    throw new Error('validate must be implemented by strategy');
  }

  /**
   * Get the strategy name
   * @returns {string} The strategy name
   */
  getName() {
    return this.constructor.name;
  }

  /**
   * Get supported input types
   * @returns {string[]} Array of supported input types
   */
  getSupportedInputTypes() {
    throw new Error('getSupportedInputTypes must be implemented by strategy');
  }

  /**
   * Sanitize a string for use in code generation
   * @param {string} str - The string to sanitize
   * @returns {string} The sanitized string
   */
  _sanitize(str = '') {
    if (!str) return 'element';
    const sanitized = str.toString()
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .trim()
      .split(/\s+/)
      .map((w, i) => i ? w[0].toUpperCase() + w.slice(1) : w.toLowerCase())
      .join('');
    return /^\d/.test(sanitized) ? `element${sanitized}` : sanitized;
  }

  /**
   * Convert string to PascalCase
   * @param {string} str - The string to convert
   * @returns {string} PascalCase string
   */
  _toPascalCase(str) {
    if (!str) return 'DefaultFeature';
    return str
      .replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '')
      .replace(/^\w/, c => c.toUpperCase());
  }
}

/**
 * Test Plan structure
 * @typedef {Object} TestPlan
 * @property {string} featureName - The feature name
 * @property {string} scenarioName - The scenario name
 * @property {Locator[]} locators - Array of locators
 * @property {Step[]} steps - Array of test steps
 */

/**
 * Locator definition
 * @typedef {Object} Locator
 * @property {string} name - The locator name
 * @property {string} selector - The selector string
 * @property {string} friendlyName - Human-readable name
 */

/**
 * Test step definition
 * @typedef {Object} Step
 * @property {string} keyword - Gherkin keyword (Given, When, Then, And)
 * @property {string} text - Step description
 * @property {string} actionType - Type of action (click, fill, press, etc.)
 * @property {string} locatorName - Associated locator name
 * @property {string} actionValue - Value for the action (if applicable)
 */

/**
 * Validation result
 * @typedef {Object} ValidationResult
 * @property {boolean} success - Whether validation passed
 * @property {string[]} errors - Array of error messages
 * @property {string[]} warnings - Array of warning messages
 */

module.exports = { BaseStrategy };
