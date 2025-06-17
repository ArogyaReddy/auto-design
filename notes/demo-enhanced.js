const { AIFreeTextAnalysisStrategy } = require('../src/strategies/AIFreeTextAnalysisStrategy.js');
const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');

async function demonstrateEnhancedFeatures() {
  console.log('🚀 Demonstrating Enhanced Feature Generation...\n');
  
  const loginScenario = `
    As a registered user
    I want to login using my email and password
    So that I can access my personal dashboard

    Login process:
    - Enter email address in the email field
    - Enter password in the password field  
    - Click the login button
    - Verify successful login message appears
  `;
  
  const strategy = new AIFreeTextAnalysisStrategy();
  
  try {
    const testPlan = await strategy.createTestPlan(loginScenario, 'UserLogin');
    
    console.log('📋 Generated Test Plan Structure:');
    console.log('Feature Name:', testPlan.featureName);
    console.log('Scenario Name:', testPlan.scenarioName);
    console.log('User Story:');
    console.log(`  Actor: ${testPlan.userStory.actor}`);
    console.log(`  Action: ${testPlan.userStory.action}`);
    console.log(`  Benefit: ${testPlan.userStory.benefit}`);
    console.log('Tags:', testPlan.tags);
    console.log('\nSteps:');
    testPlan.steps.forEach((step, i) => {
      console.log(`  ${i+1}. ${step.keyword} ${step.text}`);
    });
    console.log('\nVerification Steps:');
    testPlan.verificationSteps.forEach((step, i) => {
      console.log(`  ${i+1}. ${step.keyword} ${step.text}`);
    });
    
    // Generate feature file
    const templatePath = path.join(__dirname, 'src/templates/feature.hbs');
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(templateContent);
    
    const featureContent = template(testPlan);
    
    // Save to output directory
    const outputDir = path.join(__dirname, 'output/DemoEnhanced');
    fs.ensureDirSync(path.join(outputDir, 'Features'));
    
    const featureFile = path.join(outputDir, 'Features', `${testPlan.featureName}.feature`);
    fs.writeFileSync(featureFile, featureContent);
    
    console.log('\n📄 Generated Enhanced Feature File:');
    console.log('=====================================');
    console.log(featureContent);
    
    console.log(`\n✅ Enhanced feature file saved to: ${featureFile}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

demonstrateEnhancedFeatures();
