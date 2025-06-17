// src/strategies/ImageScanner.js
const Tesseract = require('tesseract.js');
const { getConfig } = require('../core/Config');
const path = require('path');

class ImageScanner {
  static async fromScreenshots(imgs) {
    const img = imgs[0];
    const config = getConfig();
    const useOCR = config.get('image.useOCR', true);
    
    console.log(`🔍 Analyzing image: ${img}${useOCR ? ' (with OCR)' : ' (OCR disabled)'}…`);
    
    let res = { data: { words: [] } };
    
    if (useOCR) {
      try { 
        console.log('📖 Running OCR text recognition...');
        res = await Tesseract.recognize(img, 'eng', {
          logger: m => {
            if (m.status === 'recognizing text') {
              process.stdout.write(`   Progress: ${Math.round(m.progress * 100)}%\r`);
            }
          }
        }); 
        console.log('\n'); // New line after progress
      } catch(e) { 
        console.warn(`⚠️ OCR error: ${e.message}`); 
        console.log('🔄 Falling back to intelligent element detection...');
        res = { data: { words: [] } }; 
      }
    } else {
      console.log('⚡ OCR disabled - using intelligent element detection');
    }
    const words = res.data.words || [];

    // Organize words into logical rows for better text grouping
    const rows = [];
    words.forEach(w => {
      const y = w.bbox.y0;
      let r = rows.find(r => Math.abs(r.y - y) < 20); // Increased tolerance for better grouping
      if (!r) { 
        r = { y, words: [], confidence: w.confidence || 0 }; 
        rows.push(r); 
      }
      r.words.push(w);
      r.confidence = Math.max(r.confidence, w.confidence || 0);
    });
    rows.sort((a, b) => a.y - b.y);

    // Extract text labels with confidence filtering
    const labels = rows
      .filter(r => r.confidence > 30) // Filter out low-confidence text
      .map(r => ({
        text: r.words.sort((a, b) => a.bbox.x0 - b.bbox.x0)
                    .map(w => w.text.trim()).join(' '),
        confidence: r.confidence,
        bbox: {
          x: Math.min(...r.words.map(w => w.bbox.x0)),
          y: r.y,
          width: Math.max(...r.words.map(w => w.bbox.x1)) - Math.min(...r.words.map(w => w.bbox.x0)),
          height: Math.max(...r.words.map(w => w.bbox.y1)) - Math.min(...r.words.map(w => w.bbox.y0))
        }
      }))
      .filter(label => label.text && label.text.length > 1); // Filter out single chars

    console.log('  -> OCR detected the following text elements:');
    if (labels.length > 0) {
      labels.forEach((item, index) => {
        const confidence = item.confidence ? ` (${Math.round(item.confidence)}%)` : '';
        console.log(`     ${index + 1}: "${item.text}"${confidence}`);
      });
    } else {
      console.log('     (No high-confidence text was detected on the image)');
    }
    
    console.log('  -> Analyzing UI patterns and inferring interactive elements...');
    
    // Enhanced field detection with pattern analysis
    let fields = this._analyzeUIElements(labels, img);

    // If no meaningful elements detected, create intelligent placeholders based on image name
    if (fields.length === 0) {
      console.log('  -> Creating intelligent placeholder actions based on image context...');
      fields = this._createContextualPlaceholders(img);
    }

    // Validate and improve selectors
    fields = this._validateAndImproveSelectors(fields);

    return { fields };
  }

  /**
   * Analyze UI elements to create meaningful test actions
   */
  static _analyzeUIElements(labels, imagePath) {
    const fields = [];
    const processedTexts = new Set(); // Prevent duplicates

    labels.forEach((item, index) => {
      const text = item.text.trim();
      if (processedTexts.has(text.toLowerCase())) return;
      processedTexts.add(text.toLowerCase());

      const field = this._classifyUIElement(text, item, index);
      if (field) {
        fields.push(field);
      }
    });

    return fields;
  }

