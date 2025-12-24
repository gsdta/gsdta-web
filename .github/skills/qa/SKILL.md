---
name: qa
description: Use this skill for testing and quality assurance tasks including writing tests, identifying bugs, creating test plans, and ensuring code quality. Applies when writing unit/integration/E2E tests, reviewing test coverage, or performing manual testing.
---

# QA Role Instructions

## Role Overview

As a QA engineer on the GSDTA project, you are responsible for ensuring software quality through comprehensive testing, identifying bugs, and validating that features meet requirements.

---

## Testing Standards

### Test Coverage Requirements

1. **Critical Paths** (Must have tests)
   - User authentication flows (login, logout, session management)
   - Data creation and modification operations
   - Role-based access control
   - Payment or sensitive data handling

2. **Important Features** (Should have tests)
   - Form submissions and validations
   - API endpoints
   - Navigation flows
   - State management

3. **Nice to Have**
   - Edge cases
   - UI component rendering
   - Performance benchmarks

---

## Test Types

### Unit Tests

Test individual functions and components in isolation.

```typescript
// Example: Testing a utility function
describe('calculateGradeAverage', () => {
  it('should calculate average correctly', () => {
    expect(calculateGradeAverage([80, 90, 100])).toBe(90);
  });

  it('should return 0 for empty array', () => {
    expect(calculateGradeAverage([])).toBe(0);
  });

  it('should handle single value', () => {
    expect(calculateGradeAverage([75])).toBe(75);
  });
});
```

### Integration Tests

Test API endpoints with authentication and database operations.

```typescript
describe('POST /api/v1/admin/students', () => {
  it('should create student with valid data', async () => {
    const response = await request(app)
      .post('/api/v1/admin/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'John',
        lastName: 'Doe',
        grade: '5'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();
  });

  it('should reject unauthenticated requests', async () => {
    const response = await request(app)
      .post('/api/v1/admin/students')
      .send({ firstName: 'John' });

    expect(response.status).toBe(401);
  });

  it('should reject invalid data', async () => {
    const response = await request(app)
      .post('/api/v1/admin/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: '' }); // Missing required fields

    expect(response.status).toBe(400);
  });
});
```

### E2E Tests

Test complete user flows in a browser environment.

```typescript
// Example: Student enrollment flow
test('admin can enroll a new student', async ({ page }) => {
  // Login as admin
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'admin@test.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-button"]');

  // Navigate to students
  await page.waitForURL('/admin/dashboard');
  await page.click('[data-testid="students-nav"]');

  // Add new student
  await page.click('[data-testid="add-student"]');
  await page.fill('[data-testid="firstName"]', 'Jane');
  await page.fill('[data-testid="lastName"]', 'Smith');
  await page.selectOption('[data-testid="grade"]', '5');
  await page.click('[data-testid="submit"]');

  // Verify success
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  await expect(page.locator('text=Jane Smith')).toBeVisible();
});
```

---

## Test Data Management

### Test Data Isolation

```typescript
// Use unique identifiers for test data
const testEmail = `test-${Date.now()}@example.com`;

// Clean up after tests
afterEach(async () => {
  await cleanupTestData(testId);
});

// Use test prefixes
const testStudent = {
  firstName: 'TEST_John',
  lastName: 'TEST_Doe',
  email: `test-${uuid()}@test.com`
};
```

### Seeding Test Data

```bash
# Seed emulator with test data
npm run seed

# Or use the seed script
./seed.sh
```

---

## Testing Checklist

### Before Testing a Feature

- [ ] Understand the requirements (read `/docs/ROLES.md`)
- [ ] Identify test scenarios (happy path, error cases, edge cases)
- [ ] Prepare test data
- [ ] Set up test environment

### During Testing

- [ ] Test happy path (expected usage)
- [ ] Test validation errors (invalid inputs)
- [ ] Test authentication (unauthorized access)
- [ ] Test authorization (wrong role access)
- [ ] Test edge cases (empty data, max limits, special characters)
- [ ] Test mobile responsiveness
- [ ] Test across browsers (Chrome, Firefox, Safari)

### After Testing

- [ ] Document found bugs clearly
- [ ] Verify fixes after implementation
- [ ] Update test cases if needed
- [ ] Clean up test data

---

## Bug Reporting Standards

### Bug Report Template

```markdown
## Bug Description
[Clear, concise description of the issue]

## Steps to Reproduce
1. [First step]
2. [Second step]
3. [Third step]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- Browser: [Chrome 120, Firefox 121, etc.]
- Device: [Desktop, Mobile, Tablet]
- Screen Size: [1920x1080, 375x812, etc.]
- User Role: [Admin, Teacher, Parent]

## Screenshots/Videos
[Attach if applicable]

## Severity
- [ ] Critical (app unusable, data loss)
- [ ] High (major feature broken)
- [ ] Medium (feature partially broken)
- [ ] Low (minor issue, workaround exists)
```

### Severity Definitions

| Severity | Definition | Examples |
|----------|------------|----------|
| Critical | App unusable, data corruption, security breach | Login broken, data not saving, unauthorized access |
| High | Major feature non-functional | Cannot create students, reports not generating |
| Medium | Feature partially works, has workaround | Filter not working, UI misalignment |
| Low | Minor issues, cosmetic problems | Typos, minor UI glitches |

