const { BaseStrategy } = require('../core/BaseStrategy');
const { ValidationError, StrategyError } = require('../core/ErrorHandler');
const JiraParser = require('./JiraParser.js');
const path = require('path');

/**
 * Jira Strategy - Generates tests from Jira stories
 */
class JiraStrategy extends BaseStrategy {
  
  /**
   * Get supported input types
   * @returns {string[]} Supported input types
   */
  getSupportedInputTypes() {
    return ['jira', 'jira-story'];
  }

  /**
   * Validate Jira input
   * @param {Object} input - Jira details object
   * @returns {ValidationResult} Validation result
   */
  validate(input) {
    const result = { success: true, errors: [], warnings: [] };

    if (!input || typeof input !== 'object') {
      result.success = false;
      result.errors.push('Jira input must be an object');
      return result;
    }

    // Check required fields
    if (!input.url) {
      result.success = false;
      result.errors.push('Jira URL is required');
    }

    if (!input.key) {
      result.success = false;
      result.errors.push('Jira issue key is required');
    }

    if (!input.auth || !input.auth.user || !input.auth.token) {
      result.success = false;
      result.errors.push('Jira authentication (user and token) is required');
    }

    // Validate URL format
    if (input.url) {
      try {
        new URL(input.url);
      } catch (error) {
        result.success = false;
        result.errors.push('Invalid Jira URL format');
      }
    }

    // Validate issue key format
    if (input.key && !/^[A-Z]+-\d+$/.test(input.key)) {
      result.warnings.push('Jira issue key should follow format: PROJECT-123');
    }

    return result;
  }

  async createTestPlan(jiraDetails, featureName, options = {}) {
    // Validate input
    const validation = this.validate(jiraDetails);
    if (!validation.success) {
      throw new ValidationError(`Jira input validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      // Call JiraParser to get the fields and flowName
      const { fields, flowName } = await JiraParser.fromStory(jiraDetails);

      if (!fields || fields.length === 0) {
        throw new StrategyError("JiraParser did not find any actionable sentences");
      }

      const plan = {
        featureName: featureName || this._sanitize(flowName) || 'JiraFeature',
        scenarioName: `A scenario from JIRA story ${jiraDetails.key}`,
        locators: [],
        steps: []
      };
      
      let lastKeyword = 'Given';
      plan.steps.push({ keyword: 'Given', text: `I am on the application` });

      // Convert the fields from parser into a proper TestPlan
      for (const field of fields) {
        const locatorName = this._sanitize(field.label);
        let step = {};
        
        if (field.type === 'button') {
          plan.locators.push({
            name: locatorName,
            selector: `page.getByRole('button', { name: '${field.label}' })`,
            friendlyName: field.label
          });
          step = {
            keyword: (lastKeyword === 'When' || lastKeyword === 'And') ? 'And' : 'When',
            text: `I click the '${field.label}' button`,
            actionType: 'click',
            locatorName: locatorName
          };
          lastKeyword = step.keyword;
        } else if (field.type === 'text') {
          plan.locators.push({
            name: locatorName,
            selector: `page.getByLabel('${field.label}')`,
            friendlyName: field.label
          });
          step = {
            keyword: (lastKeyword === 'When' || lastKeyword === 'And') ? 'And' : 'When',
            text: `I fill the '${field.label}' field with "${field.value || 'test data'}"`,
            actionType: 'fill',
            locatorName: locatorName,
            actionValue: field.value || 'test data'
          };
          lastKeyword = step.keyword;
        }
        
        if (step.keyword) {
          plan.steps.push(step);
        }
      }

      return plan;
    } catch (error) {
      throw new StrategyError(`Failed to create test plan from Jira story: ${error.message}`);
    }
  }
}

module.exports = { JiraStrategy };