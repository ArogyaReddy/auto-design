// cucumber.js (Final Verified Version)
module.exports = {
  default: {
    // This part tells Cucumber where to find all your code
    require: [
        'support/world.js',
        'support/hooks.js',
        'output/**/Steps/*.steps.js'
    ],
    // This part explicitly tells Cucumber to use the pretty formatter for beautiful output
    format: [
      '@cucumber/pretty-formatter'
    ],
  },
};