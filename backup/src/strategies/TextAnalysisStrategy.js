// src/strategies/TextAnalysisStrategy.js (With Advanced "Masterclass" Prompt)
const fs = require('fs');

class TextAnalysisStrategy {
  constructor(config = {}) {
    this.ollamaUrl = config.ollamaUrl || 'http://localhost:11434/api/chat';
    this.model = config.model || 'llama3';
  }

  async createTestPlan(inputText, featureName) {
    console.log("  -> Sending text to Local AI for advanced analysis...");
    
    // THIS IS THE NEW, MORE DEMANDING PROMPT
//     const systemPrompt = `You are an expert test automation engineer who is a world-class expert in BDD and Gherkin.
// Your task is to analyze the user's text and convert it into a structured JSON test plan.
// Your entire response MUST be a single, valid JSON object and nothing else.

const systemPrompt = `You are an expert test automation engineer...
The 'selector' value for each locator MUST be a full, valid Playwright locator string...
For each step in the "steps" array, you MUST include "keyword", "text", "actionType", "locatorName", and "actionValue".
CRITICAL: For any step with an "actionType" of "click" or "fill", the "locatorName" MUST NOT be an empty string and MUST match a "name" from the "locators" array.

**CRITICAL RULES FOR STEP GENERATION:**
1.  The 'text' for each step MUST be a concrete user action phrased in the first person.
2.  Do NOT use vague phrases. Be specific.
    - BAD: "User logs in"
    - GOOD: "I fill the 'Username' field with 'testuser'"
3.  For a click action, the step MUST be phrased as "I click the '...' button" or "I click the '...' link".
4.  For a typing action, the step MUST be phrased as "I fill the '...' field with 'some value'".
5.  The 'selector' value for each locator MUST be a full, valid Playwright locator string.

**HERE IS A PERFECT EXAMPLE OF THE REQUIRED JSON OUTPUT:**
---
{
  "featureName": "NewEmployeeOnboarding",
  "scenarioName": "Admin invites a new employee to the system",
  "locators": [
    {
      "name": "addNewEmployeeButton",
      "selector": "page.getByRole('button', { name: 'Add new employee' })"
    },
    {
      "name": "illFillItOutButton",
      "selector": "page.getByRole('button', { name: 'I\\'ll fill it out' })"
    }
  ],
  "steps": [
    {
      "keyword": "Given",
      "text": "I am on the main dashboard",
      "actionType": "navigation",
      "locatorName": "",
      "actionValue": ""
    },
    {
      "keyword": "When",
      "text": "I click the 'Add new employee' button",
      "actionType": "click",
      "locatorName": "addNewEmployeeButton",
      "actionValue": ""
    },
    {
      "keyword": "And",
      "text": "I click the 'I'll fill it out' button",
      "actionType": "click",
      "locatorName": "illFillItOutButton",
      "actionValue": ""
    }
  ]
}
---
Now, generate the JSON for the real user input. Use the feature name "${featureName}".`;

    const payload = {
      model: this.model,
      stream: false,
      format: 'json',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: inputText }
      ]
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