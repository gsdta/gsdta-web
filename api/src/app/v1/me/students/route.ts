import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { getStudentsByParentId, createStudent } from '@/lib/firestoreStudents';
import { randomUUID } from 'crypto';
import { z } from 'zod';

// Zod schema for parent contact
const parentContactSchema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().email().max(200).optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  employer: z.string().max(200).optional(),
}).optional();

// Zod schema for student registration
const createStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  gender: z.enum(['Boy', 'Girl', 'Other']).optional(),
  grade: z.string().max(50).optional(),
  schoolName: z.string().max(200).optional(),
  schoolDistrict: z.string().max(200).optional(),
  priorTamilLevel: z.string().max(50).optional(),
  enrollingGrade: z.string().max(50).optional(),
  address: z.object({
    street: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    zipCode: z.string().max(20).optional(),
  }).optional(),
  contacts: z.object({
    mother: parentContactSchema,
    father: parentContactSchema,
  }).optional(),
  medicalNotes: z.string().max(1000).optional(),
  photoConsent: z.boolean().optional(),
});

/**
 * @swagger
 * /api/v1/me/students:
 *   get:
 *     summary: Get students linked to current user
 *     description: Returns all students where the current user is set as the parent.
 *     tags:
 *       - Parent
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of linked students
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     students:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           grade:
 *                             type: string
 *                           schoolName:
 *                             type: string
 *                           enrollmentDate:
 *                             type: string
 *                           status:
 *                             type: string
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: User not active
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isDev() {
  return process.env.NODE_ENV !== 'production';
}

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (isDev()) {
    if (origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.match(/^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/)) {
      return origin;
    }
    return null;
  }
  const prodAllowed = new Set<string>([
    'https://www.gsdta.com',
  ]);
  return prodAllowed.has(origin) ? origin : null;
}

function corsHeaders(origin: string | null) {
  const allow = allowedOrigin(origin);
  const headers: Record<string, string> = {
    'Vary': 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
  if (allow) {
    headers['Access-Control-Allow-Origin'] = allow;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

function jsonError(status: number, code: string, message: string, origin: string | null) {
  const res = NextResponse.json({ code, message }, { status });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const res = new NextResponse(null, { status: 204 });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

/**
 * GET /api/v1/me/students
 * Returns students linked to the current authenticated user.
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();

  try {
    const authz = req.headers.get('authorization');
    const authContext = await requireAuth(authz, { requireActive: true });
    const { token } = authContext;

    // Get students linked to this parent
    const students = await getStudentsByParentId(token.uid);

    const responseBody = {
      success: true,
      data: {
        students,
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, uid: token.uid, path: '/api/v1/me/students', method: 'GET', count: students.length }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: '/api/v1/me/students', method: 'GET', error: 'internal' }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * @swagger
 * /api/v1/me/students:
 *   post:
 *     summary: Register a new student (parent registration)
 *     description: Creates a new student linked to the current authenticated parent with pending status.
 *     tags:
 *       - Parent
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - dateOfBirth
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 description: Date in YYYY-MM-DD format
 *               grade:
 *                 type: string
 *               schoolName:
 *                 type: string
 *               priorTamilLevel:
 *                 type: string
 *               medicalNotes:
 *                 type: string
 *               photoConsent:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Student created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: User not active or not a parent
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();

  try {
    const authz = req.headers.get('authorization');
    // Require parent role for student registration
    const authContext = await requireAuth(authz, { requireActive: true, requireRoles: ['parent'] });
    const { token, profile } = authContext;

    // Parse and validate request body
    const body = await req.json();
    const parseResult = createStudentSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    // Create the student with pending status
    const student = await createStudent(
      token.uid,
      profile.email || '',
      parseResult.data
    );

    const responseBody = {
      success: true,
      data: {
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          name: `${student.firstName} ${student.lastName}`,
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
          grade: student.grade,
          schoolName: student.schoolName,
          schoolDistrict: student.schoolDistrict,
          priorTamilLevel: student.priorTamilLevel,
          enrollingGrade: student.enrollingGrade,
          address: student.address,
          contacts: student.contacts,
          medicalNotes: student.medicalNotes,
          photoConsent: student.photoConsent,
          status: student.status,
          parentId: student.parentId,
          parentEmail: student.parentEmail,
          createdAt: student.createdAt.toDate().toISOString(),
        },
      },
    };

    const res = NextResponse.json(responseBody, { status: 201 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, uid: token.uid, path: '/api/v1/me/students', method: 'POST', studentId: student.id }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof SyntaxError) {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON in request body', origin);
    }
    console.error(JSON.stringify({ requestId, path: '/api/v1/me/students', method: 'POST', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
