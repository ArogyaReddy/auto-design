// Auto-Design Configuration File
// This file contains the default configuration for the Auto-Design framework
// You can override these settings with environment variables or command-line arguments

module.exports = {
  // Output configuration
  output: {
    baseDir: 'output',
    createSubfolders: true,
    openAfterGeneration: false
  },

  // Template configuration
  templates: {
    directory: 'src/templates'
  },

  // Playwright configuration
  playwright: {
    defaultUrl: process.env.APP_URL || 'https://online-iat.adp.com/signin/v1/?APPID=RUN&productId=7bf1242e-2ff0-e324-e053-37004b0bc98c',
    timeout: 60000,
    browser: 'chromium'
  },

  // JIRA configuration
  jira: {
    url: process.env.JIRA_URL || '',
    user: process.env.JIRA_USER || '',
    token: process.env.JIRA_API_TOKEN || ''
  },

  // Logging configuration
  logging: {
    level: 'info',
    file: null
  },

  // Strategy configuration
  strategies: {
    default: 'CodeGenStrategy',
    enabled: ['CodeGenStrategy', 'JiraStrategy']
  }
};
