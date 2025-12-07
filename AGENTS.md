# AI Agent Instructions - GSDTA Web Application

**Project**: GSDTA Tamil School Management System  
**For**: GitHub Copilot Agents & AI Assistants  
**Last Updated**: December 7, 2025

---

## General Agent Behavior

All AI agents working on this project should:

1. **Follow `.github/copilot-instructions.md`** for repo-wide behavior
2. **Read `/docs/ROLES.md` first** before implementing role-specific features
3. **Check existing code** for patterns before creating new approaches
4. **Build incrementally** - one feature at a time, fully tested
5. **Ask clarifying questions** when requirements are unclear
6. **Test thoroughly** using Firebase Emulators before considering complete

---

## Model-Specific Guidelines

### When Using Claude (Anthropic)

**Strengths**: Deep reasoning, comprehensive explanations, careful planning

**Preferred Approach**:
- Take time to understand the full context before coding
- Provide detailed step-by-step explanations for complex refactors
- Use explicit reasoning about trade-offs and alternatives
- Break down large tasks into smaller, manageable pieces
- Ask clarifying questions before making assumptions

**Code Style**:
- Prefer incremental changes over full file rewrites
- Show before/after examples for complex changes
- Explain the "why" behind architectural decisions
- Use TypeScript interfaces extensively with documentation

**Example Interaction**:
```
User: "Add a new student form"

Claude Response:
"I'll implement the student form feature incrementally:

1. First, let's define the data model and validation schema
2. Then create the API endpoint with proper auth
3. Finally build the UI component with form validation

Before I start, a few questions:
- Should parents be able to add students, or only admins?
- What fields are required vs optional?
- Any specific validation rules (age ranges, grade levels)?

Let me start with step 1..."
```

---

### When Using Gemini (Google)

**Strengths**: Excellent with Google Cloud/Firebase, concise solutions, practical focus

**Preferred Approach**:
- Leverage knowledge of Google Cloud Platform and Firebase
- Provide concise, practical solutions with clear examples
- Optimize for Firebase/Firestore best practices
- Use table-based organization for clarity
- Focus on production-ready, scalable solutions

**Code Style**:
- Prefer Firebase SDK patterns and best practices
- Use Firestore queries efficiently (proper indexing)
- Optimize for Google Cloud Run deployment
- Provide clear, structured explanations

**Example Interaction**:
```
User: "How should I structure Firestore queries for student enrollment?"

Gemini Response:
"Here's an efficient Firestore structure for student enrollment:

| Collection | Document ID | Fields |
|------------|-------------|--------|
| students | auto | name, grade, status |
| enrollments | auto | studentId, classId, year |

Query pattern:
```typescript
const enrollments = await db.collection('enrollments')
  .where('classId', '==', classId)
  .where('year', '==', currentYear)
  .get();
```

Index required in firestore.indexes.json:
- classId (ASC) + year (ASC)

This structure:
✓ Allows efficient class roster queries
✓ Supports historical enrollment data
✓ Scales to thousands of students"
```

---

### When Using OpenAI / ChatGPT

**Strengths**: Broad knowledge, balanced approach, iterative refinement

**Preferred Approach**:
- Provide clear, structured answers (lists, bullet points)
- Balance brevity with completeness
- Offer multiple approaches when relevant
- Iterate based on feedback
- Check assumptions before inventing patterns

**Code Style**:
- Follow TypeScript best practices strictly
- Use clear variable names and comments
- Prefer functional patterns in React
- Show complete, runnable examples

**Example Interaction**:
```
User: "Create a teacher dashboard"

ChatGPT Response:
"I'll create a teacher dashboard with these sections:

1. **My Classes** - List of assigned classes
2. **Recent Activity** - Student attendance, assignments
3. **Quick Actions** - Take attendance, grade assignments

Approach:
- Use Server Components for initial data load
- Client Components for interactive features
- Fetch data from `/api/v1/teacher/dashboard`

Shall I:
A) Start with the API endpoint first?
B) Create the UI components first?
C) Define the data model and interfaces?

What's your preference?"
```

---

## Common Patterns for All Agents

### 1. Feature Implementation Flow

```
1. Understand → Read ROLES.md, clarify requirements
2. Plan → Data model, API, UI, tests
3. Implement → Incrementally with testing
4. Verify → Run builds and tests
5. Document → Update docs if needed
```

### 2. Error Handling Pattern

```typescript
// All agents should use this pattern
try {
  // Validate input
  const data = schema.parse(req.body);
  
  // Business logic
  const result = await doSomething(data);
  
  // Success response
  res.json({ success: true, data: result });
  
} catch (error) {
  // Handle specific errors
  if (error instanceof z.ZodError) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid input' 
    });
  }
  
  // Log internal errors, return generic message
  console.error('Error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'An error occurred' 
  });
}
```

### 3. Authentication Pattern

