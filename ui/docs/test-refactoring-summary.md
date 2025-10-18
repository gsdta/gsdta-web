# Test Suite Refactoring - Language Separation

## Overview
The default language has been changed from English to Tamil in the LanguageProvider. This required creating separate test suites for each language to ensure proper test coverage.

## Changes Made

### Test Files Created (12 files total)

#### English Test Suites (6 files)
1. **home.en.spec.ts** - Homepage tests in English
   - Brand display verification
   - Navigation links and routing

2. **team.en.spec.ts** - Team page tests in English
   - Board, Executives, Teachers, Volunteers, FAQ sections
   - Content verification for team members

3. **documents.en.spec.ts** - Documents page tests in English
   - PDF viewer functionality
   - Document navigation

4. **calendar.en.spec.ts** - Calendar page tests in English
   - View mode toggles (Month, Week, Agenda)
   - Navigation controls
   - Download menu functionality

5. **mobile-header.en.spec.ts** - Mobile header tests in English
   - Menu toggle functionality
   - Mobile navigation

6. **home-carousel.en.spec.ts** - Homepage carousel tests in English
   - CTA button navigation to register page

#### Tamil Test Suites (6 files)
1. **home.ta.spec.ts** - Homepage tests in Tamil
   - Brand display (shows "GSDTA" in Tamil)
   - Tamil navigation links (எங்களைப் பற்றி, பதிவுசெய்க, குழு, etc.)

2. **team.ta.spec.ts** - Team page tests in Tamil
   - Tamil button labels (மன்றம், நிர்வாகம், ஆசிரியர்கள், etc.)
   - Tamil section headings

3. **documents.ta.spec.ts** - Documents page tests in Tamil
   - Tamil document categories (நியம விதிகள், வரிவிலக்கு, etc.)

4. **calendar.ta.spec.ts** - Calendar page tests in Tamil
   - Tamil view modes (மாதம், வாரம், அஜெண்டா)
   - Tamil navigation controls (இன்று, முன், அடுத்து)

5. **mobile-header.ta.spec.ts** - Mobile header tests in Tamil
   - Tamil menu items

6. **home-carousel.ta.spec.ts** - Homepage carousel tests in Tamil
   - Tamil CTA button (உடனே சேருங்கள்)

### Key Implementation Details

Each test suite includes:
- **Language initialization** in `beforeEach` hook:
  ```typescript
  await page.addInitScript(() => {
    window.localStorage.setItem("i18n:lang", "en"); // or "ta"
  });
  ```
- **Language-specific assertions** for text content
- **Proper cleanup** with cookie and session clearing

### Benefits

1. **Complete Coverage**: Tests verify both English and Tamil interfaces
2. **Isolated Testing**: Language-specific issues can be identified quickly
3. **Maintainability**: Clear separation makes it easier to update tests
4. **Future-Proof**: Easy to add more languages if needed

### Running Tests

```bash
# Run all E2E tests (both English and Tamil)
npm run test:e2e

# Run only English tests
npx playwright test --grep "English"

# Run only Tamil tests
npx playwright test --grep "Tamil"
```

## Notes

- All test files properly set the language before running tests
- The default language is now Tamil, so English tests explicitly set language to "en"
- Tamil tests explicitly set language to "ta" for clarity
- All tests include proper timeouts and cleanup

