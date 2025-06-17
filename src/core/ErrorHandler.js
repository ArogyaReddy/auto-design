/**
 * Custom error classes for the Auto-Design framework
 */

class AutoDesignError extends Error {
  constructor(message, code = 'AUTODESIGN_ERROR') {
    super(message);
    this.name = 'AutoDesignError';
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

class ValidationError extends AutoDesignError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.field = field;
  }
}

class StrategyError extends AutoDesignError {
  constructor(message, strategyName = null) {
    super(message, 'STRATEGY_ERROR');
    this.name = 'StrategyError';
    this.strategyName = strategyName;
  }
}

class FileSystemError extends AutoDesignError {
  constructor(message, path = null) {
    super(message, 'FILESYSTEM_ERROR');
    this.name = 'FileSystemError';
    this.path = path;
  }
}

class NetworkError extends AutoDesignError {
  constructor(message, url = null) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
    this.url = url;
  }
}

/**
 * Error Handler with logging and recovery strategies
 */
class ErrorHandler {
  constructor(logger = console) {
    this.logger = logger;
  }

  /**
   * Handle an error with appropriate logging and recovery
   * @param {Error} error - The error to handle
   * @param {Object} context - Additional context about the error
   * @returns {Object} Recovery options or null
   */
  handle(error, context = {}) {
    const errorInfo = {
      type: error.constructor.name,
      message: error.message,
      code: error.code || 'UNKNOWN',
      timestamp: new Date().toISOString(),
      context
    };

    // Log the error
    this.logger.error('Auto-Design Error:', errorInfo);

    // Return recovery suggestions based on error type
    return this._getRecoveryOptions(error);
  }

  /**
   * Wrap a function with error handling
   * @param {Function} fn - Function to wrap
   * @param {Object} context - Context for error handling
   * @returns {Function} Wrapped function
   */
  wrap(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handle(error, context);
        throw error;
      }
    };
  }

  _getRecoveryOptions(error) {
    switch (error.constructor.name) {
      case 'ValidationError':
        return {
          canRetry: true,
          suggestions: ['Check input format', 'Verify required fields']
        };
      case 'FileSystemError':
        return {
          canRetry: true,
          suggestions: ['Check file permissions', 'Verify path exists', 'Check disk space']
        };
      case 'NetworkError':
        return {
          canRetry: true,
          suggestions: ['Check internet connection', 'Verify URL', 'Check firewall settings']
        };
      case 'StrategyError':
        return {
          canRetry: false,
          suggestions: ['Try a different strategy', 'Check strategy configuration']
        };
      default:
        return {
          canRetry: false,
          suggestions: ['Check application logs', 'Contact support']
        };
    }
  }
}

module.exports = {
  AutoDesignError,
  ValidationError,
  StrategyError,
  FileSystemError,
  NetworkError,
  ErrorHandler
};
