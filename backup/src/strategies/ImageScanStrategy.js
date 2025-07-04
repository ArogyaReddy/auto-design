// src/strategies/ImageScanStrategy.js
const ImageScanner = require('./ImageScanner.js');
const path = require('path');

class ImageScanStrategy {
  
  _sanitize(str = '') {
    if (!str) return 'element';
    return str.toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }

  async createTestPlan(imagePath, featureName) {
    // 1. Call your ImageScanner to get the fields
    const { fields } = await ImageScanner.fromScreenshots([imagePath]);

    if (!fields || fields.length === 0) {
      console.warn("⚠️ Your ImageScanner did not find any actionable fields to process.");
      return null;
    }

    const plan = {
      featureName: featureName,
      scenarioName: `A scenario from image ${path.basename(imagePath)}`,
      locators: [],
      steps: []
    };
    
    let lastKeyword = 'Given';
    plan.steps.push({ keyword: 'Given', text: `I am on the application` });

    // 2. Convert the fields from your scanner into a proper TestPlan
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
module.exports = { ImageScanStrategy };