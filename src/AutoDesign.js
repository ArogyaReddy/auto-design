const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');
const ora = require('ora');

const { getConfig } = require('./core/Config');
const { getStrategyRegistry } = require('./core/StrategyRegistry');
const { ErrorHandler, AutoDesignError } = require('./core/ErrorHandler');
const { FileManager } = require('./core/FileManager');
const { TestPlanValidator } = require('./core/TestPlanValidator');

/**
 * Main Auto-Design Framework Class
 */
class AutoDesign {
  constructor(strategy = null, options = {}) {
    this.config = getConfig();
    this.strategyRegistry = getStrategyRegistry();
    this.errorHandler = new ErrorHandler();
    this.fileManager = new FileManager(this.config);
    this.validator = new TestPlanValidator();
    this.templates = null;
    this.currentStrategy = strategy;
    
    // Validate configuration
    try {
      this.config.validate();
    } catch (error) {
      this.errorHandler.handle(error, { component: 'AutoDesign', action: 'constructor' });
      throw error;
    }

    // Load templates
    this._loadTemplates();
    
    // Register Handlebars helpers
    this._registerHandlebarsHelpers();
  }

  /**
   * Generate test files using the specified strategy
   * @param {any} input - Input for the strategy
   * @param {string} featureName - Name for the generated feature
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Generation result
   */
  async generate(input, featureName, options = {}) {
    const spinner = ora('Auto-Design is creating files... Please stand by.').start();
    
    try {
      // Determine strategy to use
      const strategy = this._getStrategy(options.strategy);
      
      // Create test plan
      const plan = await this.errorHandler.wrap(
        () => strategy.createTestPlan(input, featureName, options),
        { component: 'Strategy', strategyName: strategy.getName() }
      )();

      if (!plan) {
        spinner.warn('Strategy did not produce a valid plan. Skipping generation.');
        return { success: false, reason: 'No plan generated' };
      }

      // Validate test plan
      const validation = this.validator.validateWithSuggestions(plan);
      if (!validation.success) {
        spinner.fail('Test plan validation failed.');
        console.error('Validation errors:', validation.errors);
        throw new AutoDesignError(`Test plan validation failed: ${validation.errors.join(', ')}`);
      }

      // Show warnings if any
      if (validation.warnings.length > 0) {
        console.warn('⚠️  Validation warnings:', validation.warnings);
      }

      // Show suggestions if any
      if (validation.suggestions && validation.suggestions.length > 0) {
        console.log('💡 Suggestions:', validation.suggestions);
      }

      // Generate code
      const output = this._generateCode(plan);
      
      // Write files
      const writeResult = await this.fileManager.writeFiles(output, plan, options.outputDir);
      
      spinner.succeed(`Success! Test files generated in ${writeResult.outputDirectory}`);
      
      return {
        success: true,
        plan,
        validation,
        outputDirectory: writeResult.outputDirectory,
        filesCreated: writeResult.filesCreated
      };

    } catch (error) {
      spinner.fail('File generation failed.');
      this.errorHandler.handle(error, { 
        component: 'AutoDesign', 
        action: 'generate',
        input: typeof input === 'object' ? JSON.stringify(input) : input,
        featureName 
      });
      throw error;
    }
  }

  /**
   * Register a new strategy
   * @param {string} name - Strategy name
   * @param {BaseStrategy} strategyClass - Strategy class
   * @param {boolean} isDefault - Whether this is the default strategy
   */
  registerStrategy(name, strategyClass, isDefault = false) {
    this.strategyRegistry.register(name, strategyClass, isDefault);
  }

  /**
   * Get available strategies
   * @returns {string[]} Array of strategy names
   */
  getAvailableStrategies() {
    return this.strategyRegistry.getAvailableStrategies();
  }

  /**
   * Find the best strategy for input type
   * @param {string} inputType - Type of input
   * @returns {BaseStrategy} Best matching strategy
   */
  findStrategyForInputType(inputType) {
    return this.strategyRegistry.findStrategyForInputType(inputType);
  }

  _loadTemplates() {
    try {
      const templateDir = path.join(__dirname, 'templates');
      
      if (!fs.existsSync(templateDir)) {
        throw new AutoDesignError(`Template directory not found: ${templateDir}`);
      }

      this.templates = {
        feature: Handlebars.compile(fs.readFileSync(path.join(templateDir, 'feature.hbs'), 'utf8')),
        pageObject: Handlebars.compile(fs.readFileSync(path.join(templateDir, 'pageObject.hbs'), 'utf8')),
        steps: Handlebars.compile(fs.readFileSync(path.join(templateDir, 'steps.hbs'), 'utf8')),
        test: Handlebars.compile(fs.readFileSync(path.join(templateDir, 'test.hbs'), 'utf8'))
      };
    } catch (error) {
      throw new AutoDesignError(`Failed to load templates: ${error.message}`);
    }
  }

