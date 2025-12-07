# GitHub Copilot Instructions - GSDTA Web Application

**Project**: GSDTA Tamil School Management System  
**Last Updated**: December 7, 2025

---

## Project Overview

This is a **production school management system** for a non-profit Tamil educational organization. The application serves admins, teachers, and parents with role-specific features for managing students, classes, grades, and school operations.

### Tech Stack

| Component | Technology | Port |
|-----------|-----------|------|
| Frontend | Next.js 15 + React 19 + TypeScript | 3000 |
| Backend API | Node.js + Express + TypeScript | 8080 |
| Database | Firestore (Google Cloud) | - |
| Authentication | Firebase Auth | - |
| Hosting | Google Cloud Run | - |
| CI/CD | GitHub Actions | - |

### Architecture

- **Monorepo**: `/ui` (Next.js), `/api` (Node.js)
- **Single container deployment**: Both UI and API in one container
- **API proxy**: UI proxies `/api/*` → API's `/v1/*`
- **Local development**: Docker Compose with Firebase Emulators

---

## Core Development Principles

### 1. Incremental Development
- ✅ Build features ONE at a time, end-to-end
- ✅ Test thoroughly before moving to next feature
- ✅ Create database collections ONLY when feature needs them
- ❌ Do NOT try to implement multiple features simultaneously
- ❌ Do NOT create collections prematurely

