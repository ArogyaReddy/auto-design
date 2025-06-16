// src/strategies/TextStrategy.js
class TextStrategy {
    constructor(config = {}) {
      this.ollamaUrl = config.ollamaUrl || 'http://localhost:11434/api/chat';
      this.model = config.model || 'llama3';
    }
  
    async createTestPlan(text) {
      console.log("  -> Sending text to Local AI for analysis...");
      const systemPrompt = `You are an expert test automation engineer. Analyze the following user story or description. Your task is to convert it into a structured test plan. The plan MUST be a single, valid JSON object and nothing else.
      The JSON object must have these keys:
      - "featureName": A short, PascalCase name for the feature (e.g., "UserLogin").
      - "scenarioName": A descriptive name for the primary test scenario.
      - "locators": An array of objects, where each object has a "name" (camelCase) and a "selector" (your best guess at a robust CSS selector for the element).
      - "steps": An array of objects, where each object has a "keyword" (Given, When, Then, And) and a "text" (the step description).
      Do not include any other text or explanations in your response.`;
  
      const payload = {
        model: this.model, stream: false, format: 'json',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: text }]
      };
  
      try {
          const response = await fetch(this.ollamaUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!response.ok) throw new Error(`Ollama API request failed with status ${response.status}`);
          const aiResponse = await response.json();
          return JSON.parse(aiResponse.message.content);
      } catch (error) {
          console.error("❌ Critical Error calling Local AI. Is Ollama running? (e.g., 'ollama run llama3')");
          console.error("Underlying error:", error.message);
          return null;
      }
    }
  }
  
  module.exports = { TextStrategy };