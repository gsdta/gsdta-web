---
applyTo: "api/**/*.{ts,js}"
---

# Backend API Instructions

## API Structure

All API endpoints are in `/api/src/routes/v1/` and versioned:
- Current version: v1
- Base path: `/v1/`
- Examples: `/v1/me`, `/v1/admin/students`, `/v1/teacher/classes`

## Authentication Middleware

**Always use `requireRole` for protected endpoints:**

```typescript
import { requireRole } from '../middleware/auth';

// Admin only
router.post('/students', requireRole(['admin']), handler);

// Multiple roles
router.get('/classes', requireRole(['admin', 'teacher']), handler);
```

**The middleware automatically**:
1. Verifies Firebase ID token
2. Fetches user profile from Firestore
3. Checks user status is 'active'
4. Checks user has required role
5. Attaches `req.user` with user data

## Input Validation

**Always validate with Zod schemas:**

```typescript
import { z } from 'zod';

const createStudentSchema = z.object({
  firstName: z.string().min(1, 'First name required').max(50),
  lastName: z.string().min(1, 'Last name required').max(50),
  dateOfBirth: z.string().refine(
    val => !isNaN(Date.parse(val)),
    { message: 'Invalid date' }
  ),
  grade: z.string().min(1),
});

// In handler
try {
  const validData = createStudentSchema.parse(req.body);
  // Use validData...
} catch (error) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Invalid input',
      details: error.errors
    });
  }
}
```

## Response Format

**Standardized API responses:**

```typescript
// Success
res.status(200).json({
  success: true,
  data: { /* result */ }
});

// Client error (400-499)
res.status(400).json({
  success: false,
  error: 'User-friendly error message'
});

// Server error (500-599)
res.status(500).json({
  success: false,
  error: 'An unexpected error occurred'
  // Never expose internal error details to client
});
```

## Error Handling

**Comprehensive error handling pattern:**

```typescript
router.post('/', requireRole(['admin']), async (req, res) => {
  try {
    // 1. Validate input
    const data = schema.parse(req.body);
    
    // 2. Business logic with specific error handling
    try {
      const result = await doSomething(data);
      
      // 3. Success
      res.status(201).json({ success: true, data: result });
      
    } catch (businessError) {
      // Handle known business logic errors
      if (businessError.code === 'DUPLICATE') {
        return res.status(409).json({
          success: false,
          error: 'Resource already exists'
        });
      }
      throw businessError; // Re-throw unknown errors
    }
    
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: error.errors
      });
    }
    
    // Log internal errors
    console.error('Error in endpoint:', error);
    
    // Return generic error to client
    res.status(500).json({
      success: false,
      error: 'Failed to process request'
    });
  }
});
```

## Firestore Operations

**Use Firebase Admin SDK:**

```typescript
import { firestore } from '../lib/firestore';
import { Timestamp } from 'firebase-admin/firestore';

// Create
const ref = firestore.collection('students').doc();
await ref.set({
  id: ref.id,
  ...data,
  status: 'active',
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  createdBy: req.user.uid
});

// Read
const doc = await firestore.collection('students').doc(id).get();
const student = doc.exists ? doc.data() : null;

// Update
await firestore.collection('students').doc(id).update({
  ...updates,
  updatedAt: Timestamp.now(),
  updatedBy: req.user.uid
});

// Soft Delete (never hard delete)
await firestore.collection('students').doc(id).update({
  status: 'inactive',
  updatedAt: Timestamp.now(),
  updatedBy: req.user.uid
});

// Query
const snapshot = await firestore
  .collection('students')
  .where('status', '==', 'active')
  .where('grade', '==', '5')
  .orderBy('lastName')
  .limit(50)
  .get();

const students = snapshot.docs.map(doc => doc.data());
```

## Testing

**Write tests for critical logic:**

```typescript
// api/tests/routes/students.test.ts
import { describe, it, expect } from '@jest/globals';

describe('Student API', () => {
  it('should create student with valid data', async () => {
    const response = await request(app)
      .post('/v1/admin/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'John',
        lastName: 'Doe',
        grade: '5'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
  
  it('should reject invalid data', async () => {
    const response = await request(app)
      .post('/v1/admin/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: '' });
    
    expect(response.status).toBe(400);
  });
});
```

## API Documentation

**Add OpenAPI comments for documentation:**

```typescript
/**
 * @openapi
 * /v1/admin/students:
 *   post:
 *     summary: Create a new student
 *     tags: [Admin, Students]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, grade]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               grade:
 *                 type: string
 *     responses:
 *       201:
 *         description: Student created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', requireRole(['admin']), createStudent);
```

## Common Mistakes to Avoid

❌ **Don't** skip authentication checks  
❌ **Don't** trust client data without validation  
❌ **Don't** expose internal errors to clients  
❌ **Don't** hard delete data (use soft delete)  
❌ **Don't** forget timestamps (createdAt, updatedAt)  
❌ **Don't** use `any` types  
❌ **Don't** forget to handle errors  

✅ **Do** use `requireRole` middleware  
✅ **Do** validate with Zod schemas  
✅ **Do** log errors internally  
✅ **Do** soft delete with status field  
✅ **Do** add timestamps to all documents  
✅ **Do** use strict TypeScript  
✅ **Do** handle all error cases  

## Environment Variables

```typescript
// Access environment variables
const projectId = process.env.FIREBASE_PROJECT_ID;
const port = process.env.PORT || 8080;

// Never hardcode secrets
// ❌ const apiKey = 'abc123';
// ✅ const apiKey = process.env.API_KEY;
```

## Running Locally

```bash
# Start API with emulators
cd api
npm run dev

# API runs on http://localhost:8080
# Test: curl http://localhost:8080/v1/health
```