  /**
   * Classify a UI element based on text content and context
   */
  static _classifyUIElement(text, item, index) {
    const label = text.trim();
    const lowerText = label.toLowerCase();
    
    // Button patterns (enhanced)
    const buttonPatterns = [
      /^(click|submit|save|add|create|remove|delete|next|continue|finish|complete|done|ok|yes|no|cancel|close|back|sign|login|register|search|go|update|edit|modify|upload|download|send|share|copy|paste|cut|reset|clear|refresh|reload|confirm|apply|accept|reject|approve|deny|start|stop|pause|play|retry|help|info|settings|config|menu|home|dashboard|profile|logout|exit)$/i,
      /^(new|get|buy|purchase|order|pay|checkout|subscribe|unsubscribe|follow|unfollow|like|unlike|bookmark|favorite|rate|review|comment|reply|forward|invite|join|leave|connect|disconnect|sync|import|export|print|scan|preview|view|show|hide|expand|collapse|minimize|maximize|fullscreen|zoom)$/i,
      /(button|btn|click|submit|action)$/i,
      /^.*(button|btn).*$/i
    ];

    // Input field patterns
    const inputPatterns = [
      /(name|email|username|password|phone|address|city|state|zip|postal|country|title|description|message|comment|note|search|query|filter|sort|amount|price|quantity|date|time|age|year|month|day)/i,
      /(field|input|textbox|textarea|box)$/i,
      /^(enter|type|input|fill).*$/i
    ];

    // Link patterns
    const linkPatterns = [
      /(link|url|href|goto|navigate|visit)$/i,
      /^(about|contact|help|support|faq|terms|privacy|legal|careers|blog|news|learn|more|details|info)$/i
    ];

    // Determine element type
    let type = 'button'; // Default assumption
    let actionType = 'click';
    let value = '';

    if (buttonPatterns.some(pattern => pattern.test(label))) {
      type = 'button';
      actionType = 'click';
    } else if (inputPatterns.some(pattern => pattern.test(label))) {
      type = 'input';
      actionType = 'fill';
      value = this._generateTestValue(lowerText);
    } else if (linkPatterns.some(pattern => pattern.test(label))) {
      type = 'link';
      actionType = 'click';
    } else if (lowerText.length > 20) {
      // Long text is likely descriptive content, not actionable
      return null;
    }

    // Generate smart selector based on element type and text
    const selector = this._generateSmartSelector(label, type, item);
    
    return {
      label,
      name: this._sanitizeName(label),
      type,
      actionType,
      value,
      selector,
      confidence: item.confidence || 50,
      position: item.bbox,
      required: false
    };
  }

  /**
   * Generate contextual placeholders when OCR fails
   */
  static _createContextualPlaceholders(imagePath) {
    const filename = path.basename(imagePath, path.extname(imagePath)).toLowerCase();
    const placeholders = [];

    // Analyze filename for context
    if (filename.includes('login') || filename.includes('signin')) {
      placeholders.push(
        { label: 'Username Field', name: 'username_field', type: 'input', actionType: 'fill', value: 'testuser@example.com', selector: `getByLabel('Username')`, confidence: 90 },
        { label: 'Password Field', name: 'password_field', type: 'input', actionType: 'fill', value: 'securepass123', selector: `getByLabel('Password')`, confidence: 90 },
        { label: 'Login Button', name: 'login_button', type: 'button', actionType: 'click', selector: `getByRole('button', { name: 'Login' })`, confidence: 90 }
      );
    } else if (filename.includes('form') || filename.includes('register') || filename.includes('signup')) {
      placeholders.push(
        { label: 'First Name', name: 'first_name', type: 'input', actionType: 'fill', value: 'John', selector: `getByLabel('First Name')`, confidence: 80 },
        { label: 'Last Name', name: 'last_name', type: 'input', actionType: 'fill', value: 'Doe', selector: `getByLabel('Last Name')`, confidence: 80 },
        { label: 'Email Address', name: 'email_address', type: 'input', actionType: 'fill', value: 'john.doe@example.com', selector: `getByLabel('Email')`, confidence: 80 },
        { label: 'Submit Form', name: 'submit_form', type: 'button', actionType: 'click', selector: `getByRole('button', { name: 'Submit' })`, confidence: 80 }
      );
    } else if (filename.includes('search')) {
      placeholders.push(
        { label: 'Search Input', name: 'search_input', type: 'input', actionType: 'fill', value: 'test query', selector: `getByPlaceholder('Search')`, confidence: 85 },
        { label: 'Search Button', name: 'search_button', type: 'button', actionType: 'click', selector: `getByRole('button', { name: 'Search' })`, confidence: 85 }
      );
    } else if (filename.includes('home') || filename.includes('dashboard')) {
      placeholders.push(
        { label: 'Navigation Menu', name: 'navigation_menu', type: 'button', actionType: 'click', selector: `getByRole('button', { name: 'Menu' })`, confidence: 75 },
        { label: 'Primary Action', name: 'primary_action', type: 'button', actionType: 'click', selector: `getByRole('button', { name: /Get Started|Start|Begin|Continue/ })`, confidence: 75 },
        { label: 'User Profile', name: 'user_profile', type: 'button', actionType: 'click', selector: `getByRole('button', { name: 'Profile' })`, confidence: 75 }
      );
    } else {
      // Generic fallback with better selectors
      placeholders.push(
        { label: 'Primary Button', name: 'primary_button', type: 'button', actionType: 'click', selector: `getByRole('button').first()`, confidence: 60 },
        { label: 'Text Input', name: 'text_input', type: 'input', actionType: 'fill', value: 'test input', selector: `getByRole('textbox').first()`, confidence: 60 },
        { label: 'Secondary Action', name: 'secondary_action', type: 'button', actionType: 'click', selector: `getByRole('button').nth(1)`, confidence: 60 }
      );
    }

    return placeholders;
  }

