#!/usr/bin/env node

// Simple test to demonstrate ESC functionality
const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing ESC functionality...');
console.log('');
console.log('Instructions:');
console.log('1. The interactive UI will start');
console.log('2. Select "Generate Tests" option');
console.log('3. In any text input prompt, type "ESC" and press Enter');
console.log('4. You should return to the main menu');
console.log('5. Press Ctrl+C to exit');
console.log('');
console.log('Starting test in 3 seconds...');

setTimeout(() => {
  const ui = spawn('node', [path.join(__dirname, 'interactive-ui.js')], {
    stdio: 'inherit'
  });

  ui.on('close', (code) => {
    console.log('\n✅ Test completed!');
    process.exit(code);
  });
}, 3000);
