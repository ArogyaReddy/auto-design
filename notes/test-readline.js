// Simple test for multi-line input
const readline = require('readline');

console.log('Testing multi-line input...');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

console.log('Type something and press Enter (type "done" to finish):');
rl.prompt();

rl.on('line', (input) => {
  if (input.trim().toLowerCase() === 'done') {
    console.log('✅ Test completed!');
    rl.close();
    process.exit(0);
  } else {
    console.log('You typed:', input);
    rl.prompt();
  }
});

rl.on('close', () => {
  console.log('Readline closed.');
  process.exit(0);
});
