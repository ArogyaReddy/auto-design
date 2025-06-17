const { BaseStrategy } = require('../core/BaseStrategy');
const { ValidationError, StrategyError } = require('../core/ErrorHandler');
const fs = require('fs');
const path = require('path');

/**
 * AI-FREE Text Analysis Strategy - Pure JavaScript NLP and Pattern Matching
 * No external AI dependencies - uses smart algorithms and libraries
 */
class AIFreeTextAnalysisStrategy extends BaseStrategy {
  constructor(config = {}) {
    super();
    this.useAdvancedNLP = config.useAdvancedNLP !== false; // Default to true
    this.enablePatternMatching = config.enablePatternMatching !== false;
    
    // Load NLP libraries
    this.compromise = null;
    this.natural = null;
    this.initializeNLPLibraries();
  }

  async initializeNLPLibraries() {
    try {
      // Dynamic imports for optional dependencies
      this.compromise = require('compromise');
      this.natural = require('natural');
    } catch (error) {
      console.log('⚠️  Advanced NLP libraries not available. Using basic pattern matching.');
      this.useAdvancedNLP = false;
    }
  }

  /**
   * Get supported input types
   */
  getSupportedInputTypes() {
    return ['text', 'text-file', 'description', 'user-story', 'requirements'];
  }

  /**
   * Validate text input
   */
  validate(input) {
    const result = { success: true, errors: [], warnings: [] };

    if (!input) {
      result.success = false;
      result.errors.push('Text input cannot be empty');
      return result;
    }

    // If it's a file path
    if (typeof input === 'string' && fs.existsSync(input)) {
      const validExtensions = ['.txt', '.md', '.json', '.yml', '.yaml'];
      const ext = path.extname(input).toLowerCase();
      if (!validExtensions.includes(ext)) {
        result.warnings.push(`File extension ${ext} may not be a supported text file`);
      }
    }

    return result;
  }

