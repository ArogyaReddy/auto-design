// src/strategies/ScreenshotStrategy.js
const fs = require('fs');

class ScreenshotStrategy {
  constructor(config = {}) {
    this.ollamaUrl = config.ollamaUrl || 'http://localhost:11434/api/chat';
    this.model = config.model || 'llama3'; // A multimodal model is required
  }

  _encodeImage(imagePath) {
    if (!fs.existsSync(imagePath)) {
        throw new Error(`Screenshot not found at path: ${imagePath}`);
    }
    return fs.readFileSync(imagePath, 'base64');
  }

  async createTestPlan(imagePath) {
    console.log("  -> Encoding screenshot and sending to Local AI for analysis...");
    const base64Image = this._encodeImage(imagePath);
    const systemPrompt = `You are an expert test automation engineer. Analyze the following screenshot of a web application. Infer a primary user journey (like login or search) and convert it into a structured test plan. The plan must be a single, valid JSON object.
    The JSON object must have these keys:
    - "featureName": A short, PascalCase name for the feature (e.g., "UserLogin").
    - "scenarioName": A descriptive name for the primary test scenario you inferred.
    - "locators": An array of objects, where each object has a "name" (camelCase) and a "selector" (your best guess at a robust CSS selector for the element).
    - "steps": An array of objects, where each object has a "keyword" (Given, When, Then, And) and a "text" (the step description).
    Do not include any other text or explanations.`;
    
    const payload = {
      model: this.model, stream: false, format: 'json',
      messages: [{ role: 'user', content: systemPrompt, images: [base64Image] }]
    };

    try {
        const response = await fetch(this.ollamaUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`Ollama API request failed with status ${response.status}`);
        const aiResponse = await response.json();
        return JSON.parse(aiResponse.message.content);
    } catch (error) {
        console.error("❌ Critical Error calling Local AI. Is Ollama running and the model pulled? (e.g., 'ollama run llama3')");
        console.error("Underlying error:", error.message);
        return null;
    }
  }
}

module.exports = { ScreenshotStrategy };