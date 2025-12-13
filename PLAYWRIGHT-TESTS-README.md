# Playwright E2E Tests for Student-Class Enrollment

**Date**: December 13, 2025  
**Status**: ✅ Complete  
**Tests**: 15 browser E2E tests

---

## Overview

Playwright tests provide **full browser automation** testing for the student-class enrollment roster feature, covering:
- ✅ Real user navigation flows
- ✅ Browser interactions (clicks, forms, dialogs)
- ✅ Visual feedback (loading states, error messages)
- ✅ Mobile responsive design
- ✅ Cross-browser compatibility

---

## Why Playwright Tests?

### What Playwright Tests Cover (That Other Tests Don't)

| Aspect | Unit Tests | API E2E | Component Tests | Playwright |
|--------|------------|---------|-----------------|------------|
| Function logic | ✅ | - | - | - |
| API contracts | - | ✅ | - | ✅ |
| Component rendering | - | - | ✅ | ✅ |
| User navigation | - | - | - | ✅ |
| Browser interactions | - | - | ❌ Mocked | ✅ Real |
| Confirmation dialogs | - | - | ❌ Mocked | ✅ Real |
| Mobile responsiveness | - | - | ❌ | ✅ |
| Cross-browser | - | - | - | ✅ |
| Full user journey | - | - | - | ✅ |

### Unique Value of Playwright Tests

1. **Real Browser Environment**: Tests run in actual Chromium/Firefox/Safari
2. **User Perspective**: Tests what users actually see and do
3. **Navigation Flows**: Tests multi-page workflows (list → edit → roster)
4. **Visual Feedback**: Verifies loading spinners, error messages appear
5. **Responsive Design**: Tests mobile and desktop layouts
6. **Dialog Handling**: Tests real browser confirmation dialogs
7. **Integration**: Tests frontend + backend + database together

---

## Test File Location

```
ui/tests/e2e/admin/class-roster.spec.ts
```

---

## Running Playwright Tests

### All Roster Tests
```bash
cd ui
npx playwright test class-roster.spec.ts
```

### Single Test
```bash
cd ui
npx playwright test class-roster.spec.ts -g "ROSTER-E2E-001"
```

### Headed Mode (See Browser)
```bash
cd ui
npx playwright test class-roster.spec.ts --headed
```

### Debug Mode
```bash
cd ui
npx playwright test class-roster.spec.ts --debug
```

### Specific Browser
```bash
cd ui
npx playwright test class-roster.spec.ts --project=chromium
npx playwright test class-roster.spec.ts --project=firefox
npx playwright test class-roster.spec.ts --project=webkit  # Safari
```

### Generate Report
```bash
cd ui
npx playwright test class-roster.spec.ts
npx playwright show-report
```

---

## Test Coverage

### Test Cases (15 Total)

#### Navigation & Flow Tests (5)
- **ROSTER-E2E-001**: Navigate to roster from class list → edit → roster
- **ROSTER-E2E-008**: Navigate back to class edit page
- **ROSTER-E2E-009**: Breadcrumb navigation to classes list
- **ROSTER-E2E-010**: Student links navigate to detail page
- **ROSTER-E2E-011**: Loading state displays correctly

#### Display & UI Tests (5)
- **ROSTER-E2E-002**: View empty class roster
- **ROSTER-E2E-003**: View roster with enrolled students
- **ROSTER-E2E-004**: Display correct capacity information
- **ROSTER-E2E-013**: Full capacity indicator appears
- **ROSTER-E2E-015**: Status badges display with colors

#### Interaction Tests (3)
- **ROSTER-E2E-005**: Assign Students button shows correct state
- **ROSTER-E2E-006**: Remove student confirmation dialog
- **ROSTER-E2E-007**: Remove student flow (with confirmation)

#### Error & Edge Cases (2)
- **ROSTER-E2E-012**: Error state when class not found
- **ROSTER-E2E-014**: Mobile responsive design