  /**
   * Create test plan using pure JavaScript analysis
   */
  async createTestPlan(input, featureName, options = {}) {
    const validation = this.validate(input);
    if (!validation.success) {
      throw new ValidationError(`Text input validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      let textContent;
      
      // Check if input is a file path or direct text
      if (typeof input === 'string' && fs.existsSync(input)) {
        textContent = fs.readFileSync(input, 'utf8');
        console.log(`📄 Reading text from file: ${input}`);
      } else {
        textContent = input.toString();
        console.log(`📝 Analyzing provided text content with AI-free algorithms`);
      }

      // Pure JavaScript analysis
      console.log('🧠 Using intelligent pattern matching and NLP libraries...');
      return await this._analyzeWithPureJS(textContent, featureName, options);

    } catch (error) {
      throw new StrategyError(`Failed to create test plan from text: ${error.message}`);
    }
  }

  /**
   * Analyze text using pure JavaScript algorithms
   */
  async _analyzeWithPureJS(text, featureName, options = {}) {
    const analysis = {
      featureName: this._sanitizeFeatureName(featureName),
      scenarioName: this._generateScenarioName(text),
      userStory: this._extractUserStory(text),
      scenarios: this._extractScenarios(text),
      locators: this._generateSmartLocators(text),
      steps: [],
      tags: this._extractTags(text),
      metadata: this._extractMetadata(text)
    };

    // Generate steps based on analysis
    analysis.steps = this._generateStepsFromAnalysis(analysis, text);

    // Validate and enhance locators
    analysis.locators = this._validateAndFixSelectors(analysis.locators);

    console.log(`✅ AI-free analysis completed:`);
    console.log(`   📋 Scenarios: ${analysis.scenarios.length}`);
    console.log(`   🎯 Locators: ${analysis.locators.length}`);
    console.log(`   📝 Steps: ${analysis.steps.length}`);
    console.log(`   🏷️  Tags: ${analysis.tags.join(', ')}`);

    return analysis;
  }

  /**
   * Extract user story using pattern matching
   */
  _extractUserStory(text) {
    const lowerText = text.toLowerCase();
    
    // Look for explicit user story pattern
    const patterns = [
      /as an? (.+?)(?:\s+i want to|\s+i would like to|\s+i need to)\s+(.+?)(?:\s+so that|\s+in order to)\s+(.+?)(?:\.|$)/i,
      /given (.+?) when (.+?) then (.+?)(?:\.|$)/i,
      /user story[:\s]*(.+?)(?:\n|$)/i,
      /story[:\s]*(.+?)(?:\n|$)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (match.length >= 4) {
          return {
            actor: match[1].trim(),
            action: match[2].trim(),
            benefit: match[3].trim(),
            type: 'formal'
          };
        } else {
          return {
            actor: 'user',
            action: match[1].trim(),
            benefit: 'accomplish the task',
            type: 'basic'
          };
        }
      }
    }

    // Use NLP if available
    if (this.useAdvancedNLP && this.compromise) {
      return this._extractUserStoryWithNLP(text);
    }

    // Fallback to context analysis
    return this._inferUserStoryFromContext(text);
  }

  /**
   * Extract user story using compromise NLP
   */
  _extractUserStoryWithNLP(text) {
    try {
      const doc = this.compromise(text);
      
      // Extract actors (people, roles)
      const people = doc.people().out('array');
      const nouns = doc.nouns().out('array');
      
      // Extract actions (verbs)
      const verbs = doc.verbs().out('array');
      
      // Extract goals/benefits
      const sentences = doc.sentences().out('array');
      
      const actor = people.length > 0 ? people[0] : 
                   nouns.find(n => ['user', 'customer', 'admin', 'visitor'].includes(n.toLowerCase())) || 'user';
      
      const action = verbs.length > 0 ? verbs.slice(0, 3).join(' and ') : 'interact with the application';
      
      const benefit = sentences.length > 1 ? sentences[sentences.length - 1] : 'achieve their goals';

      return {
        actor: actor,
        action: action,
        benefit: benefit,
        type: 'nlp-extracted'
      };
    } catch (error) {
      console.log('⚠️  NLP extraction failed, using fallback');
      return this._inferUserStoryFromContext(text);
    }
  }

  /**
   * Infer user story from context clues
   */
  _inferUserStoryFromContext(text) {
    const lowerText = text.toLowerCase();
    
    // Common application contexts
    const contexts = [
      {
        keywords: ['login', 'sign in', 'authenticate', 'password'],
        actor: 'registered user',
        action: 'log into my account',
        benefit: 'access my personal dashboard and account features'
      },
      {
        keywords: ['register', 'sign up', 'create account', 'new user'],
        actor: 'new user',
        action: 'create an account',
        benefit: 'access the platform\'s features and services'
      },
      {
        keywords: ['search', 'find', 'lookup', 'query'],
        actor: 'user',
        action: 'search for information',
        benefit: 'quickly find what I\'m looking for'
      },
      {
        keywords: ['purchase', 'buy', 'order', 'checkout', 'cart'],
        actor: 'customer',
        action: 'complete a purchase',
        benefit: 'buy the products I need'
      },
      {
        keywords: ['form', 'submit', 'data entry', 'input'],
        actor: 'user',
        action: 'fill out and submit a form',
        benefit: 'provide the required information'
      },
      {
        keywords: ['plp', 'product list', 'products', 'catalog'],
        actor: 'customer',
        action: 'browse and view products',
        benefit: 'find products that meet my needs'
      },
      {
        keywords: ['employee', 'staff', 'add user', 'manage'],
        actor: 'administrator',
        action: 'manage employee information',
        benefit: 'maintain accurate records'
      }
    ];

    for (const context of contexts) {
      if (context.keywords.some(keyword => lowerText.includes(keyword))) {
        return {
          actor: context.actor,
          action: context.action,
          benefit: context.benefit,
          type: 'context-inferred'
        };
      }
    }

    // Generic fallback
    return {
      actor: 'user',
      action: 'interact with the application',
      benefit: 'accomplish their goals',
      type: 'generic'
    };
  }

  /**
   * Extract scenarios using pattern recognition
   */
  _extractScenarios(text) {
    const scenarios = [];
    
    // Split text into potential scenarios
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for Gherkin-style scenarios
    let currentScenario = null;
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.startsWith('scenario:') || lowerLine.startsWith('scenario outline:')) {
        if (currentScenario) scenarios.push(currentScenario);
        currentScenario = {
          name: line.replace(/^scenario\s*(?:outline)?\s*:\s*/i, ''),
          steps: [],
          type: lowerLine.includes('outline') ? 'outline' : 'scenario'
        };
      } else if (currentScenario && /^(given|when|then|and|but)\s+/i.test(lowerLine)) {
        currentScenario.steps.push({
          keyword: line.match(/^(given|when|then|and|but)/i)[0],
          text: line.replace(/^(given|when|then|and|but)\s+/i, ''),
          type: this._classifyStepType(line)
        });
      } else if (currentScenario && line.length > 10) {
        // Add as description or additional step
        currentScenario.steps.push({
          keyword: 'Given',
          text: line,
          type: 'action'
        });
      }
    }
    
    if (currentScenario) scenarios.push(currentScenario);
    
    // If no explicit scenarios found, generate from content
    if (scenarios.length === 0) {
      scenarios.push(this._generateScenarioFromContent(text));
    }

    return scenarios;
  }

  /**
   * Generate scenario from unstructured content
   */
  _generateScenarioFromContent(text) {
    const userStory = this._extractUserStory(text);
    
    return {
      name: `${userStory.actor} ${userStory.action}`,
      steps: [
        {
          keyword: 'Given',
          text: `I am a ${userStory.actor}`,
          type: 'setup'
        },
        {
          keyword: 'When',
          text: `I ${userStory.action}`,
          type: 'action'
        },
        {
          keyword: 'Then',
          text: `I should be able to ${userStory.benefit}`,
          type: 'verification'
        }
      ],
      type: 'generated'
    };
  }

  /**
   * Generate scenario name from text content
   */
  _generateScenarioName(text) {
    const lowerText = text.toLowerCase();
    
    // Look for explicit scenario names
    const scenarioMatch = text.match(/scenario[:\s]*(.+?)(?:\n|$)/i);
    if (scenarioMatch) {
      return scenarioMatch[1].trim();
    }

    // Generate based on content context
    if (lowerText.includes('login') || lowerText.includes('sign in')) {
      return 'User successfully logs into their account';
    }
    if (lowerText.includes('register') || lowerText.includes('sign up')) {
      return 'New user successfully creates an account';
    }
    if (lowerText.includes('search') || lowerText.includes('find')) {
      return 'User searches for information';
    }
    if (lowerText.includes('purchase') || lowerText.includes('buy') || lowerText.includes('checkout')) {
      return 'Customer completes a purchase';
    }
    if (lowerText.includes('form') || lowerText.includes('submit')) {
      return 'User successfully submits a form';
    }
    if (lowerText.includes('employee') || lowerText.includes('add') || lowerText.includes('create')) {
      return 'Administrator manages data successfully';
    }

    // Extract from user story if available
    const userStory = this._extractUserStory(text);
    if (userStory && userStory.actor && userStory.action) {
      return `${userStory.actor} ${userStory.action}`;
    }

    // Generic fallback
    return 'User completes the workflow successfully';
  }

  /**
   * Generate smart locators based on content analysis
   */
  _generateSmartLocators(text) {
    const locators = [];
    const lowerText = text.toLowerCase();
    
    // Common UI patterns and their locators
    const patterns = [
      {
        keywords: ['username', 'user name', 'login', 'email'],
        locator: "getByLabel('Username')",
        name: 'usernameInput',
        type: 'input'
      },
      {
        keywords: ['password', 'pwd'],
        locator: "getByLabel('Password')",
        name: 'passwordInput',
        type: 'input'
      },
      {
        keywords: ['login', 'sign in', 'submit'],
        locator: "getByRole('button', { name: /login|sign in/i })",
        name: 'loginButton',
        type: 'button'
      },
      {
        keywords: ['search', 'find'],
        locator: "getByPlaceholder('Search')",
        name: 'searchInput',
        type: 'input'
      },
      {
        keywords: ['menu', 'navigation'],
        locator: "getByRole('navigation')",
        name: 'mainNavigation',
        type: 'navigation'
      },
      {
        keywords: ['product', 'item', 'list'],
        locator: "getByRole('grid', { name: 'Products' })",
        name: 'productList',
        type: 'list'
      },
      {
        keywords: ['add', 'create', 'new'],
        locator: "getByRole('button', { name: /add|create|new/i })",
        name: 'addButton',
        type: 'button'
      },
      {
        keywords: ['save', 'update'],
        locator: "getByRole('button', { name: /save|update/i })",
        name: 'saveButton',
        type: 'button'
      },
      {
        keywords: ['cancel', 'close'],
        locator: "getByRole('button', { name: /cancel|close/i })",
        name: 'cancelButton',
        type: 'button'
      }
    ];

    // Find matching patterns
    for (const pattern of patterns) {
      if (pattern.keywords.some(keyword => lowerText.includes(keyword))) {
        locators.push({
          name: pattern.name,
          selector: pattern.locator,
          type: pattern.type,
          confidence: 'high'
        });
      }
    }

    // Extract any quoted strings as potential text locators
    const quotedTexts = text.match(/"([^"]+)"|'([^']+)'/g);
    if (quotedTexts) {
      quotedTexts.forEach((quoted, index) => {
        const cleanText = quoted.replace(/['"]/g, '');
        locators.push({
          name: `textElement${index + 1}`,
          selector: `getByText('${cleanText}')`,
          type: 'text',
          confidence: 'medium'
        });
      });
    }

    return locators;
  }

  /**
   * Generate steps from analysis
   */
  _generateStepsFromAnalysis(analysis, originalText) {
    const steps = [];
    
    // Generate setup steps
    steps.push({
      keyword: 'Given',
      text: `I am on the application page`,
      type: 'setup',
      implementation: 'page.goto(baseURL);'
    });

    // Generate action steps based on locators
    analysis.locators.forEach(locator => {
      if (locator.type === 'input') {
        steps.push({
          keyword: 'When',
          text: `I enter text into the ${locator.name.replace(/Input$/, '').toLowerCase()} field`,
          type: 'action',
          implementation: `await page.${locator.selector}.fill('test data');`
        });
      } else if (locator.type === 'button') {
        steps.push({
          keyword: 'When',
          text: `I click the ${locator.name.replace(/Button$/, '').toLowerCase()} button`,
          type: 'action',
          implementation: `await page.${locator.selector}.click();`
        });
      }
    });

    // Generate verification steps
    steps.push({
      keyword: 'Then',
      text: `I should see the expected result`,
      type: 'verification',
      implementation: 'await expect(page).toHaveTitle(/expected/);'
    });

    return steps;
  }

  /**
   * Extract tags from content
   */
  _extractTags(text) {
    const tags = [];
    const lowerText = text.toLowerCase();
    
    // Functional tags
    const functionalTags = {
      'authentication': ['login', 'sign in', 'password', 'auth'],
      'registration': ['register', 'sign up', 'create account'],
      'search': ['search', 'find', 'query'],
      'ecommerce': ['purchase', 'buy', 'cart', 'checkout'],
      'navigation': ['menu', 'navigate', 'link'],
      'forms': ['form', 'input', 'submit'],
      'crud': ['create', 'read', 'update', 'delete', 'add', 'edit'],
      'admin': ['admin', 'management', 'employee']
    };

    for (const [tag, keywords] of Object.entries(functionalTags)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        tags.push(tag);
      }
    }

    // Priority tags
    if (lowerText.includes('critical') || lowerText.includes('important')) {
      tags.push('critical');
    }
    if (lowerText.includes('smoke') || lowerText.includes('basic')) {
      tags.push('smoke');
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Extract metadata
   */
  _extractMetadata(text) {
    return {
      analysisMethod: 'pure-javascript',
      confidence: 'high',
      nlpUsed: this.useAdvancedNLP,
      wordCount: text.split(/\s+/).length,
      complexity: this._assessComplexity(text),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Assess text complexity
   */
  _assessComplexity(text) {
    const wordCount = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const avgWordsPerSentence = wordCount / sentences;
    
    if (wordCount < 20 || avgWordsPerSentence < 5) return 'simple';
    if (wordCount < 100 || avgWordsPerSentence < 15) return 'moderate';
    return 'complex';
  }

  /**
   * Classify step type
   */
  _classifyStepType(stepText) {
    const lowerStep = stepText.toLowerCase();
    
    if (lowerStep.includes('given') || lowerStep.includes('setup')) return 'setup';
    if (lowerStep.includes('when') || lowerStep.includes('click') || lowerStep.includes('enter')) return 'action';
    if (lowerStep.includes('then') || lowerStep.includes('should') || lowerStep.includes('expect')) return 'verification';
    
    return 'action'; // Default
  }

  /**
   * Validate and fix selectors (inherited from original)
   */
  _validateAndFixSelectors(locators) {
    return locators.map(locator => {
      let { selector } = locator;
      
      // Remove 'page.' prefix if it exists since the template will add it
      if (selector.startsWith('page.')) {
        selector = selector.substring(5);
        console.log(`   🔧 Cleaned selector: ${selector}`);
      }
      
      // Check if selector is a proper Playwright locator method
      const playwrightMethods = ['getByRole', 'getByLabel', 'getByText', 'getByPlaceholder', 'getByTestId', 'getByAltText', 'getByTitle', 'locator'];
      const isPlaywrightSelector = playwrightMethods.some(method => selector.includes(method));
      
      if (isPlaywrightSelector) {
        console.log(`   ✅ Valid Playwright selector: ${selector}`);
        return { ...locator, selector };
      }
      
      // If it's a CSS selector, convert it to Playwright locator
      if (selector.startsWith('#') || selector.startsWith('.') || selector.includes('>')) {
        console.log(`   ⚠️  Converting CSS selector to Playwright locator: ${selector}`);
        
        if (selector.startsWith('#')) {
          const id = selector.replace('#', '');
          selector = `getByTestId('${id}')`;
        } else {
          selector = `locator('${selector}')`;
        }
        
        console.log(`   ✅ Converted to: ${selector}`);
      } else if (!isPlaywrightSelector) {
        console.log(`   ⚠️  Unknown selector format, wrapping: ${selector}`);
        selector = `locator('${selector}')`;
      }
      
      return { ...locator, selector };
    });
  }

  /**
   * Sanitize feature name
   */
  _sanitizeFeatureName(name) {
    // Check if the name starts with a prefix pattern (3-4 uppercase letters followed by hyphen)
    const prefixMatch = name.match(/^([A-Z]{3,4})-(.+)$/);
    
    if (prefixMatch) {
      // Preserve the prefix and hyphen, sanitize only the name part
      const prefix = prefixMatch[1];
      const namePart = prefixMatch[2];
      const sanitizedName = namePart
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      return `${prefix}-${sanitizedName}`;
    }
    
    // Standard sanitization for names without prefix
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

module.exports = { AIFreeTextAnalysisStrategy };