```typescript
// All protected endpoints must use requireRole
import { requireRole } from '../../../middleware/auth';

// Admin only
router.post('/students', requireRole(['admin']), handler);

// Admin or Teacher
router.get('/classes', requireRole(['admin', 'teacher']), handler);

// Any authenticated user
router.get('/profile', requireRole(['parent', 'teacher', 'admin']), handler);
```

### 4. Component Structure Pattern

```typescript
// All React components should follow this structure
'use client'; // if client component

import { useState, useEffect } from 'react';

interface Props {
  // Define props
}

export function ComponentName({ }: Props) {
  // State
  const [data, setData] = useState<Type[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Effects
  useEffect(() => {
    // Fetch data
  }, []);
  
  // Handlers
  const handleAction = async () => {
    // Handle user action
  };
  
  // Render states
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  
  // Main render
  return <MainContent />;
}
```

---

## Testing Guidelines for Agents

### When to Write Tests

**Must write tests for**:
- Authentication/authorization logic
- Data validation functions
- Business logic calculations
- Critical user flows

**Can skip tests for**:
- Simple CRUD operations
- UI components with no logic
- Prototype features

### Running Tests Before Completion

```bash
# Always run these before considering a feature complete:
cd ui && npm run build         # UI builds without errors
cd api && npm run build        # API builds without errors
cd api && npm test             # API tests pass
./run-e2e-tests.sh             # E2E tests pass
```

---

## Firestore Best Practices (All Agents)

### Collection Naming
- Use plural names: `users`, `students`, `classes`
- Use camelCase: `roleInvites`, `studentEnrollments`

### Document Structure
```typescript
// Always include these fields
{
  id: string;              // Document ID
  createdAt: Timestamp;    // Creation time
  updatedAt: Timestamp;    // Last update time
  createdBy?: string;      // User UID who created
  updatedBy?: string;      // User UID who updated
  status: string;          // 'active' | 'inactive'
}
```

### Soft Deletes
```typescript
// ❌ Never do this
await studentRef.delete();

// ✅ Always do this
await studentRef.update({
  status: 'inactive',
  updatedAt: Timestamp.now(),
  updatedBy: currentUserId
});
```

---

## Security Checklist for Agents

Before submitting any code with security implications:

- [ ] Firebase ID tokens verified on server
- [ ] User role checked with `requireRole` middleware
- [ ] User status is 'active' (checked in auth middleware)
- [ ] Input validated with Zod schema (server-side)
- [ ] Firestore Security Rules updated if new collection
- [ ] No sensitive data in error messages to client
- [ ] No secrets hardcoded (use env variables)
- [ ] SQL injection not possible (using Firebase SDK, not SQL)
- [ ] XSS not possible (React escapes by default)

---

## Documentation Update Checklist

Update docs when:

- [ ] Adding a new feature (update ROLES.md checkbox)
- [ ] Changing authentication flow (update INFRASTRUCTURE-SETUP.md)
- [ ] Adding a new API endpoint (add to OpenAPI spec)
- [ ] Adding a new Firestore collection (update FIRESTORE-COLLECTIONS.md)
- [ ] Changing deployment process (update INFRASTRUCTURE-SETUP.md)
- [ ] Adding complex business logic (add code comments)

---

## Code Review Standards

Before considering code complete:

### Build & Tests
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] ESLint passes (`npm run lint`)
- [ ] All tests pass (`npm test` and `./run-e2e-tests.sh`)

### Code Quality
- [ ] Follows existing patterns
- [ ] Has proper error handling
- [ ] Has security checks (auth, validation)
- [ ] Is fully typed (no `any` without good reason)
- [ ] Has comments for complex logic

### Testing
- [ ] Works with Firebase Emulators locally
- [ ] No console errors in browser
- [ ] Handles loading states
- [ ] Handles error states
- [ ] Is responsive (works on mobile)

### Documentation
- [ ] Complex logic is commented
- [ ] Relevant docs updated
- [ ] API changes documented

---

## Remember

> "Make it work, make it right, make it fast - in that order."

**Focus on**:
- 🎯 Shipping working features incrementally
- 🔒 Security - never compromise
- 📝 Code quality - future maintainers will thank you
- 🧪 Testing - catch bugs early
- 📚 Documentation - code is read more than written

**This is a real application serving real users. Quality matters more than speed.**

---

## Questions to Ask Before Coding

1. **Is this feature in `/docs/ROLES.md`?**
   - If no, should we add it first?

2. **Does similar code already exist?**
   - If yes, follow that pattern

3. **What's the data model?**
   - Do we need a new collection?
   - What are the relationships?

4. **What's the security model?**
   - Who can access this?
   - What validation is needed?

5. **How will we test this?**
   - What's the happy path?
   - What are the edge cases?

**When in doubt, ask! It's better to clarify than to build the wrong thing.**

---

*For more details, see `.github/copilot-instructions.md` and `/docs/ROLES.md`*
