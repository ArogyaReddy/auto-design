const { BaseStrategy } = require('./BaseStrategy');
const { StrategyError, ValidationError } = require('./ErrorHandler');

/**
 * Strategy Registry for managing test generation strategies
 */
class StrategyRegistry {
  constructor() {
    this.strategies = new Map();
    this.defaultStrategy = null;
  }

  /**
   * Register a strategy
   * @param {string} name - Strategy name
   * @param {BaseStrategy} strategyClass - Strategy class
   * @param {boolean} isDefault - Whether this is the default strategy
   */
  register(name, strategyClass, isDefault = false) {
    // Validate strategy class
    if (!strategyClass.prototype || !(strategyClass.prototype instanceof BaseStrategy)) {
      throw new StrategyError(`Strategy ${name} must extend BaseStrategy`);
    }

    this.strategies.set(name, {
      name,
      class: strategyClass,
      instance: null
    });

    if (isDefault || this.strategies.size === 1) {
      this.defaultStrategy = name;
    }
  }

  /**
   * Get a strategy instance
   * @param {string} name - Strategy name
   * @returns {BaseStrategy} Strategy instance
   */
  getStrategy(name) {
    const strategyInfo = this.strategies.get(name);
    if (!strategyInfo) {
      throw new StrategyError(`Strategy '${name}' not found. Available strategies: ${this.getAvailableStrategies().join(', ')}`);
    }

    // Create instance if not exists (lazy loading)
    if (!strategyInfo.instance) {
      try {
        strategyInfo.instance = new strategyInfo.class();
      } catch (error) {
        throw new StrategyError(`Failed to instantiate strategy '${name}': ${error.message}`);
      }
    }

    return strategyInfo.instance;
  }

  /**
   * Get the default strategy
   * @returns {BaseStrategy} Default strategy instance
   */
  getDefaultStrategy() {
    if (!this.defaultStrategy) {
      throw new StrategyError('No default strategy configured');
    }
    return this.getStrategy(this.defaultStrategy);
  }

  /**
   * Set the default strategy
   * @param {string} name - Strategy name
   */
  setDefaultStrategy(name) {
    if (!this.strategies.has(name)) {
      throw new StrategyError(`Cannot set '${name}' as default - strategy not registered`);
    }
    this.defaultStrategy = name;
  }

  /**
   * Get list of available strategy names
   * @returns {string[]} Array of strategy names
   */
  getAvailableStrategies() {
    return Array.from(this.strategies.keys());
  }

  /**
   * Check if a strategy is registered
   * @param {string} name - Strategy name
   * @returns {boolean} Whether strategy is registered
   */
  hasStrategy(name) {
    return this.strategies.has(name);
  }

  /**
   * Get strategy info without instantiating
   * @param {string} name - Strategy name
   * @returns {Object} Strategy information
   */
  getStrategyInfo(name) {
    const strategyInfo = this.strategies.get(name);
    if (!strategyInfo) {
      return null;
    }

    return {
      name: strategyInfo.name,
      className: strategyInfo.class.name,
      isInstantiated: !!strategyInfo.instance
    };
  }

  /**
   * Find the best strategy for given input type
   * @param {string} inputType - Type of input (url, file, jira, image, etc.)
   * @returns {BaseStrategy} Best matching strategy
   */
  findStrategyForInputType(inputType) {
    for (const [name, strategyInfo] of this.strategies) {
      try {
        const strategy = this.getStrategy(name);
        const supportedTypes = strategy.getSupportedInputTypes();
        if (supportedTypes.includes(inputType)) {
          return strategy;
        }
      } catch (error) {
        // Skip strategies that fail to instantiate
        continue;
      }
    }

    throw new StrategyError(`No strategy found for input type '${inputType}'`);
  }

  /**
   * Validate input against a strategy
   * @param {string} strategyName - Strategy name
   * @param {any} input - Input to validate
   * @returns {ValidationResult} Validation result
   */
  validateInput(strategyName, input) {
    const strategy = this.getStrategy(strategyName);
    return strategy.validate(input);
  }

  /**
   * Clear all registered strategies
   */
  clear() {
    this.strategies.clear();
    this.defaultStrategy = null;
  }

  /**
   * Unregister a strategy
   * @param {string} name - Strategy name
   */
  unregister(name) {
    if (this.defaultStrategy === name) {
      this.defaultStrategy = null;
    }
    this.strategies.delete(name);
  }
}

// Singleton instance
let registryInstance = null;

/**
 * Get the global strategy registry instance
 * @returns {StrategyRegistry} Registry instance
 */
function getStrategyRegistry() {
  if (!registryInstance) {
    registryInstance = new StrategyRegistry();
  }
  return registryInstance;
}

module.exports = { StrategyRegistry, getStrategyRegistry };