---

## Test Scenarios

### Scenario 1: Happy Path - View Roster
```
1. Admin logs in
2. Goes to Classes page
3. Clicks "Edit" on a class
4. Clicks "View Roster"
5. Sees roster table with students
6. Verifies capacity display
7. Clicks student name → goes to detail page
```

### Scenario 2: Remove Student
```
1. Admin navigates to class roster
2. Clicks "Remove" on a student
3. Sees confirmation dialog with student name
4. Clicks "OK" to confirm
5. Student removed from roster
6. Enrolled count decremented
7. If last student, sees "No students enrolled yet"
```

### Scenario 3: Mobile Experience
```
1. Set viewport to mobile size (375x667)
2. Navigate to roster
3. Verify page displays correctly
4. Verify table is scrollable
5. Verify buttons are touch-friendly
```

### Scenario 4: Empty Roster
```
1. Create new class
2. Navigate to roster
3. Sees "No students enrolled yet"
4. Sees "0 / 20 students"
5. Sees "20 spots available"
6. Assign button enabled
```

---

## Prerequisites

### Required Services
```bash
# Terminal 1: Firebase Emulators
cd api && npm run emulators

# Terminal 2: Next.js Dev Server
cd ui && npm run dev

# Terminal 3: Run Playwright Tests
cd ui && npx playwright test
```

### Seeded Data
The tests rely on seeded data from `scripts/seed-emulator.js`:
- Grades (PS-1, PS-2, etc.)
- Classes with various enrollments
- Students in different statuses
- Admin user credentials

---

## Test Configuration

### playwright.config.ts Settings
```typescript
{
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
}
```

---

## Key Test Patterns

### Login Helper
```typescript
// Uses reusable auth helper
await loginAsAdmin(page);
```

### Waiting for Data
```typescript
// Wait for table to load
await page.waitForSelector('table', { timeout: 10000 });
```

### Dialog Handling
```typescript
// Handle confirmation dialogs
page.on('dialog', async dialog => {
  expect(dialog.message()).toContain('Remove');
  await dialog.accept(); // or dialog.dismiss()
});
```

### Mobile Testing
```typescript
// Set mobile viewport
await page.setViewportSize({ width: 375, height: 667 });
```

### Assertions
```typescript
// Verify element visible
await expect(page.getByText('No students enrolled yet')).toBeVisible();

// Verify URL
await expect(page).toHaveURL(/.*\/roster/);

// Verify count
const rows = await page.locator('table tbody tr').count();
expect(rows).toBeGreaterThan(0);
```

---

## Debugging Tests

### Visual Debugging
```bash
# Open Playwright Inspector
npx playwright test class-roster.spec.ts --debug

# Run in headed mode
npx playwright test class-roster.spec.ts --headed --slowmo=1000
```

### Screenshots & Videos
Failed tests automatically capture:
- Screenshot at failure point
- Video recording of test execution
- Located in: `ui/test-results/`

### Trace Viewer
```bash
# Run with trace
npx playwright test class-roster.spec.ts --trace on

# View trace
npx playwright show-trace test-results/.../trace.zip
```

### Console Logs
```typescript
// Add debug logging
console.log('Current URL:', page.url());
console.log('Enrolled count:', await page.textContent('.enrolled-count'));
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Playwright Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      
      # Install Playwright browsers
      - name: Install Playwright
        run: cd ui && npx playwright install --with-deps
      
      # Start services
      - name: Start Emulators
        run: cd api && npm run emulators &
      
      - name: Start Next.js
        run: cd ui && npm run dev &
      
      # Run tests
      - name: Run Playwright Tests
        run: cd ui && npx playwright test
      
      # Upload results
      - uses: actions/upload-artifact@v2
        if: failure()
        with:
          name: playwright-results
          path: ui/test-results/
```

---

## Common Issues & Solutions

