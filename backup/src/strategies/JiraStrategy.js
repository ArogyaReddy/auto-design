// src/strategies/JiraStrategy.js
const JiraParser = require('./JiraParser.js');
const path = require('path');

class JiraStrategy {
  
  _sanitize(str = '') {
    if (!str) return 'element';
    const sanitized = str.toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return /^\d/.test(sanitized) ? `element${sanitized}` : sanitized;
  }

  async createTestPlan(jiraDetails) {
    // 1. Call your JiraParser to get the fields and flowName
    const { fields, flowName } = await JiraParser.fromStory(jiraDetails);

    if (!fields || fields.length === 0) {
      console.warn("⚠️ Your JiraParser did not find any actionable sentences.");
      return null;
    }

    const plan = {
      featureName: this._sanitize(flowName) || 'JiraFeature',
      scenarioName: `A scenario from JIRA story ${jiraDetails.key}`,
      locators: [],
      steps: []
    };
    
    let lastKeyword = 'Given';
    plan.steps.push({ keyword: 'Given', text: `I am on the application` });

    // 2. Convert the fields from your parser into a proper TestPlan
    for (const field of fields) {
      const locatorName = this._sanitize(field.label);
      let step = {};
      
      if (field.type === 'button') {
        plan.locators.push({
          name: locatorName,
          selector: `page.getByRole('button', { name: '${field.label}' })`
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
          selector: `page.getByLabel('${field.label}')`
        });
        step = {
          keyword: 'When',
          text: `I fill the '${field.label}' field with 'test-data'`,
          actionType: 'fill',
          locatorName: locatorName,
          actionValue: 'test-data'
        };
        lastKeyword = 'When';
      }
      
      if (step.keyword) {
        plan.steps.push(step);
      }
    }
    
    return plan;
  }
}

module.exports = { JiraStrategy };