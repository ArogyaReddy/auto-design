#!/usr/bin/env node

// Test URL validation with the complex ADP URL
const testUrl = 'https://online-iat.adp.com/signin/v1/?APPID=RUN&productId=7bf1242e-2ff0-e324-e053-37004b0bc98c';

console.log('🧪 Testing URL Handling');
console.log('======================');
console.log();

console.log('📋 Input URL:');
console.log(`"${testUrl}"`);
console.log(`Length: ${testUrl.length} characters`);
console.log();

// Test URL validation
console.log('🔍 URL Validation:');
try {
  const parsed = new URL(testUrl);
  console.log('✅ Valid URL');
  console.log(`   Protocol: ${parsed.protocol}`);
  console.log(`   Host: ${parsed.host}`);
  console.log(`   Pathname: ${parsed.pathname}`);
  console.log(`   Search: ${parsed.search}`);
  console.log(`   Full href: ${parsed.href}`);
} catch (error) {
  console.log(`❌ Invalid URL: ${error.message}`);
}
console.log();

// Test command construction
console.log('🔧 Command Construction:');
const featureName = 'TestADP';
const command = `node run.js record ${featureName} --url "${testUrl}"`;
console.log(`Command: ${command}`);
console.log(`Command length: ${command.length} characters`);
console.log();

// Test shell escaping scenarios
console.log('🛡️  Shell Escaping Tests:');
const scenarios = [
  { desc: 'Original URL', url: testUrl },
  { desc: 'URL with single quotes escaped', url: testUrl.replace(/'/g, "\\'") },
  { desc: 'URL with ampersands escaped', url: testUrl.replace(/&/g, '\\&') },
];

scenarios.forEach((scenario, index) => {
  console.log(`${index + 1}. ${scenario.desc}:`);
  console.log(`   "${scenario.url}"`);
  const cmd = `node run.js record Test${index + 1} --url "${scenario.url}"`;
  console.log(`   Command: ${cmd}`);
  console.log();
});

console.log('💡 If recording fails, check:');
console.log('   1. Network connectivity to online-iat.adp.com');
console.log('   2. VPN or corporate firewall settings');
console.log('   3. Site authentication requirements');
console.log('   4. Browser security settings');
