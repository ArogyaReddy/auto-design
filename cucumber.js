module.exports = {
  default: {
    setDefaultTimeout: 60000, // Sets default timeout to 60 seconds
    require: [
        'support/world.js',
        'support/hooks.js',
        'output/**/Steps/*.steps.js'
    ],
    format: ['@cucumber/pretty-formatter'],
  },
};