  _registerHandlebarsHelpers() {
    Handlebars.registerHelper('eq', (v1, v2) => v1 === v2);
    Handlebars.registerHelper('ne', (v1, v2) => v1 !== v2);
    Handlebars.registerHelper('includes', (array, value) => array && array.includes(value));
    Handlebars.registerHelper('capitalize', (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '');
    Handlebars.registerHelper('escapeSingleQuotes', (str) => str ? str.replace(/'/g, "\\'") : '');
  }

  _getStrategy(strategyName = null) {
    if (strategyName) {
      return this.strategyRegistry.getStrategy(strategyName);
    }
    
    if (this.currentStrategy) {
      return this.currentStrategy;
    }
    
    return this.strategyRegistry.getDefaultStrategy();
  }

  _generateCode(plan) {
    const safeFeatureName = this._toPascalCase(plan.featureName); // For filenames and folders (keeps prefix)
    const validJSFeatureName = this._toValidJSIdentifier(plan.featureName); // For JS identifiers (removes hyphen)
    const pageClassName = `${validJSFeatureName}Page`;
    const pageInstanceName = `${validJSFeatureName.charAt(0).toLowerCase() + validJSFeatureName.slice(1)}Page`;

    // Create unique steps for template to prevent duplicates
    const uniqueSteps = this._deduplicateSteps(plan.steps);

    return {
      feature: this.templates.feature({ ...plan, featureName: safeFeatureName }),
      pageObject: this.templates.pageObject({ 
        ...plan, 
        pageClassName: pageClassName, 
        featureName: safeFeatureName 
      }),
      steps: this.templates.steps({ 
        ...plan, 
        uniqueSteps: uniqueSteps, // Use uniqueSteps instead of steps
        pageClassName: pageClassName, 
        pageInstanceName: pageInstanceName, 
        featureName: safeFeatureName 
      }),
      test: this.templates.test({ 
        ...plan, 
        featureName: safeFeatureName, 
        scenarioName: plan.scenarioName 
      })
    };
  }

  /**
   * Remove duplicate steps to prevent "Multiple step definitions match" errors
   * @param {Array} steps - Original steps array
   * @returns {Array} Deduplicated steps array
   */
  _deduplicateSteps(steps) {
    const seen = new Set();
    const uniqueSteps = [];

    for (const step of steps) {
      const stepKey = step.text; // Use the step text as the unique key
      if (!seen.has(stepKey)) {
        seen.add(stepKey);
        uniqueSteps.push(step);
      }
    }

    console.log(`🔧 Deduplicated steps: ${steps.length} → ${uniqueSteps.length} (removed ${steps.length - uniqueSteps.length} duplicates)`);
    return uniqueSteps;
  }

  _toPascalCase(str) {
    if (!str) return 'DefaultFeature';
    
    // Check if the string starts with a prefix pattern (3-4 uppercase letters followed by hyphen)
    const prefixMatch = str.match(/^([A-Z]{3,4})-(.+)$/);
    
    if (prefixMatch) {
      // Preserve the prefix and hyphen, convert only the name part
      const prefix = prefixMatch[1];
      const namePart = prefixMatch[2];
      const pascalCaseName = namePart
        .replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '')
        .replace(/^\w/, c => c.toUpperCase());
      return `${prefix}-${pascalCaseName}`;
    }
    
    // Original behavior for strings without prefix
    return str
      .replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '')
      .replace(/^\w/, c => c.toUpperCase());
  }

  /**
   * Convert string to valid JavaScript identifier (PascalCase without hyphens)
   * @param {string} str - String to convert
   * @returns {string} Valid JavaScript identifier
   */
  _toValidJSIdentifier(str) {
    if (!str) return 'DefaultFeature';
    
    // Check if the string starts with a prefix pattern (3-4 uppercase letters followed by hyphen)
    const prefixMatch = str.match(/^([A-Z]{3,4})-(.+)$/);
    
    if (prefixMatch) {
      // Remove prefix and hyphen, convert only the name part to valid identifier
      const prefix = prefixMatch[1];
      const namePart = prefixMatch[2];
      const pascalCaseName = namePart
        .replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '')
        .replace(/^\w/, c => c.toUpperCase());
      return `${prefix}${pascalCaseName}`;
    }
    
    // Original behavior for strings without prefix - remove all non-alphanumeric characters
    return str
      .replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '')
      .replace(/^\w/, c => c.toUpperCase());
  }
}

module.exports = { AutoDesign };