### 2. Security First
- ✅ Always verify Firebase ID tokens on protected endpoints
- ✅ Check user role AND status on every protected route
- ✅ Validate inputs on both client and server (use Zod)
- ✅ Use Firestore Security Rules as additional layer
- ✅ Soft delete data (mark inactive, don't hard delete)
- ❌ Do NOT trust client-side validation alone
- ❌ Do NOT expose sensitive data in API responses
- ❌ Do NOT skip authentication checks

### 3. Code Quality
- ✅ TypeScript with strict mode enabled
- ✅ Proper error handling (try-catch with user-friendly messages)
- ✅ Follow existing patterns (check similar code first)
- ✅ Document complex logic with comments
- ✅ Run linter before committing
- ✅ Mobile-first responsive design (all UI must work on mobile)
- ✅ SEO optimization (metadata, SSR, robots.txt, sitemap)
- ❌ Do NOT use `any` types without good reason
- ❌ Do NOT skip error handling
- ❌ Do NOT commit TypeScript errors
- ❌ Do NOT build desktop-only layouts
- ❌ Do NOT skip SEO metadata on public pages

### 4. Data Integrity
- ✅ Soft delete: Mark records as 'inactive' instead of deleting
- ✅ Track timestamps: Always include createdAt, updatedAt
- ✅ Audit trails: Track who created/updated records
- ✅ Referential integrity: Maintain relationships
- ❌ Do NOT hard delete user data
- ❌ Do NOT break foreign key relationships

---

## Project Structure

```
gsdta-web/
├── api/                    # Backend API (Node.js + Express)
│   ├── src/
│   │   ├── routes/v1/      # API endpoints (versioned)
│   │   ├── lib/            # Shared libraries
│   │   ├── middleware/     # Express middleware
│   │   └── index.ts        # API entry point
│   └── tests/              # API tests
├── ui/                     # Frontend (Next.js 15)
│   ├── src/
│   │   ├── app/            # Next.js App Router
│   │   ├── components/     # React components
│   │   ├── contexts/       # React Context
│   │   └── lib/            # Client utilities
│   └── tests/              # UI tests
├── docs/                   # Documentation
│   ├── ROLES.md            # ⭐ Feature requirements by role
│   ├── INFRASTRUCTURE-SETUP.md
│   └── PRODUCTION-READINESS.md
├── persistence/            # Firestore config
│   ├── firestore.rules     # Security rules
│   └── firestore.indexes.json
└── .github/                # CI/CD & Copilot config
```

---

## Development Workflow

### Before Starting Any Feature

1. **Read requirements**: Check `/docs/ROLES.md` for feature details
2. **Check existing code**: Look for similar patterns
3. **Plan the approach**: Think through data model, API, UI
4. **Ask if unclear**: Better to clarify than implement wrong

### When Implementing a Feature

1. **Data Model** (if new collection needed):
   - Define TypeScript interfaces
   - Add Firestore indexes if compound queries needed
   - Add security rules in `firestore.rules`

2. **API Endpoint**:
   - Create route in `/api/src/routes/v1/`
   - Add auth guard: `requireRole(['admin', 'teacher'])`
   - Add input validation (Zod schemas)
   - Add error handling
   - Test with curl or Postman

3. **UI Component**:
   - Create React component in `/ui/src/`
   - Use existing UI components when possible
   - Design mobile-first (responsive for all screen sizes)
   - Add form validation
   - Add loading & error states
   - Add SEO metadata (title, description, Open Graph)
   - Use Server Components for SEO-critical content
   - Test in browser (desktop + mobile views)

4. **Tests**:
   - Write tests for critical business logic
   - Integration tests for API endpoints
   - E2E tests for critical user flows

5. **Documentation**:
   - **ALWAYS keep documentation current** - update existing `.md` files as you work
   - When making changes, immediately update related docs in `/docs/`
   - Update checkboxes in `/docs/ROLES.md` when implementing features
   - Add comments for complex logic

---

## Code Patterns

### API Endpoint Pattern

```typescript
// api/src/routes/v1/admin/students.ts
import express from 'express';
import { z } from 'zod';
import { requireRole } from '../../../middleware/auth';

const router = express.Router();

// Validation schema
const createStudentSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  grade: z.string(),
});

// Endpoint with auth
router.post('/', requireRole(['admin']), async (req, res) => {
  try {
    const data = createStudentSchema.parse(req.body);
    // Business logic here
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
```

### React Component Pattern

```typescript
// ui/src/components/StudentList.tsx
'use client';

import { useState, useEffect } from 'react';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
}

export function StudentList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudents() {
      try {
        const response = await fetch('/api/v1/students');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setStudents(data.data.students);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {students.map(s => (
        <div key={s.id}>{s.firstName} {s.lastName}</div>
      ))}
    </div>
  );
}
```

---

## Testing

### Local Development with Firebase Emulators

**All local development uses Firebase Emulators**:
- Real Firebase Authentication
- Real Firestore operations
- Security rules enforced
- Offline-capable

**Starting Development**:
```bash
# Quick start (recommended)
./start-dev-local.sh

# Manual start
npm run emulators

# With Docker
docker-compose -f docker-compose.local.yml up
```

**Access Points**:
- UI: http://localhost:3000
- API: http://localhost:8080
- Emulator UI: http://localhost:4445

### Running Tests

```bash
# API tests
cd api && npm test

# UI tests  
cd ui && npm test

# E2E tests (includes emulators)
./run-e2e-tests.sh
```

---

## Important Rules

### ✅ ALWAYS DO

1. Read `/docs/ROLES.md` before implementing role features
2. Check existing patterns before creating new ones
3. Use TypeScript strictly (no `any` types)
4. Validate inputs on both client and server
5. Handle all errors with user-friendly messages
6. Use `requireRole` middleware on protected routes
7. Test incrementally as you build
8. Soft delete data (mark inactive, don't remove)
9. Add timestamps (createdAt, updatedAt) to all documents
10. Ask when unsure - better to clarify than guess

### ❌ NEVER DO

1. Skip security checks (auth is mandatory)
2. Trust client-side data (always validate server-side)
3. Hardcode secrets (use environment variables)
4. Expose internal errors to users (log details, show generic message)
5. Break existing working code
6. Add database collections until feature needs them
7. Commit TypeScript compilation errors
8. Ignore ESLint warnings
9. Deploy without testing locally
10. Make breaking API changes without versioning

---

## Common Commands

```bash
# Development
./start-dev-local.sh          # Start everything (interactive)
npm run emulators             # Start Firebase emulators only

# Building
cd ui && npm run build        # Build UI
cd api && npm run build       # Build API

# Testing
cd api && npm test            # Run API tests
./run-e2e-tests.sh            # Run E2E tests with emulators

# Seeding
npm run seed                  # Seed emulator data
./seed.sh                     # Quick seed script

# Deployment
firebase deploy --only firestore:rules,firestore:indexes
```

---

## Environment Variables

### API (.env)
```bash
NODE_ENV=development
PORT=8080
FIREBASE_PROJECT_ID=your-project-id
GOOGLE_CLOUD_PROJECT=your-project-id
```

### UI (.env.local)
```bash
NEXT_PUBLIC_API_BASE_URL=/api
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx
```

---

## Getting Help

1. **Project Docs**: Check `/docs/` folder first
   - `ROLES.md` - Feature requirements
   - `PROJECT-STATUS.md` - Implementation status
   - `INFRASTRUCTURE-SETUP.md` - Deployment guide

2. **Code Examples**: Look for similar features
   - Teacher invite system (reference implementation)
   - User authentication and routing
   - API authentication guards

3. **When Stuck**: Ask specific questions with context

---

## Success Criteria

A feature is complete when:

✅ Works correctly (tested manually)  
✅ Is secure (auth/validation implemented)  
✅ Handles errors gracefully  
✅ Is fully typed (no `any`)  
✅ Has tests for critical paths  
✅ Is documented (complex logic commented)  
✅ Follows existing patterns  
✅ Builds without errors  

---

**Remember**: Quality over speed. Take time to do it right. This is a real application serving real users.
