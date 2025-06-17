const fs = require('fs');

class TextAnalysisStrategy {
  constructor(config = {}) {
    this.ollamaUrl = config.ollamaUrl || 'http://localhost:11434/api/chat';
    this.model = config.model || 'llama3';
  }

  async createTestPlan(inputText, featureName) {
    console.log("  -> Sending text to Local AI for analysis...");
    const systemPrompt = `You are an expert test automation engineer. Analyze the following user story or description. Your task is to convert it into a structured test plan. The plan MUST be a single, valid JSON object and nothing else.
    The JSON object must have these keys:
    - "featureName": A short, PascalCase name for the feature. Use the name "${featureName}".
    - "scenarioName": A descriptive name for the primary test scenario based on the text.
    - "locators": An array of objects, where each object has a "name" (a camelCase variable name) and a "selector" (your best guess at a robust, modern Playwright selector like getByRole or getByLabel).
    - "steps": An array of objects, where each object has a "keyword" (Given, When, And, Then) and a "text" (the full Gherkin step text).`;

    const payload = {
      model: this.model,
      stream: false,
      format: 'json', // Ask Ollama to guarantee the output is JSON
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: inputText }
      ]
    };

    try {
        const response = await fetch(this.ollamaUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Ollama API request failed with status ${response.status}`);
        }
        
        const aiResponse = await response.json();
        
        // The AI's entire response content should be a parseable JSON string
        return JSON.parse(aiResponse.message.content);

    } catch (error) {
        console.error("❌ Critical Error calling Local AI. Is Ollama running and the model pulled? (e.g., 'ollama pull llama3')");
        console.error("   Underlying error:", error.message);
        return null;
    }
  }
}

module.exports = { TextAnalysisStrategy };