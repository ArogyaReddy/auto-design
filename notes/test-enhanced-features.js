// Test script for enhanced feature generation
const { TextAnalysisStrategy } = require('../src/strategies/TextAnalysisStrategy');
const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');

async function testEnhancedFeatureGeneration() {
  console.log('🚀 Testing Enhanced Feature Generation...\n');
  
  // Test with different scenarios
  const scenarios = [
    {
      name: 'Login Flow',
      text: `
        As a registered user I want to login using my credentials so that I can access my dashboard.
        
        I need to fill the email field with my email address.
        I need to fill the password field with my password.
        I need to click the login button.
        I should see a welcome message.
      `
    },
    {
      name: 'E-commerce Purchase',
      text: `
        As a customer I want to purchase a product so that I can receive the item I need.
        
        I will click the product card.
        I will click the add to cart button.
        I will fill the quantity field with 2.
        I will click the checkout button.
        I should see the order confirmation.
      `
    }
  ];
  
  const strategy = new TextAnalysisStrategy({ useAI: false });
  
  for (const scenario of scenarios) {
    console.log(`\n📋 Testing: ${scenario.name}`);
    console.log('=====================================');
    
    try {
      const testPlan = await strategy.createTestPlan(scenario.text, scenario.name.replace(/\s+/g, ''));
      
      console.log('Feature Name:', testPlan.featureName);
      console.log('Scenario Name:', testPlan.scenarioName);
      console.log('Actor:', testPlan.userStory.actor);
      console.log('Action:', testPlan.userStory.action);
      console.log('Benefit:', testPlan.userStory.benefit);
      console.log('Tags:', testPlan.tags);
      console.log('Steps:', testPlan.steps.map(s => `${s.keyword} ${s.text}`));
      console.log('Verification Steps:', testPlan.verificationSteps?.map(s => `${s.keyword} ${s.text}`) || []);
      
      // Generate feature file
      const templatePath = path.join(__dirname, 'src/templates/feature.hbs');
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      const template = Handlebars.compile(templateContent);
      
      const featureContent = template(testPlan);
      
      // Save to output directory
      const outputDir = path.join(__dirname, 'output/EnhancedTest');
      fs.ensureDirSync(path.join(outputDir, 'Features'));
      
      const featureFile = path.join(outputDir, 'Features', `${testPlan.featureName}.feature`);
      fs.writeFileSync(featureFile, featureContent);
      
      console.log(`✅ Feature file saved to: ${featureFile}`);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
  
  // Show the final generated feature file
  console.log('\n📄 Sample Generated Feature File:');
  console.log('========================================');
  const sampleFeature = fs.readFileSync('/Users/arog/ADP/auto-design-platform/auto-design/output/EnhancedTest/Features/LoginFlow.feature', 'utf8');
  console.log(sampleFeature);
}

testEnhancedFeatureGeneration();
}
}

testEnhancedFeatureGeneration();