  /**
   * Generate smart Playwright selectors
   */
  static _generateSmartSelector(text, type, item) {
    const cleanText = text.replace(/['"]/g, '');
    
    switch (type) {
      case 'button':
        return `getByRole('button', { name: '${cleanText}' })`;
      case 'input':
        if (text.toLowerCase().includes('email')) {
          return `getByLabel('Email')`;
        } else if (text.toLowerCase().includes('password')) {
          return `getByLabel('Password')`;
        } else if (text.toLowerCase().includes('search')) {
          return `getByPlaceholder('Search')`;
        } else {
          return `getByLabel('${cleanText}')`;
        }
      case 'link':
        return `getByRole('link', { name: '${cleanText}' })`;
      default:
        return `getByText('${cleanText}')`;
    }
  }

  /**
   * Generate appropriate test values for inputs
   */
  static _generateTestValue(fieldName) {
    const testData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'SecurePass123!',
      phone: '555-123-4567',
      address: '123 Test Street',
      city: 'Test City',
      state: 'CA',
      zip: '12345',
      postal: '12345',
      country: 'United States',
      name: 'Test User',
      firstname: 'John',
      lastname: 'Doe',
      company: 'Test Company',
      title: 'Test Title',
      description: 'This is a test description',
      message: 'This is a test message',
      comment: 'This is a test comment',
      search: 'test query',
      amount: '100.00',
      price: '29.99',
      quantity: '1',
      age: '25',
      year: '2024'
    };

    // Find matching test data
    for (const [key, value] of Object.entries(testData)) {
      if (fieldName.includes(key)) {
        return value;
      }
    }

    return 'test data';
  }

  /**
   * Validate and improve selectors
   */
  static _validateAndImproveSelectors(fields) {
    return fields.map(field => {
      const warnings = [];
      
      // Check for potentially problematic selectors
      if (field.selector.includes('getByText') && field.label.length < 3) {
        warnings.push('Short text selector may be unreliable');
        // Improve selector
        field.selector = `getByRole('${field.type === 'button' ? 'button' : 'textbox'}', { name: /${field.label}/i })`;
      }

      if (field.selector.includes("'")) {
        // Check for quote escaping issues
        const quoteCount = (field.selector.match(/'/g) || []).length;
        if (quoteCount % 2 !== 0) {
          warnings.push('Unbalanced quotes in selector');
          field.selector = field.selector.replace(/'/g, '"');
        }
      }

      // Add validation warnings
      field.validationWarnings = warnings;
      
      return field;
    });
  }

  /**
   * Sanitize names for code generation
   */
  static _sanitizeName(text) {
    return text
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special chars
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/^(\d)/, '_$1') // Prefix with underscore if starts with number
      .toLowerCase();
  }
}

module.exports = ImageScanner;