module.exports = {
    default: {
      require: [
          'support/world.js',
          'support/hooks.js',
          'output/**/Steps/*.steps.js'
      ],
      format: ['summary', 'progress-bar'],
    },
  };