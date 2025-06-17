const { BaseStrategy } = require('../core/BaseStrategy');
const { ValidationError, StrategyError } = require('../core/ErrorHandler');
const fs = require('fs');
const path = require('path');

/**
 * AI-FREE Image Analysis Strategy - Pure Computer Vision and OCR
 * No external AI dependencies - uses Tesseract OCR and image processing
 */
class AIFreeImageAnalysisStrategy extends BaseStrategy {
  constructor(config = {}) {
    super();
    this.useOCR = config.useOCR !== false; // Default to true
    this.enableElementDetection = config.enableElementDetection !== false;
    
    // Load image processing libraries
    this.tesseract = null;
    this.sharp = null;
    this.initializeImageLibraries();
  }

  async initializeImageLibraries() {
    try {
      this.tesseract = require('tesseract.js');
      this.sharp = require('sharp');
      console.log('✅ Image processing libraries loaded successfully');
    } catch (error) {
      console.log('⚠️  Image processing libraries not available. Installing...');
      throw new Error('Please install required image libraries: npm install tesseract.js sharp');
    }
  }

  /**
   * Get supported input types
   */
  getSupportedInputTypes() {
    return ['image', 'screenshot', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
  }

  /**
   * Validate image input
   */
  validate(input) {
    const result = { success: true, errors: [], warnings: [] };

    if (!input) {
      result.success = false;
      result.errors.push('Image path cannot be empty');
      return result;
    }

    if (!fs.existsSync(input)) {
      result.success = false;
      result.errors.push(`Image file not found: ${input}`);
      return result;
    }

    const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
    const ext = path.extname(input).toLowerCase();
    if (!validExtensions.includes(ext)) {
      result.success = false;
      result.errors.push(`Unsupported image format: ${ext}`);
    }

    return result;
  }

  /**
   * Create test plan from image analysis
   */
  async createTestPlan(imagePath, featureName, options = {}) {
    const validation = this.validate(imagePath);
    if (!validation.success) {
      throw new ValidationError(`Image validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      console.log(`📸 Analyzing image: ${imagePath}`);
      console.log('🔍 Using AI-free computer vision and OCR...');

      // Analyze image with pure computer vision
      const analysis = await this._analyzeImageWithCV(imagePath, featureName, options);
      
      console.log(`✅ AI-free image analysis completed:`);
      console.log(`   📋 Text elements: ${analysis.textElements.length}`);
      console.log(`   🎯 UI elements: ${analysis.uiElements.length}`);
      console.log(`   📝 Generated steps: ${analysis.steps.length}`);

      return analysis;

    } catch (error) {
      throw new StrategyError(`Failed to analyze image: ${error.message}`);
    }
  }

  /**
   * Analyze image using computer vision techniques
   */
  async _analyzeImageWithCV(imagePath, featureName, options = {}) {
    const analysis = {
      featureName: this._sanitizeFeatureName(featureName),
      imagePath: imagePath,
      textElements: [],
      uiElements: [],
      locators: [],
      steps: [],
      userStory: null,
      scenarios: [],
      tags: ['image-based', 'ui'],
      metadata: {
        analysisMethod: 'computer-vision',
        ocrUsed: this.useOCR,
        timestamp: new Date().toISOString()
      }
    };

    // Step 1: Extract text using OCR
    if (this.useOCR) {
      analysis.textElements = await this._extractTextWithOCR(imagePath);
      console.log(`📝 OCR extracted ${analysis.textElements.length} text elements`);
    }

    // Step 2: Detect UI elements using pattern matching
    if (this.enableElementDetection) {
      analysis.uiElements = await this._detectUIElements(imagePath, analysis.textElements);
      console.log(`🎯 Detected ${analysis.uiElements.length} UI elements`);
    }

    // Step 3: Generate locators based on detected elements
    analysis.locators = this._generateLocatorsFromElements(analysis.textElements, analysis.uiElements);

    // Step 4: Infer user story from UI context
    analysis.userStory = this._inferUserStoryFromUI(analysis.textElements, analysis.uiElements);

    // Step 5: Generate scenarios and steps
    analysis.scenarios = this._generateScenariosFromUI(analysis);
    analysis.steps = this._generateStepsFromUI(analysis);

    // Step 6: Add contextual tags
    analysis.tags.push(...this._generateTagsFromUI(analysis.textElements, analysis.uiElements));

    return analysis;
  }

  /**
   * Extract text using Tesseract OCR
   */
  async _extractTextWithOCR(imagePath) {
    try {
      console.log('🔍 Running OCR text extraction...');
      
      const { data: { text, words, lines } } = await this.tesseract.recognize(imagePath, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            process.stdout.write(`\\r⚡ OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      console.log('\\n✅ OCR completed');

      const textElements = [];

      // Process individual words with bounding boxes
      words.forEach((word, index) => {
        if (word.text.trim() && word.confidence > 60) {
          textElements.push({
            type: 'text',
            text: word.text.trim(),
            confidence: word.confidence,
            boundingBox: word.bbox,
            position: {
              x: word.bbox.x0,
              y: word.bbox.y0,
              width: word.bbox.x1 - word.bbox.x0,
              height: word.bbox.y1 - word.bbox.y0
            },
            index: index,
            category: this._categorizeText(word.text.trim())
          });
        }
      });

      return textElements;
    } catch (error) {
      console.log(`⚠️  OCR failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Categorize text based on content
   */
  _categorizeText(text) {
    const lowerText = text.toLowerCase();
    
    if (/^(login|sign in|log in)$/i.test(text)) return 'button';
    if (/^(username|email|user)$/i.test(text)) return 'label';
    if (/^(password|pwd)$/i.test(text)) return 'label';
    if (/^(submit|send|save|update|create|add|delete|cancel|close)$/i.test(text)) return 'button';
    if (/^(search|find)$/i.test(text)) return 'button';
    if (text.includes('@') && text.includes('.')) return 'email';
    if (/^\\d+$/.test(text)) return 'number';
    if (text.length > 20) return 'description';
    if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(text)) return 'name';
    
    return 'text';
  }

  /**
   * Detect UI elements using image analysis patterns
   */
  async _detectUIElements(imagePath, textElements) {
    const uiElements = [];

    try {
      // Get image metadata
      const metadata = await this.sharp(imagePath).metadata();
      console.log(`📐 Image dimensions: ${metadata.width}x${metadata.height}`);

      // Analyze text element positions to infer UI structure
      const buttons = this._detectButtons(textElements);
      const inputs = this._detectInputFields(textElements);
      const forms = this._detectForms(textElements, metadata);
      const navigation = this._detectNavigation(textElements, metadata);

      uiElements.push(...buttons, ...inputs, ...forms, ...navigation);

      return uiElements;
    } catch (error) {
      console.log(`⚠️  UI element detection failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Detect button elements
   */
  _detectButtons(textElements) {
    const buttons = [];
    
    const buttonKeywords = ['login', 'sign in', 'submit', 'send', 'save', 'update', 'create', 'add', 'delete', 'cancel', 'close', 'search', 'find', 'buy', 'purchase'];
    
    textElements.forEach(element => {
      if (element.category === 'button' || 
          buttonKeywords.some(keyword => element.text.toLowerCase().includes(keyword))) {
        buttons.push({
          type: 'button',
          text: element.text,
          position: element.position,
          confidence: 'high',
          locatorSuggestion: `getByRole('button', { name: '${element.text}' })`
        });
      }
    });

    return buttons;
  }

  /**
   * Detect input field elements
   */
  _detectInputFields(textElements) {
    const inputs = [];
    
    const inputLabels = ['username', 'email', 'password', 'search', 'name', 'phone', 'address', 'message'];
    
    textElements.forEach((element, index) => {
      if (inputLabels.some(label => element.text.toLowerCase().includes(label))) {
        inputs.push({
          type: 'input',
          label: element.text,
          position: element.position,
          confidence: 'high',
          locatorSuggestion: `getByLabel('${element.text}')`
        });
      }
    });

    return inputs;
  }

  /**
   * Detect form structures
   */
  _detectForms(textElements, metadata) {
    const forms = [];
    
    // Look for form-like patterns (multiple inputs + submit button)
    const inputs = textElements.filter(el => el.category === 'label');
    const buttons = textElements.filter(el => el.category === 'button');
    
    if (inputs.length >= 2 && buttons.length >= 1) {
      forms.push({
        type: 'form',
        inputs: inputs.length,
        buttons: buttons.length,
        confidence: 'medium',
        locatorSuggestion: "getByRole('form')"
      });
    }

    return forms;
  }

  /**
   * Detect navigation elements
   */
  _detectNavigation(textElements, metadata) {
    const navigation = [];
    
    // Look for navigation-like text in top portion of image
    const topElements = textElements.filter(el => el.position.y < metadata.height * 0.2);
    
    if (topElements.length >= 3) {
      navigation.push({
        type: 'navigation',
        elements: topElements.length,
        position: 'top',
        confidence: 'medium',
        locatorSuggestion: "getByRole('navigation')"
      });
    }

    return navigation;
  }

  /**
   * Generate locators from detected elements
   */
  _generateLocatorsFromElements(textElements, uiElements) {
    const locators = [];
    
    // Generate locators from UI elements
    uiElements.forEach((element, index) => {
      if (element.locatorSuggestion) {
        const name = this._generateLocatorName(element);
        locators.push({
          name: name,
          selector: element.locatorSuggestion,
          type: element.type,
          confidence: element.confidence || 'medium',
          source: 'ui-detection'
        });
      }
    });

    // Generate locators from high-confidence text elements
    textElements.forEach((element, index) => {
      if (element.confidence > 80 && element.category !== 'description') {
        const name = this._generateLocatorName(element);
        locators.push({
          name: name,
          selector: `getByText('${element.text}')`,
          type: 'text',
          confidence: 'high',
          source: 'ocr'
        });
      }
    });

    return this._deduplicateLocators(locators);
  }

  /**
   * Generate locator name from element
   */
  _generateLocatorName(element) {
    const text = element.text || element.label || element.type;
    return text.toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^(.)/, (match, p1) => p1.toLowerCase()) + 
      (element.type === 'button' ? 'Button' : 
       element.type === 'input' ? 'Input' : 
       'Element');
  }

  /**
   * Deduplicate similar locators
   */
  _deduplicateLocators(locators) {
    const seen = new Set();
    return locators.filter(locator => {
      const key = `${locator.name}-${locator.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Infer user story from UI elements
   */
  _inferUserStoryFromUI(textElements, uiElements) {
    const hasLogin = textElements.some(el => 
      el.text.toLowerCase().includes('login') || 
      el.text.toLowerCase().includes('sign in')
    );
    
    const hasPassword = textElements.some(el => 
      el.text.toLowerCase().includes('password')
    );

    const hasSearch = textElements.some(el => 
      el.text.toLowerCase().includes('search')
    );

    const hasForm = uiElements.some(el => el.type === 'form');

    if (hasLogin && hasPassword) {
      return {
        actor: 'registered user',
        action: 'log into my account using the login form',
        benefit: 'access my personal dashboard and account features',
        type: 'ui-inferred'
      };
    }

    if (hasSearch) {
      return {
        actor: 'user',
        action: 'search for information using the search interface',
        benefit: 'quickly find relevant content',
        type: 'ui-inferred'
      };
    }

    if (hasForm) {
      return {
        actor: 'user',
        action: 'fill out and submit the form',
        benefit: 'provide the required information',
        type: 'ui-inferred'
      };
    }

    return {
      actor: 'user',
      action: 'interact with the user interface',
      benefit: 'accomplish their task',
      type: 'generic'
    };
  }

  /**
   * Generate scenarios from UI analysis
   */
  _generateScenariosFromUI(analysis) {
    const scenarios = [];
    
    const mainScenario = {
      name: `${analysis.userStory.actor} ${analysis.userStory.action}`,
      steps: [],
      type: 'ui-generated'
    };

    // Setup step
    mainScenario.steps.push({
      keyword: 'Given',
      text: 'I am on the application page',
      type: 'setup'
    });

    // Action steps based on UI elements
    analysis.uiElements.forEach(element => {
      if (element.type === 'input') {
        mainScenario.steps.push({
          keyword: 'When',
          text: `I enter data into the ${element.label || 'input'} field`,
          type: 'action'
        });
      } else if (element.type === 'button') {
        mainScenario.steps.push({
          keyword: 'When',
          text: `I click the ${element.text || 'button'}`,
          type: 'action'
        });
      }
    });

    // Verification step
    mainScenario.steps.push({
      keyword: 'Then',
      text: 'I should see the expected result',
      type: 'verification'
    });

    scenarios.push(mainScenario);
    return scenarios;
  }

  /**
   * Generate steps from UI analysis
   */
  _generateStepsFromUI(analysis) {
    const steps = [];

    // Setup steps
    steps.push({
      keyword: 'Given',
      text: 'I am on the application page',
      type: 'setup',
      implementation: 'await page.goto(baseURL);'
    });

    // Generate steps from locators
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
          text: `I click the ${locator.name.replace(/Button$/, '').toLowerCase()}`,
          type: 'action',
          implementation: `await page.${locator.selector}.click();`
        });
      }
    });

    // Verification steps
    steps.push({
      keyword: 'Then',
      text: 'I should see the expected result',
      type: 'verification',
      implementation: 'await expect(page).toHaveTitle(/expected/);'
    });

    return steps;
  }

  /**
   * Generate tags from UI analysis
   */
  _generateTagsFromUI(textElements, uiElements) {
    const tags = [];
    
    const hasLogin = textElements.some(el => el.text.toLowerCase().includes('login'));
    const hasForm = uiElements.some(el => el.type === 'form');
    const hasSearch = textElements.some(el => el.text.toLowerCase().includes('search'));
    
    if (hasLogin) tags.push('authentication');
    if (hasForm) tags.push('forms');
    if (hasSearch) tags.push('search');
    
    return tags;
  }

  /**
   * Sanitize feature name
   */
  _sanitizeFeatureName(name) {
    return name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  }
}

module.exports = { AIFreeImageAnalysisStrategy };
