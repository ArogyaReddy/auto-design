module.exports = {
  default: {
    setDefaultTimeout: 60000, // Sets default timeout to 60 seconds
    require: [
        'support/world.js',
        'support/hooks.js'
        // NOTE: Individual step files are loaded per test to avoid conflicts
    ],
    format: ['@cucumber/pretty-formatter'],
  },
};