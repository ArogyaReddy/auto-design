# ESC Key Functionality - Auto-Design Platform

## Overview

The Auto-Design Platform now supports global ESC key functionality, allowing users to return to the main menu from any point in the interactive flow.

## How to Use ESC

### Method 1: Type "ESC" in Text Inputs

- In any text input prompt (feature name, URL, file path, etc.)
- Simply type `ESC` and press Enter
- You will immediately return to the main menu

### Method 2: Type "MAIN" in Text Inputs

- In any text input prompt
- Type `MAIN` and press Enter
- You will immediately return to the main menu

### Supported Flows

The ESC functionality works in ALL interactive flows:

1. **🎬 Auto Recorder** - Playwright recording

   - Feature name input
   - URL input
   - Custom path inputs

2. **📝 Auto Coder** - Text/User Story conversion

   - Feature name input
   - User story input (all input methods)
   - Custom file path inputs

3. **📸 Auto Coder** - Image/Screenshot conversion

   - Feature name input
   - Custom image path inputs

4. **🏃 Auto Runner** - Test execution

   - Feature name input for specific tests
   - Custom path selections

5. **📁 Auto Gen** - File browsing

   - All file operation prompts

6. **⚙️ Preferences** - Settings management
   - All preference input prompts

## Examples

### Example 1: Escaping from Recording Flow

```
? Enter feature name: (Press ESC to return to main menu) ESC
⬅️  Returning to main menu...
```

### Example 2: Escaping from Text Generation

```
? Enter your user story/description: (Press ESC to return to main menu) MAIN
⬅️  Returning to main menu...
```

### Example 3: Escaping from File Selection

```
? Enter file path: (Press ESC to return to main menu) ESC
⬅️  Returning to main menu...
```

## Implementation Details

### Enhanced User Experience

- All prompts now include "(Press ESC to return to main menu)" hint
- Clear feedback when returning to main menu
- No data loss - user preferences are saved before escape
- Works consistently across all flows

### Technical Implementation

- Global exception handling with `EscapeToMainMenuException`
- Enhanced `safePrompt()` wrapper around inquirer.prompt
- Automatic validation of ESC/MAIN keywords in text inputs
- Graceful error handling and cleanup

### Error Handling

- If ESC is triggered during command execution, the process completes gracefully
- User preferences are preserved even when escaping mid-flow
- No corrupted state or hanging processes

## Benefits

1. **User-Friendly**: Easy to navigate and exit any flow
2. **Non-Destructive**: No data loss when escaping
3. **Consistent**: Works the same way across all features
4. **Intuitive**: Clear hints and feedback
5. **Robust**: Proper error handling and cleanup

## Testing

To test the ESC functionality:

```bash
# Run the test script
node test-esc.js

# Or run the UI directly
node interactive-ui.js
```

Follow the on-screen instructions to test ESC functionality in different flows.
