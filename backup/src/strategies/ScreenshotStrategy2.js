// src/strategies/ScreenshotStrategy.js (Complete and Final Version)
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

  async createTestPlan(imagePath, featureName) {
    console.log("  -> Encoding screenshot and sending to Local AI for advanced analysis...");
    const base64Image = this._encodeImage(imagePath);

    const systemPrompt = `You are an expert test automation engineer. Analyze the provided screenshot of a web UI and convert it into a structured JSON test plan.
Your entire response MUST be a single, valid JSON object and nothing else.
The 'selector' for each locator MUST be a full, valid Playwright locator string (e.g., "page.getByRole('button', { name: 'Login' })").
For each step in the "steps" array, you MUST include:
- "keyword": (Given, When, And, Then)
- "text": The full Gherkin step text.
- "actionType": The type of action, either "click", "fill", or "assertion".
- "locatorName": The exact 'name' of the locator from the 'locators' array that this step uses.
- "actionValue": For "fill" steps, the value to be entered. For other steps, this can be an empty string.

HERE IS A PERFECT EXAMPLE:
---
HYPOTHETICAL INPUT: (An image of a simple login form)
YOUR REQUIRED JSON OUTPUT:
{
  "featureName": "UserAuthentication",
  "scenarioName": "User logs in with credentials",
  "locators": [
    { "name": "usernameField", "selector": "page.getByLabel('Username')" },
    { "name": "passwordField", "selector": "page.getByLabel('Password')" },
    { "name": "loginButton", "selector": "page.getByRole('button', { name: 'Login' })" }
  ],
  "steps": [
    { "keyword": "Given", "text": "I am on the application", "actionType": "navigation", "locatorName": "", "actionValue": "" },
    { "keyword": "When", "text": "I fill the 'Username' field with 'testuser'", "actionType": "fill", "locatorName": "usernameField", "actionValue": "testuser" },
    { "keyword": "And", "text": "I fill the 'Password' field with 'a-secure-password'", "actionType": "fill", "locatorName": "passwordField", "actionValue": "a-secure-password" },
    { "keyword": "And", "text": "I click the 'Login' button", "actionType": "click", "locatorName": "loginButton", "actionValue": "" },
    { "keyword": "Then", "text": "I should see the dashboard", "actionType": "assertion", "locatorName": "", "actionValue": "" }
  ]
}
---
Now, generate the JSON for the real user-provided screenshot. Use the feature name "${featureName}".`;
    
    const payload = {
      model: this.model,
      stream: false,
      format: 'json',
      messages: [{
        role: 'user',
        content: systemPrompt,
        images: [base64Image]
      }]
    };

    try {
        const response = await fetch(this.ollamaUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            throw new Error(`Ollama API request failed: ${response.status} ${response.statusText}`);
        }
        const aiResponse = await response.json();
        return JSON.parse(aiResponse.message.content);
    } catch (error) {
        console.error("❌ Critical Error calling Local AI. Is Ollama running?");
        console.error("   Underlying error:", error.message);
        return null;
    }
  }
}

module.exports = { ScreenshotStrategy };