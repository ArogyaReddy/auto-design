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
    console.log('🔍 Parsing user scenario with intelligent step extraction...');
    
    // First, extract the actual user flow steps from the text
    const extractedSteps = this._extractActualUserSteps(text);
    
    const analysis = {
      featureName: this._sanitizeFeatureName(featureName),
      scenarioName: this._generateScenarioName(text, extractedSteps),
      userStory: this._extractUserStory(text, extractedSteps),
      scenarios: [],
      locators: this._generateSmartLocators(text, extractedSteps),
      steps: extractedSteps,
      tags: this._extractTags(text),
      metadata: this._extractMetadata(text)
    };

    // Create the main scenario from extracted steps
    if (extractedSteps.length > 0) {
      analysis.scenarios = [{
        name: analysis.scenarioName,
        steps: extractedSteps,
        type: 'main'
      }];
    } else {
      // Fallback to old method if no steps extracted
      analysis.scenarios = this._extractScenarios(text);
      analysis.steps = this._generateStepsFromAnalysis(analysis, text);
    }

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
   * Extract actual user steps from scenario description
   */
  _extractActualUserSteps(text) {
    const steps = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let line of lines) {
      // Skip comments, feature declarations, and other non-step content
      if (this._shouldSkipLine(line)) {
        continue;
      }
      
      // Skip empty lines and very short lines
      if (line.length < 5) continue;
      
      // Clean up the line
      line = line.replace(/^\d+\.?\s*/, ''); // Remove numbers
      line = line.replace(/^[-*]\s*/, ''); // Remove bullets
      line = line.replace(/`$/, ''); // Remove trailing backticks
      line = line.charAt(0).toUpperCase() + line.slice(1); // Capitalize
      
      // Convert narrative text to user actions
      const userActions = this._convertNarrativeToActions(line);
      
      for (let actionText of userActions) {
        // Determine step keyword based on content
        let keyword = this._determineStepKeyword(actionText, steps);
        
        // Clean up step text to be more Gherkin-like
        let stepText = this._normalizeStepText(actionText);
        
        // Only add if it's a meaningful step
        if (this._isValidStep(stepText)) {
          steps.push({
            keyword: keyword,
            text: stepText,
            type: this._classifyStepType(stepText),
            originalLine: line
          });
        }
      }
    }
    
    // Fix step keywords to follow proper Gherkin flow
    this._fixStepKeywords(steps);
    
    return steps;
  }
  
  /**
   * Check if a line should be skipped during step extraction
   */
  _shouldSkipLine(line) {
    const lowerLine = line.toLowerCase().trim();
    
    // Skip comments
    if (line.startsWith('//') || line.startsWith('#')) {
      return true;
    }
    
    // Skip feature declarations
    if (lowerLine.startsWith('feature:')) {
      return true;
    }
    
    // Skip empty or very short lines
    if (line.length < 5) {
      return true;
    }
    
    // Skip file paths
    if (line.includes('/') && (line.includes('.txt') || line.includes('.js') || line.includes('.feature'))) {
      return true;
    }
    
    // Skip lines that look like metadata
    if (lowerLine.startsWith('scenario:') || lowerLine.startsWith('given:') || lowerLine.startsWith('when:') || lowerLine.startsWith('then:')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Convert narrative text into actionable user steps
   */
  _convertNarrativeToActions(text) {
    const actions = [];
    
    // Split on sentence boundaries but keep context
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    
    for (let sentence of sentences) {
      // Convert third-person narrative to first-person actions
      sentence = this._convertToFirstPerson(sentence);
      
      // Split complex sentences into multiple actions
      const subActions = this._splitComplexActions(sentence);
      actions.push(...subActions);
    }
    
    return actions.filter(action => action.length > 0);
  }
  
  /**
   * Convert third-person narrative to first-person user actions
   */
  _convertToFirstPerson(text) {
    let converted = text;
    
    // Convert "Alex does X" to "I do X" and fix verb forms
    converted = converted.replace(/^(Alex|the user|user)\s+(can\s+)?/i, 'I ');
    converted = converted.replace(/^When\s+(Alex|the user|user)\s+/i, 'I ');
    
    // Fix verb forms after converting to first person
    converted = converted.replace(/^I\s+logs\s+/i, 'I log ');
    converted = converted.replace(/^I\s+continues\s+/i, 'I continue ');
    converted = converted.replace(/^I\s+provides\s+/i, 'I provide ');
    converted = converted.replace(/^I\s+uploads\s+/i, 'I upload ');
    converted = converted.replace(/^I\s+reviews\s+/i, 'I review ');
    converted = converted.replace(/\btheir\b/gi, 'my');
    
    // Convert "Initial model is loaded" to "I see initial model loaded"
    if (converted.toLowerCase().includes('is loaded') || converted.toLowerCase().includes('model is')) {
      converted = converted.replace(/^(Initial\s+)?(.+?)\s+is\s+loaded/i, 'I see $2 loaded');
    }
    
    // Convert passive descriptions to active user actions
    converted = converted.replace(/^(.+?)\s+indicating that the user can\s+(.+)/i, 'I can $2');
    converted = converted.replace(/with a "([^"]+)"/i, 'with a $1 option');
    
    return converted.trim();
  }
  
  /**
   * Split complex sentences into multiple user actions
   */
  _splitComplexActions(text) {
    const actions = [];
    
    // Handle special cases first
    if (text.toLowerCase().includes('such as') || text.toLowerCase().includes('including')) {
      // Split lists but keep context
      const mainAction = text.split(/,?\s*such as\s+|,?\s*including\s+/i)[0];
      const items = text.split(/,?\s*such as\s+|,?\s*including\s+/i)[1];
      
      if (mainAction && mainAction.length > 0) {
        actions.push(mainAction.trim());
      }
      
      if (items) {
        // Don't create separate steps for list items unless they're complete actions
        if (items.match(/^(bank statements|tax returns|financial documents)/i)) {
          // These are just examples, include with main action
          if (actions.length > 0) {
            actions[actions.length - 1] += ` such as ${items.trim()}`;
          }
        } else {
          actions.push(items.trim());
        }
      }
    } else {
      // Split on conjunctions that indicate separate actions
      const parts = text.split(/,\s*and\s+(?=(?:Alex|I|the user|user)\s+)/i);
      
      if (parts.length === 1) {
        // No clear splits, just clean up the text
        let cleaned = text.trim();
        if (cleaned.length > 0 && this._isActionableText(cleaned)) {
          actions.push(cleaned);
        }
      } else {
        // Multiple parts found
        for (let part of parts) {
          part = part.trim();
          if (part.length > 0 && this._isActionableText(part)) {
            // Clean up fragments
            if (!part.match(/^(I|Alex|the user|user)\s+/i) && part.match(/^(provide|upload|review|confirm|continue)/i)) {
              part = 'I ' + part;
            }
            actions.push(part);
          }
        }
      }
    }
    
    return actions.filter(action => action.length > 0);
  }
  
  /**
   * Check if text represents an actionable user step
   */
  _isActionableText(text) {
    const lowerText = text.toLowerCase();
    
    // Should contain action verbs or be meaningful user steps
    const actionWords = ['log', 'click', 'upload', 'provide', 'continue', 'review', 'confirm', 'see', 'start', 'enter', 'select', 'navigate'];
    const hasAction = actionWords.some(word => lowerText.includes(word));
    
    // Filter out fragments that are just descriptive lists
    const isJustList = lowerText.match(/^(company name|address|contact|bank statements|tax returns|documents)$/);
    
    return hasAction && !isJustList && text.length > 3;
  }
  
  /**
   * Determine the appropriate step keyword
   */
  _determineStepKeyword(text, existingSteps) {
    const lowerText = text.toLowerCase();
    
    // Given patterns (setup/preconditions)
    if (lowerText.match(/^(i am|i'm|i start|i begin|initially|first)/)) {
      return 'Given';
    }
    
    // Then patterns (verification/outcomes)  
    if (lowerText.match(/^(i see|i should see|i expect|i can see|i verify|i check|i confirm)/)) {
      return 'Then';
    }
    
    // When patterns (actions) - default for most actions
    if (lowerText.match(/^(i click|i select|i enter|i type|i fill|i navigate|i go|i press|i choose|i upload|i download|i provide|i continue|i can)/)) {
      return 'When';
    }
    
    // Use And for continuation of similar step types
    if (existingSteps.length > 0) {
      const lastStep = existingSteps[existingSteps.length - 1];
      if (lastStep.keyword === 'When' && lowerText.match(/^i\s+(can|upload|provide|review)/)) {
        return 'And';
      }
    }
    
    // Default to When for actions
    return 'When';
  }
  
  /**
   * Check if a step text is valid and meaningful
   */
  _isValidStep(stepText) {
    const lowerText = stepText.toLowerCase();
    
    // Too short
    if (stepText.length < 5) return false;
    
    // Just punctuation or fragments
    if (!stepText.match(/[a-zA-Z]/)) return false;
    
    // Common invalid patterns
    if (lowerText.match(/^(feature|scenario|given|when|then|and|but)[:.]?\s*$/)) return false;
    
    // File paths
    if (stepText.includes('/') && stepText.includes('.')) return false;
    
    return true;
  }
  
  /**
   * Fix step keywords to follow proper Gherkin flow
   */
  _fixStepKeywords(steps) {
    if (steps.length === 0) return;
    
    // First step should usually be Given (unless it's clearly an action)
    if (steps[0].keyword === 'When' && steps[0].text.toLowerCase().match(/^i\s+(am|start|begin)/)) {
      steps[0].keyword = 'Given';
    }
    
    // Fix subsequent steps
    for (let i = 1; i < steps.length; i++) {
      const current = steps[i];
      const previous = steps[i - 1];
      
      // Convert subsequent similar actions to And
      if (current.keyword === previous.keyword && current.keyword !== 'Given') {
        current.keyword = 'And';
      }
    }
  }
  
  /**
   * Normalize step text to be more Gherkin-friendly
   */
  _normalizeStepText(text) {
    let normalized = text;
    
    // Convert to first person if needed
    normalized = normalized.replace(/^user /i, 'I ');
    normalized = normalized.replace(/^the user /i, 'I ');
    
    // Fix common patterns
    normalized = normalized.replace(/^i'm in /i, 'I am on the ');
    normalized = normalized.replace(/^iam in /i, 'I am on the ');
    normalized = normalized.replace(/^i am in /i, 'I am on the ');
    normalized = normalized.replace(/(\w+) page is loaded/i, '$1 page loads');
    normalized = normalized.replace(/(\w+) page is laoded/i, '$1 page loads'); // Fix typo
    normalized = normalized.replace(/i see (\w+) running status/i, 'I see the $1 running status');
    normalized = normalized.replace(/once finished, i see/i, 'I see');
    normalized = normalized.replace(/sucesfully/i, 'successfully'); // Fix typo
    
    // Ensure it doesn't end with a period if it's a step
    normalized = normalized.replace(/\.$/, '');
    
    return normalized;
  }

  /**
   * Extract user story using pattern matching with context from steps
   */
  _extractUserStory(text, extractedSteps = []) {
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
   * Infer user story from context clues and extracted steps
   */
  _inferUserStoryFromContext(text, extractedSteps = []) {
    const lowerText = text.toLowerCase();
    
    // Analyze extracted steps to understand the flow
    const stepTexts = extractedSteps.map(step => step.text.toLowerCase()).join(' ');
    const combinedText = (lowerText + ' ' + stepTexts).toLowerCase();
    
    // Common application contexts with enhanced payroll support
    const contexts = [
      {
        keywords: ['payroll', 'run payroll', 'payroll menu', 'salary', 'wages', 'pay'],
        actor: 'HR administrator',
        action: 'process payroll operations',
        benefit: 'ensure employees are paid accurately and on time'
      },
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
      },
      {
        keywords: ['menu', 'navigate', 'home page', 'click'],
        actor: 'user',
        action: 'navigate through the application',
        benefit: 'access different features and functionalities'
      }
    ];

    for (const context of contexts) {
      if (context.keywords.some(keyword => combinedText.includes(keyword))) {
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
  _generateScenarioName(text, extractedSteps = []) {
    const lowerText = text.toLowerCase();
    
    // Look for explicit scenario names
    const scenarioMatch = text.match(/scenario[:\s]*(.+?)(?:\n|$)/i);
    if (scenarioMatch) {
      return scenarioMatch[1].trim();
    }

    // Use extracted steps to generate a meaningful scenario name
    if (extractedSteps.length > 0) {
      const actionSteps = extractedSteps.filter(step => 
        step.keyword === 'When' || step.keyword === 'And' && step.text.toLowerCase().includes('click')
      );
      
      if (actionSteps.length > 0) {
        const firstAction = actionSteps[0].text.toLowerCase();
        
        // Payroll-specific scenarios
        if (firstAction.includes('payroll')) {
          return 'Process payroll workflow';
        }
        
        // Navigation scenarios
        if (firstAction.includes('menu') || firstAction.includes('navigate')) {
          return 'Navigate and interact with application features';
        }
        
        // Form scenarios
        if (firstAction.includes('fill') || firstAction.includes('enter')) {
          return 'Complete data entry workflow';
        }
      }
    }

    // Generate based on content context (fallback)
    if (lowerText.includes('payroll')) {
      return 'Process payroll workflow';
    }
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
  _generateSmartLocators(text, extractedSteps = []) {
    const locators = [];
    const lowerText = text.toLowerCase();
    
    // Extract locators from steps
    const stepTexts = extractedSteps.map(step => step.text.toLowerCase()).join(' ');
    const combinedText = lowerText + ' ' + stepTexts;
    
    // Common UI patterns and their locators with payroll support
    const patterns = [
      {
        keywords: ['payroll menu', 'payroll', 'menu'],
        locator: "getByRole('link', { name: /payroll/i })",
        name: 'payrollMenuLink',
        type: 'link'
      },
      {
        keywords: ['run payroll', 'payroll button'],
        locator: "getByRole('button', { name: /run payroll/i })",
        name: 'runPayrollButton',
        type: 'button'
      },
      {
        keywords: ['home page', 'home', 'back'],
        locator: "getByRole('link', { name: /home/i })",
        name: 'homeLink',
        type: 'link'
      },
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
      if (pattern.keywords.some(keyword => combinedText.includes(keyword))) {
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
