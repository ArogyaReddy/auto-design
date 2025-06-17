# 🚀 Complete Generation Methods Guide

## All Available Test Generation Methods

The Auto-Design Platform supports **5 comprehensive generation methods** to create Playwright tests from different sources:

---

## 🎬 **1. Auto Recorder - Playwright Recording**

**Record live user interactions in your browser**

### Features:

- ✅ Live browser recording with Playwright
- ✅ Automatic action capture (clicks, fills, navigation)
- ✅ Multiple browser support (Chromium, Firefox, WebKit)
- ✅ Headless and headed modes
- ✅ Real-time test generation

### Usage:

```bash
# Command line
node run.js record MyFeature --url "https://example.com"

# Interactive UI: Choose "🎬 Auto Recorder"
npm start
```

### Generated Folder: `APP-FeatureName`

---

## 📝 **2. Text/User Story Conversion**

**Convert descriptive text and user stories into tests**

### Features:

- ✅ Natural language processing
- ✅ User story pattern recognition
- ✅ BDD scenario generation
- ✅ Smart element identification
- ✅ AI-free intelligent parsing

### Examples:

```bash
# User story format
node run.js text "As a user, I want to login with username and password so I can access my account" LoginFlow

# Descriptive paragraph
node run.js text "User fills out contact form with name, email, message and clicks submit button" ContactForm

# Step-by-step description
node run.js text "Navigate to products page, select item, add to cart, proceed to checkout" Shopping
```

### Generated Folder: `TXT-FeatureName`

---

## 📸 **3. Image/Screenshot Conversion**

**Extract test scenarios from UI screenshots and images**

### Features:

- ✅ OCR text recognition (Tesseract)
- ✅ UI element detection
- ✅ Computer vision analysis
- ✅ Smart selector generation
- ✅ Multiple image format support

### Usage:

```bash
# From image file
node run.js image examples/home.png HomePageFlow

# Interactive UI: Choose "📸 Image/Screenshot conversion"
npm start
```

### Generated Folder: `IMG-FeatureName`

---

## 🎫 **4. JIRA Story/Feature Extraction**

**Generate tests directly from JIRA tickets and stories**

### Features:

- ✅ JIRA API integration
- ✅ Story and epic parsing
- ✅ Acceptance criteria extraction
- ✅ Comment and subtask inclusion
- ✅ Custom field mapping

### Setup:

```bash
# Set environment variables
export JIRA_URL="https://yourcompany.atlassian.net"
export JIRA_USERNAME="your-email@company.com"
export JIRA_API_TOKEN="your-api-token"
```

### Usage:

```bash
# From JIRA ticket
node run.js jira ABC-123 TicketFeature

# Interactive UI: Choose "🎫 JIRA Story/Feature extraction"
npm start
```

### Generated Folder: `JIRA-FeatureName`

---

## 📄 **5. Summary/Text File Conversion**

**Convert text files, documentation, and summaries into tests**

### Features:

- ✅ Multiple file format support
- ✅ Markdown and plain text parsing
- ✅ Enhanced document analysis
- ✅ Metadata extraction
- ✅ Smart content recognition

### Usage:

```bash
# From text file
node run.js summary examples/jira-story.txt FeatureFromFile

# From custom file
node run.js summary /path/to/your/requirements.md Requirements

# Interactive UI: Choose "📄 Summary/Text File conversion"
npm start
```

### Generated Folder: `TXT-FeatureName`

---

## 🎯 **Generated Output Structure**

Each method generates a complete test suite:

```
output/
└── [PREFIX]-FeatureName/
    ├── Features/
    │   └── [PREFIX]-FeatureName.feature    # BDD feature file
    ├── Pages/
    │   └── [PREFIX]-FeatureName.page.js    # Page Object Model
    ├── Steps/
    │   └── [PREFIX]-FeatureName.steps.js   # Step definitions
    └── Tests/
        └── [PREFIX]-FeatureName.test.js    # Playwright test
```

### Folder Prefixes:

- `APP-` - Recorded/Application flows
- `TXT-` - Text/Story/Summary derived
- `IMG-` - Image/Screenshot derived
- `JIRA-` - JIRA ticket derived

---

## 🚀 **Quick Start Examples**

### Example 1: E-commerce User Flow

```bash
node run.js text "Customer browses products, adds items to cart, and completes checkout with payment" EcommerceFlow
```

### Example 2: Login Feature from Screenshot

```bash
node run.js image examples/login-screen.png LoginFeature
```

### Example 3: JIRA Story Implementation

```bash
export JIRA_URL="https://company.atlassian.net"
export JIRA_USERNAME="dev@company.com"
export JIRA_API_TOKEN="your-token"
node run.js jira DEV-456 UserRegistration
```

### Example 4: Documentation to Tests

```bash
node run.js summary requirements/user-management.md UserMgmt
```

### Example 5: Live Recording

```bash
node run.js record AdminFlow --url "https://admin.company.com"
```

---

## 💡 **Best Practices**

1. **Use Descriptive Names**: Clear feature names help with organization
2. **Start Simple**: Begin with text descriptions before complex scenarios
3. **Combine Methods**: Use recording for complex flows, text for simple ones
4. **Review Generated Tests**: Always review and customize generated code
5. **Leverage Templates**: Modify templates in `src/templates/` for consistency

---

## 🛠️ **Interactive UI**

Launch the beautiful interactive interface:

```bash
npm start
# or
node interactive-ui.js
```

Features:

- ✅ **Visual Menu System** - Easy navigation between all methods
- ✅ **Smart Defaults** - Remembers your preferences
- ✅ **ESC Key Support** - Return to main menu anytime
- ✅ **Input Validation** - Prevents errors with smart validation
- ✅ **Progress Feedback** - Clear status and completion messages

---

All methods are **100% AI-free** and use only NPM-based libraries for reliable, deterministic test generation! 🎉
