# Auto-Design Platform NPM Scripts Reference 📋

## Quick Start Commands

### 🎯 **Demo Commands** (Ready-to-run examples)

```bash
npm run demo:record     # Playwright CodeGen recording demo
npm run demo:image      # Image analysis demo
npm run demo:jira       # JIRA integration demo
npm run demo:text       # Text analysis demo
npm run demo:summary    # Summary file analysis demo
npm run demo:fallback   # Fallback parsing demo (AI disabled)
```

### ✅ **Verification Commands** (Test all functionalities)

```bash
npm run verify:playwright  # Verify Playwright CodeGen
npm run verify:images      # Verify image analysis
npm run verify:jira        # Verify JIRA integration
npm run verify:text        # Verify text analysis
npm run verify:summary     # Verify summary file analysis
npm run verify:fallback    # Verify fallback parsing
npm run verify:all         # Run all verifications (except Playwright)
```

### 🧪 **Test Commands** (Custom test scenarios)

```bash
npm run test:record        # Test with Playwright.dev
npm run test:image         # Test image analysis
npm run test:text          # Test text analysis
npm run test:summary       # Test summary analysis
npm run test:all-strategies # Run all strategy tests
```

### 📝 **Example Commands** (Common use cases)

```bash
npm run example:login      # Login flow example
npm run example:ecommerce  # E-commerce flow example
npm run example:form       # Contact form example
```

### 🛠️ **Core Commands**

```bash
npm run auto-design        # Main CLI (no args shows help)
npm run list-strategies    # List available strategies
npm run record            # Basic record command
npm run test              # Run Playwright tests
```

## 🚀 **Usage Examples**

### Run All Verifications

```bash
# Verify all functionalities work
npm run verify:all
```

### Quick Demo

```bash
# Show text analysis capabilities
npm run demo:text
```

### Test Specific Functionality

```bash
# Test image analysis
npm run demo:image
```

### Run with Custom Parameters

```bash
# Direct CLI usage for custom scenarios
node run.js text "Your custom user story here" CustomFeatureName
node run.js image path/to/your/image.png CustomImageFeature
node run.js summary path/to/your/summary.txt CustomSummaryFeature
```

## 📁 **Output Locations**

All generated files are created in:

```
/output/{FeatureName}/
├── Features/{FeatureName}.feature
├── Pages/{FeatureName}.page.js
├── Steps/{FeatureName}.steps.js
└── Tests/{FeatureName}.test.js
```

## ⚙️ **Environment Variables**

```bash
DISABLE_AI=true        # Disable AI analysis, use simple parsing
JIRA_URL=...          # JIRA instance URL
JIRA_USER=...         # JIRA username
JIRA_API_TOKEN=...    # JIRA API token
```

## 🎯 **Quick Start Workflow**

1. **Verify everything works:**

   ```bash
   npm run verify:all
   ```

2. **Try different input types:**

   ```bash
   npm run demo:text
   npm run demo:image
   npm run demo:summary
   ```

3. **Create your own tests:**
   ```bash
   node run.js text "Your user story" YourFeatureName
   ```

## 📊 **Performance Reference**

- **Text Analysis (AI):** ~10-15 seconds
- **Text Analysis (Fallback):** ~1-2 seconds
- **Image Analysis:** ~3-5 seconds
- **Playwright Recording:** ~30 seconds (interactive)
- **JIRA Integration:** ~2-3 seconds

---

**All scripts are ready to use! Start with `npm run verify:all` to ensure everything works correctly.** 🎉
