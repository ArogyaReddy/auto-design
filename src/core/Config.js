const fs = require('fs-extra');
const path = require('path');
const { ValidationError } = require('./ErrorHandler');

/**
 * Configuration Management System
 */
class Config {
  constructor() {
    this.config = {};
    this.defaults = {
      output: {
        baseDir: 'output',
        createSubfolders: true,
        openAfterGeneration: true
      },
      templates: {
        directory: 'src/templates'
      },
      playwright: {
        defaultUrl: 'https://example.com',
        timeout: 30000,
        browser: 'chromium'
      },
      jira: {
        url: process.env.JIRA_URL || '',
        user: process.env.JIRA_USER || '',
        token: process.env.JIRA_API_TOKEN || ''
      },
      logging: {
        level: 'info',
        file: null
      },
      strategies: {
        default: 'CodeGenStrategy',
        enabled: ['CodeGenStrategy', 'JiraStrategy', 'ImageScanStrategy']
      }
    };
    this.loadConfig();
  }

  /**
   * Load configuration from file or environment
   */
  loadConfig() {
    // Load from config file if it exists
    const configPath = path.join(process.cwd(), 'autodesign.config.js');
    if (fs.existsSync(configPath)) {
      try {
        const fileConfig = require(configPath);
        this.config = this._mergeDeep(this.defaults, fileConfig);
      } catch (error) {
        console.warn('Failed to load config file, using defaults:', error.message);
        this.config = { ...this.defaults };
      }
    } else {
      this.config = { ...this.defaults };
    }

    // Override with environment variables
    this._loadFromEnvironment();
  }

  /**
   * Get a configuration value
   * @param {string} key - Dot-notation key (e.g., 'output.baseDir')
   * @param {any} defaultValue - Default value if key not found
   * @returns {any} Configuration value
   */
  get(key, defaultValue = null) {
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  /**
   * Set a configuration value
   * @param {string} key - Dot-notation key
   * @param {any} value - Value to set
   */
  set(key, value) {
    const keys = key.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * Validate configuration
   * @throws {ValidationError} If configuration is invalid
   */
  validate() {
    const errors = [];

    // Validate required paths
    const templateDir = this.get('templates.directory');
    if (!fs.existsSync(templateDir)) {
      errors.push(`Template directory not found: ${templateDir}`);
    }

    // Validate Jira configuration if strategies include JiraStrategy
    if (this.get('strategies.enabled', []).includes('JiraStrategy')) {
      if (!this.get('jira.url')) {
        errors.push('JIRA URL is required when JiraStrategy is enabled');
      }
      if (!this.get('jira.user') || !this.get('jira.token')) {
        errors.push('JIRA user and token are required when JiraStrategy is enabled');
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Get all configuration
   * @returns {Object} Complete configuration object
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Save current configuration to file
   * @param {string} filePath - Optional file path, defaults to autodesign.config.js
   */
  save(filePath = null) {
    const targetPath = filePath || path.join(process.cwd(), 'autodesign.config.js');
    const configContent = `module.exports = ${JSON.stringify(this.config, null, 2)};`;
    fs.writeFileSync(targetPath, configContent);
  }

  _loadFromEnvironment() {
    // Map environment variables to config keys
    const envMappings = {
      'AUTODESIGN_OUTPUT_DIR': 'output.baseDir',
      'AUTODESIGN_TEMPLATE_DIR': 'templates.directory',
      'PLAYWRIGHT_TIMEOUT': 'playwright.timeout',
      'JIRA_URL': 'jira.url',
      'JIRA_USER': 'jira.user',
      'JIRA_API_TOKEN': 'jira.token',
      'LOG_LEVEL': 'logging.level'
    };

    for (const [envVar, configKey] of Object.entries(envMappings)) {
      if (process.env[envVar]) {
        this.set(configKey, process.env[envVar]);
      }
    }
  }

  _mergeDeep(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this._mergeDeep(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}

// Singleton instance
let configInstance = null;

/**
 * Get the global configuration instance
 * @returns {Config} Configuration instance
 */
function getConfig() {
  if (!configInstance) {
    configInstance = new Config();
  }
  return configInstance;
}

module.exports = { Config, getConfig };
