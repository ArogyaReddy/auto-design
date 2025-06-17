// src/strategies/TextAnalysisStrategy.js (With Advanced Few-Shot Prompt)
const fs = require('fs');

class TextAnalysisStrategy {
  constructor(config = {}) {
    this.ollamaUrl = config.ollamaUrl || 'http://localhost:11434/api/chat';
    this.model = config.model || 'llama3';
  }

  async createTestPlan(inputText, featureName) {
    console.log("  -> Sending text to Local AI for advanced analysis...");
    
// The prompt is now much more detailed and demanding.
const systemPrompt = `You are an expert test automation engineer. Analyze the user's text to create a structured JSON test plan.
Your entire response MUST be a single, valid JSON object.
The 'selector' for each locator MUST be a full Playwright locator string (e.g., "page.getByRole('button', { name: 'Login' })").
For each step in the "steps" array, you MUST include:
- "keyword": (Given, When, And, Then)
- "text": The full Gherkin step text.
- "actionType": The type of action, either "click", "fill", or "assertion".
- "locatorName": The exact 'name' of the locator from the 'locators' array that this step uses.
- "actionValue": For "fill" steps, the value to be entered. For other steps, this can be an empty string.

HERE IS A PERFECT EXAMPLE:
---
{
  "featureName": "UserLogin",
  "scenarioName": "User logs in with credentials",
  "locators": [
    { "name": "usernameField", "selector": "page.getByLabel('Username')" },
    { "name": "loginButton", "selector": "page.getByRole('button', { name: 'Login' })" }
  ],
  "steps": [
    { "keyword": "When", "text": "I fill the 'Username' field with 'testuser'", "actionType": "fill", "locatorName": "usernameField", "actionValue": "testuser" },
    { "keyword": "And", "text": "I click the 'Login' button", "actionType": "click", "locatorName": "loginButton", "actionValue": "" }
  ]
}
---
Now, generate the JSON for the real user input. Use the feature name "${featureName}".`;


    const payload = {
      model: this.model, stream: false, format: 'json',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: inputText }]
    };

    try {
        const response = await fetch(this.ollamaUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`Ollama API request failed: ${response.statusText}`);
        const aiResponse = await response.json();
        return JSON.parse(aiResponse.message.content);
    } catch (error) {
        console.error("❌ Critical Error calling Local AI. Is Ollama running?");
        console.error("   Underlying error:", error.message);
        return null;
    }
  }
}

module.exports = { TextAnalysisStrategy };