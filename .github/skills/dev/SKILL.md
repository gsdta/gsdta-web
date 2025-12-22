---
name: developer
description: Use this skill for development tasks including writing code, implementing features, fixing bugs, refactoring, and following coding standards. Applies when building new functionality, modifying existing code, or performing code reviews.
---

# Developer Role Instructions

## Role Overview

As a developer on the GSDTA project, you are responsible for building features end-to-end, maintaining code quality, and ensuring the application remains secure and performant.

---

## Development Standards

### Before Starting Work

1. **Understand Requirements**
   - Read relevant docs in `/docs/` folder (especially `ROLES.md`)
   - Check existing patterns in the codebase
   - Clarify ambiguous requirements before coding

2. **Plan Your Approach**
   - Think through data model, API, and UI
   - Identify dependencies and potential blockers
   - Break complex features into smaller tasks

### Code Quality Requirements

1. **TypeScript Strict Mode**
   ```typescript
   // Proper typing
   interface Student {
     id: string;
     firstName: string;
     lastName: string;
     grade: string;
   }

   const students: Student[] = [];

   // Avoid 'any' - Never do this
   const data: any = {};
   ```

2. **Error Handling**
   ```typescript
   // Comprehensive error handling
   try {
     const result = await performOperation();
     return { success: true, data: result };
   } catch (error) {
     console.error('Operation failed:', error);
     return { success: false, error: 'User-friendly message' };
   }

   // Never ignore errors
   try {
     await operation();
   } catch {} // Never do this
   ```

3. **Input Validation**
   - Always validate on server-side (client validation is optional)
   - Use Zod schemas for structured validation
   - Never trust client data

---

## Git Workflow

### Branch Naming

```
feature/description    # New features
fix/description        # Bug fixes
refactor/description   # Code refactoring
test/description       # Adding tests
```

### Commit Messages

```bash
# Format: type: brief description
feat: add student enrollment form
fix: resolve date parsing error in attendance
refactor: extract common API utilities
test: add unit tests for grade calculation
docs: update API documentation
```

### Pull Request Standards

1. **Before Creating PR**
   - Run linter: `npm run lint`
   - Run tests: `npm test`
   - Build successfully: `npm run build`
   - Test locally in browser

2. **PR Description**
   - Describe what changes were made and why
   - List testing steps
   - Note any breaking changes
   - Reference related issues

---

## Security Standards

### Authentication

```typescript
// Always use authentication middleware
router.post('/', requireRole(['admin']), handler);

// Check user status
if (req.user.status !== 'active') {
  return res.status(403).json({ error: 'Account inactive' });
}

// Never skip auth checks for protected routes
router.post('/', handler); // Never for protected routes
```

### Data Handling

```typescript
// Soft delete
await doc.update({ status: 'inactive', updatedAt: Timestamp.now() });

// Never hard delete user data
await doc.delete(); // Never delete user data

// Track audit info
{
  createdAt: Timestamp.now(),
  createdBy: req.user.uid,
  updatedAt: Timestamp.now(),
  updatedBy: req.user.uid
}
```

### Secrets Management

```typescript
// Use environment variables
const apiKey = process.env.API_KEY;

// Never hardcode secrets
const apiKey = 'sk-abc123'; // Never do this
```

---

## Testing Requirements

### What to Test

- Critical business logic
- API endpoints (authentication, validation, success/error paths)
- Complex UI interactions
- Edge cases and error scenarios

### Test Structure

```typescript
describe('Feature', () => {
  describe('Success scenarios', () => {
    it('should handle valid input correctly', () => {});
  });

  describe('Error scenarios', () => {
    it('should reject invalid input', () => {});
    it('should handle server errors gracefully', () => {});
  });

  describe('Edge cases', () => {
    it('should handle empty arrays', () => {});
  });
});
```

### Running Tests

```bash
# API tests
cd api && npm test

# UI tests
cd ui && npm test

# E2E tests
./run-e2e-tests.sh
```

---

## Performance Guidelines

### API Optimization

```typescript
// Limit query results
const snapshot = await firestore
  .collection('students')
  .where('status', '==', 'active')
  .limit(50)
  .get();

// Use efficient queries - add compound indexes for complex queries

// Don't fetch all documents - avoid for large collections
const allDocs = await collection.get();
```

### Frontend Optimization

```typescript
// Lazy load components
const HeavyComponent = dynamic(() => import('./HeavyComponent'));

// Memoize expensive calculations
const result = useMemo(() => expensiveCalculation(data), [data]);

// Debounce frequent operations
const debouncedSearch = useMemo(
  () => debounce(search, 300),
  []
);
```

---

## Documentation Requirements

### Code Documentation

```typescript
/**
 * Calculate the grade percentage for a student.
 *
 * @param scores - Array of assignment scores (0-100)
 * @param weights - Optional weights for each score
 * @returns Weighted average percentage
 */
function calculateGrade(scores: number[], weights?: number[]): number {
  // Implementation
}
```

### When to Document

- Complex business logic
- Non-obvious implementation decisions
- Public API functions
- Configuration options

### Keep Docs Updated

- Update `/docs/` when implementing features
- Mark completed items in `ROLES.md`
- Add comments for complex logic

---

## Code Review Checklist

When reviewing code, verify:

- [ ] No TypeScript errors or `any` types
- [ ] Proper error handling
- [ ] Input validation on server
- [ ] Authentication on protected routes
- [ ] Tests for critical paths
- [ ] No hardcoded secrets
- [ ] Mobile-responsive UI
- [ ] Loading and error states in UI
- [ ] Follows existing patterns

---

## Common Mistakes to Avoid

| Mistake | Correct Approach |
|---------|------------------|
| Skipping error handling | Always catch and handle errors |
| Using `any` type | Define proper interfaces |
| Hardcoding values | Use config/env variables |
| Skipping auth middleware | Use `requireRole()` on all protected routes |
| Hard deleting data | Soft delete with status field |
| Desktop-only UI | Design mobile-first |
| Skipping tests | Write tests for critical logic |
| Large PRs | Keep PRs focused and small |

---

## Quick Reference

### Commands

```bash
# Development
./start-dev-local.sh    # Start development environment

# Building
npm run build           # Build project

# Testing
npm run test            # Run tests
npm run lint            # Check linting

# Database
npm run seed            # Seed test data
```

### Key Locations

| Purpose | Location |
|---------|----------|
| API routes | `/api/src/routes/v1/` |
| UI pages | `/ui/src/app/` |
| Components | `/ui/src/components/` |
| Documentation | `/docs/` |
| Security rules | `/persistence/firestore.rules` |

---

**Remember**: Write code as if the person maintaining it is a developer who knows where you live. Quality matters more than speed.