### Tests Timing Out
**Problem**: Tests timeout waiting for elements
**Solution**: Increase timeout or check if services are running
```typescript
await page.waitForSelector('table', { timeout: 15000 });
```

### Flaky Tests
**Problem**: Tests pass sometimes, fail other times
**Solution**: Use proper waiting strategies
```typescript
// ❌ Don't use arbitrary waits
await page.waitForTimeout(1000);

// ✅ Wait for specific conditions
await expect(page.getByText('Loaded')).toBeVisible();
```

### Dialog Not Appearing
**Problem**: Confirmation dialog test fails
**Solution**: Set up dialog handler before triggering action
```typescript
// Set handler BEFORE clicking button
page.on('dialog', async dialog => await dialog.accept());
await page.click('button');
```

### Emulator Data Issues
**Problem**: Tests fail because expected data missing
**Solution**: Verify emulators are seeded
```bash
cd api && npm run seed:emulator
```

---

## Test Maintenance

### When to Update Tests

1. **UI Changes**: Update selectors if components change
2. **New Features**: Add tests for new functionality
3. **Navigation Changes**: Update navigation flow tests
4. **Error Messages**: Update expected error text

### Best Practices

- ✅ Use data-testid for stable selectors
- ✅ Test user journeys, not implementation
- ✅ Keep tests independent (no shared state)
- ✅ Use Page Object Model for complex pages
- ✅ Clean up test data between runs
- ❌ Don't test API directly (use API E2E tests)
- ❌ Don't hardcode delays (use waitFor)
- ❌ Don't depend on test execution order

---

## Comparison: Jest vs Playwright

### Use Jest Component Tests When:
- ✅ Testing component logic in isolation
- ✅ Fast feedback needed (< 1 second)
- ✅ Mocking external dependencies
- ✅ Testing edge cases exhaustively

### Use Playwright E2E Tests When:
- ✅ Testing complete user workflows
- ✅ Verifying navigation between pages
- ✅ Testing real browser interactions
- ✅ Validating responsive design
- ✅ Integration testing (UI + API + DB)

### Both Are Valuable!
- Jest: Fast, focused, many test cases
- Playwright: Comprehensive, realistic, critical paths

---

## Performance

### Typical Test Duration
- Single test: 5-10 seconds
- Full suite (15 tests): 1-2 minutes
- With video/trace: +20-30%

### Optimization Tips
```typescript
// Run tests in parallel
npx playwright test --workers=4

// Skip slow tests in dev
test.skip('slow test', () => {});

// Use fixtures to share setup
test.use({ storageState: 'admin-state.json' });
```

---

## Future Enhancements

### Additional Tests to Add

**Phase 2.1: Bulk Assign UI**
- [ ] Test student selector modal
- [ ] Test multi-select functionality
- [ ] Test grade filtering
- [ ] Test capacity warnings

**Accessibility**
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] ARIA attributes

**Performance**
- [ ] Load time benchmarks
- [ ] Large roster rendering (100+ students)

**Visual Regression**
- [ ] Screenshot comparison tests
- [ ] Responsive design snapshots

---

## Resources

- **Playwright Docs**: https://playwright.dev
- **Best Practices**: https://playwright.dev/docs/best-practices
- **API Reference**: https://playwright.dev/docs/api/class-test
- **Test Examples**: `/ui/tests/e2e/admin/classes.spec.ts`

---

## Summary

✅ **15 Playwright tests** covering full roster experience  
✅ **Real browser automation** (Chromium, Firefox, Safari)  
✅ **Complete user journeys** from login to interaction  
✅ **Mobile responsive** testing included  
✅ **CI/CD ready** with screenshots/videos on failure  

Playwright tests ensure the student-class enrollment roster works perfectly for end users in real-world conditions!

---

**Last Updated**: December 13, 2025  
**Test Framework**: Playwright v1.x  
**Test Status**: ✅ All 15 tests passing
