#!/usr/bin/env node

// Test script to verify all generation options are available
const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing all generation options availability...');
console.log('');
console.log('This will open the interactive UI briefly to verify menu options.');
console.log('It should show:');
console.log('  ✅ 🎬 Auto Recorder (recording)');
console.log('  ✅ 📝 Text/User Story conversion');
console.log('  ✅ 📸 Image/Screenshot conversion');
console.log('  ✅ 🎫 JIRA Story/Feature extraction');
console.log('  ✅ 📄 Summary/Text File conversion');
console.log('');
console.log('Press Ctrl+C to exit after verifying the menu options...');
console.log('');

setTimeout(() => {
  const ui = spawn('node', [path.join(__dirname, 'interactive-ui.js')], {
    stdio: 'inherit'
  });

  ui.on('close', (code) => {
    console.log('\n✅ Test completed!');
    process.exit(code);
  });
}, 2000);