---

## Security Testing

### Authentication Testing

```typescript
// Test unauthenticated access
it('should reject unauthenticated requests', async () => {
  const response = await request(app).get('/api/v1/admin/students');
  expect(response.status).toBe(401);
});

// Test expired tokens
it('should reject expired tokens', async () => {
  const response = await request(app)
    .get('/api/v1/admin/students')
    .set('Authorization', 'Bearer expired-token');
  expect(response.status).toBe(401);
});
```

### Authorization Testing

```typescript
// Test role-based access
it('should reject teacher accessing admin routes', async () => {
  const response = await request(app)
    .post('/api/v1/admin/students')
    .set('Authorization', `Bearer ${teacherToken}`)
    .send({ firstName: 'John', lastName: 'Doe' });

  expect(response.status).toBe(403);
});

// Test cross-user access
it('should not allow teacher to view other classes', async () => {
  const response = await request(app)
    .get('/api/v1/teacher/classes/other-teacher-class-id')
    .set('Authorization', `Bearer ${teacherToken}`);

  expect(response.status).toBe(403);
});
```

### Input Validation Testing

```typescript
// Test SQL injection attempts
it('should reject malicious input', async () => {
  const response = await request(app)
    .post('/api/v1/admin/students')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ firstName: "'; DROP TABLE students; --" });

  expect(response.status).toBe(400);
});

// Test XSS attempts
it('should sanitize script tags', async () => {
  const response = await request(app)
    .post('/api/v1/admin/students')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ firstName: '<script>alert("xss")</script>' });

  // Should either reject or sanitize
  expect(response.body.data?.firstName).not.toContain('<script>');
});
```

---

## Performance Testing

### Response Time Thresholds

| Endpoint Type | Expected Time |
|---------------|---------------|
| Simple GET | < 200ms |
| List with pagination | < 500ms |
| Create/Update | < 1000ms |
| Complex queries | < 2000ms |

### Testing Performance

```typescript
it('should return students list within 500ms', async () => {
  const start = Date.now();

  await request(app)
    .get('/api/v1/admin/students')
    .set('Authorization', `Bearer ${adminToken}`);

  const duration = Date.now() - start;
  expect(duration).toBeLessThan(500);
});
```

---

## Running Tests

### Commands

```bash
# Run all API tests
cd api && npm test

# Run specific test file
cd api && npm test -- students.test.ts

# Run UI tests
cd ui && npm test

# Run E2E tests
./run-e2e-tests.sh

# Run E2E tests with UI
./run-e2e-tests.sh --headed

# Run specific E2E test
npx playwright test enrollment.spec.ts
```

### Test Environment

```bash
# Start emulators for local testing
npm run emulators

# Seed test data
npm run seed

# Access emulator UI
# http://localhost:4445
```

---

## Regression Testing

### When to Run Regression

- Before every release
- After major refactoring
- After dependency updates
- After fixing critical bugs

### Regression Test Suite

Focus on critical user journeys:

1. **Admin Flow**
   - Login as admin
   - Create/edit/view students
   - Create/edit/view classes
   - Manage teachers
   - Generate reports

2. **Teacher Flow**
   - Login as teacher
   - View assigned classes
   - Take attendance
   - Enter grades

3. **Parent Flow**
   - Login as parent
   - View children's profiles
   - View attendance and grades

---

## Accessibility Testing

### Checklist

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Sufficient color contrast
- [ ] Form labels present
- [ ] Error messages accessible
- [ ] Focus states visible

### Tools

- Chrome DevTools Lighthouse
- axe DevTools browser extension
- NVDA/VoiceOver for screen reader testing

---

## Mobile Testing

### Devices to Test

| Device Type | Screen Sizes |
|-------------|--------------|
| Mobile | 320px, 375px, 414px |
| Tablet | 768px, 1024px |
| Desktop | 1280px, 1440px, 1920px |

### Mobile-Specific Tests

- [ ] Touch targets are large enough (44x44px minimum)
- [ ] Forms are usable on mobile keyboards
- [ ] Content is readable without zooming
- [ ] Navigation works (hamburger menu, etc.)
- [ ] Scrolling is smooth
- [ ] No horizontal overflow

---

## Quick Reference

### Test File Locations

| Type | Location |
|------|----------|
| API unit tests | `/api/tests/` |
| UI unit tests | `/ui/src/**/__tests__/` |
| E2E tests | `/ui/e2e/` or `/e2e/` |

### Test Naming Convention

```
feature.test.ts       # Unit tests
feature.spec.ts       # E2E tests
feature.integration.ts # Integration tests
```

### Useful Selectors

```typescript
// Prefer data-testid
page.locator('[data-testid="submit-button"]')

// Fallback to role
page.getByRole('button', { name: 'Submit' })

// Last resort: text
page.locator('text=Submit')
```

---

**Remember**: Testing is not about finding bugs, it's about preventing bugs from reaching production. Be thorough, be curious, be skeptical.
