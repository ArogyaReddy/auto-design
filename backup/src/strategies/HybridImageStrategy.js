// src/strategies/HybridImageStrategy.js (Final "Divide and Conquer" Architecture)
const Tesseract = require('tesseract.js');
const fs = require('fs');

class HybridImageStrategy {
  constructor(config = {}) {
    this.ollamaUrl = config.ollamaUrl || 'http://localhost:11434/api/chat';
    this.model = config.model || 'llama3';
  }

  // Helper to create valid JavaScript variable names
  _sanitize(str = '') {
    if (!str) return 'element';
    const sanitized = str.toString().replace(/[^a-zA-Z0-9]/g, ' ').trim().split(/\s+/)
      .map((w, i) => i ? w[0].toUpperCase() + w.slice(1) : w.toLowerCase()).join('');
    return /^\d/.test(sanitized) ? `element${sanitized}` : sanitized;
  }

  // Step 1: Use OCR to get the raw text from the image
  async _extractTextFromImage(imagePath) {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Screenshot not found at path: ${imagePath}`);
    }
    console.log(`  -> Step 1: Extracting text from image with OCR...`);
    try {
      const { data: { text } } = await Tesseract.recognize(imagePath);
      console.log(`  -> OCR successfully extracted text.`);
      return text;
    } catch (e) {
      console.error(`⚠️ OCR error: ${e.message}`);
      return null;
    }
  }

  // Step 2: Send the extracted text to the AI for simple element identification
  async _getElementsFromText(text) {
    console.log("  -> Step 2: Sending text to Local AI to identify elements...");
    const systemPrompt = `Analyze the following raw OCR text from a UI screenshot. Identify the main interactive elements. Your response MUST be a single, valid JSON object with one key: "elements".
"elements" should be an array of objects, where each object has two keys: "label" (the text on the element) and "type" ('button', 'link', or 'input').
Focus only on actionable items.

EXAMPLE JSON OUTPUT:
{
  "elements": [
    { "label": "Username", "type": "input" },
    { "label": "Password", "type": "input" },
    { "label": "Sign In", "type": "button" }
  ]
}`;

    const payload = {
      model: this.model, stream: false, format: 'json',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }]
    };

    try {
        const response = await fetch(this.ollamaUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`Ollama API request failed: ${response.statusText}`);
        const aiResponse = await response.json();
        return JSON.parse(aiResponse.message.content).elements || [];
    } catch (error) {
        console.error("❌ Critical Error calling Local AI. Is Ollama running?");
        return [];
    }
  }

  // Step 3: Our JavaScript code builds the final test plan
  _buildPlanFromElements(elements, featureName) {
    console.log("  -> Step 3: Building a clean test plan from identified elements...");
    const plan = {
      featureName: featureName,
      scenarioName: `A scenario generated from the screenshot`,
      locators: [],
      steps: []
    };
    
    let lastKeyword = 'Given';
    plan.steps.push({ keyword: 'Given', text: `I am on the application` });

    for (const element of elements) {
      const locatorName = this._sanitize(element.label);
      let step = {};

      if (element.type === 'button' || element.type === 'link') {
        plan.locators.push({
          name: locatorName,
          selector: `page.getByRole('${element.type}', { name: '${element.label}' })`
        });
        step = {
          keyword: (lastKeyword === 'When' || lastKeyword === 'And') ? 'And' : 'When',
          text: `I click the '${element.label}' ${element.type}`,
          actionType: 'click',
          locatorName: locatorName
        };
        lastKeyword = step.keyword;
      } else if (element.type === 'input') {
        plan.locators.push({
          name: locatorName,
          selector: `page.getByLabel('${element.label}')`
        });
        step = {
          keyword: 'When',
          text: `I fill the '${element.label}' field with 'test-data'`,
          actionType: 'fill',
          locatorName: locatorName,
          actionValue: 'test-data'
        };
        lastKeyword = 'When';
      }
      
      if (step.keyword) {
        plan.steps.push(step);
      }
    }
    return plan;
  }

  // The main public method that orchestrates the new 3-step process
  async createTestPlan(imagePath, featureName) {
    const extractedText = await this._extractTextFromImage(imagePath);
    if (!extractedText) return null;

    const elements = await this._getElementsFromText(extractedText);
    if (!elements || elements.length === 0) {
        console.warn("⚠️ AI did not identify any actionable elements from the OCR text.");
        return null;
    }
    
    const plan = this._buildPlanFromElements(elements, featureName);
    return plan;
  }
}

module.exports = { HybridImageStrategy };