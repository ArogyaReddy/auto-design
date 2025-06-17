# Fix: Prefix JavaScript Identifiers Issue

## Problem

The folder prefixes (TXT-, IMG-, APP-, JIRA-) were causing JavaScript syntax errors in generated files because they contained hyphens, which are invalid in JavaScript identifiers like class names and export statements.

## Examples of Broken Code

```javascript
// BROKEN - Invalid JavaScript identifiers
class TXT-HOMEPage {  // ❌ Hyphen in class name
}
module.exports = { TXT-HOMEPage };  // ❌ Hyphen in export

const { APP-GeneratedFlowPage } = require('../Pages/APP-GeneratedFlow.page.js');  // ❌ Hyphen in import
```

## Solution

Created a new method `_toValidJSIdentifier()` in `AutoDesign.js` that:

1. **Keeps folder prefixes for clarity**: Output folders still use prefixes like `TXT-TestName`, `IMG-GeneratedFlow`, etc.
2. **Removes hyphens from JavaScript identifiers**: Class names, exports, and imports become `TXTTestNamePage`, `IMGGeneratedFlowPage`, etc.

## Changes Made

### 1. Added New Method (`src/AutoDesign.js`)

```javascript
/**
 * Convert string to valid JavaScript identifier (PascalCase without hyphens)
 */
_toValidJSIdentifier(str) {
  if (!str) return 'DefaultFeature';

  // Check if the string starts with a prefix pattern (3-4 uppercase letters followed by hyphen)
  const prefixMatch = str.match(/^([A-Z]{3,4})-(.+)$/);

  if (prefixMatch) {
    // Remove prefix and hyphen, convert only the name part to valid identifier
    const prefix = prefixMatch[1];
    const namePart = prefixMatch[2];
    const pascalCaseName = namePart
      .replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '')
      .replace(/^\w/, c => c.toUpperCase());
    return `${prefix}${pascalCaseName}`;
  }

  // Original behavior for strings without prefix - remove all non-alphanumeric characters
  return str
    .replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '')
    .replace(/^\w/, c => c.toUpperCase());
}
```

### 2. Updated Code Generation Logic

```javascript
_generateCode(plan) {
  const safeFeatureName = this._toPascalCase(plan.featureName); // For filenames and folders (keeps prefix)
  const validJSFeatureName = this._toValidJSIdentifier(plan.featureName); // For JS identifiers (removes hyphen)
  const pageClassName = `${validJSFeatureName}Page`;
  const pageInstanceName = `${validJSFeatureName.charAt(0).toLowerCase() + validJSFeatureName.slice(1)}Page`;
  // ...rest of code generation
}
```

### 3. Fixed All Existing Broken Files

Updated all existing generated files in the `output/` directory to use valid JavaScript identifiers:

- `TXT-HOME` → `TXTHOMEPage`
- `APP-GeneratedFlow` → `APPGeneratedFlowPage`
- `IMG-GeneratedFlow` → `IMGGeneratedFlowPage`
- `TXT-Summary` → `TXTSummaryPage`
- `TXT-Test` → `TXTTestPage`

## Results

### Before Fix (Broken)

```javascript
// Folder: TXT-TestName/
class TXT-TestNamePage {  // ❌ Syntax error
}
module.exports = { TXT-TestNamePage };  // ❌ Syntax error
```

### After Fix (Working)

```javascript
// Folder: TXT-TestName/ (prefix preserved for clarity)
class TXTTestNamePage {
  // ✅ Valid JavaScript
}
module.exports = { TXTTestNamePage }; // ✅ Valid JavaScript
```

## Benefits

1. **Folder organization**: Prefixes still help organize generated tests by type
2. **Valid JavaScript**: All generated code is syntactically correct
3. **Backward compatibility**: Existing tests work after applying the fix
4. **Clear naming**: Class names like `TXTHomePage`, `IMGLoginPage` are still descriptive

## Testing

- All existing generated files fixed and verified error-free
- New generations tested for all strategies (text, image, JIRA, recording)
- Both CLI and interactive UI confirmed working

## Files Modified

- `src/AutoDesign.js` - Added new identifier method and updated code generation
- All files in `output/*/Pages/*.page.js` - Fixed class names and exports
- All files in `output/*/Steps/*.steps.js` - Fixed imports and instantiation

The fix ensures that folder prefixes provide organization while keeping all JavaScript code valid and runnable.
