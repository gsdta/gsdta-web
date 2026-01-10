import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { createClass, getAllClasses, getActiveClassOptions } from '@/lib/firestoreClasses';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schema for creating a class
const createClassSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  gradeId: z.string().min(1, 'Grade is required').max(50),
  day: z.string().min(1, 'Day is required').max(20),
  time: z.string().min(1, 'Time is required').max(50),
  capacity: z.number().int().min(1).max(100),
  academicYear: z.string().max(20).optional(),
});

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
    'https://gsdta.com',
    'https://www.gsdta.com',
    'https://app.gsdta.com',
    'https://app.qa.gsdta.com',
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
  const res = NextResponse.json({ success: false, code, message }, { status });
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
 * @swagger
 * /api/v1/admin/classes:
 *   get:
 *     summary: List all classes (admin)
 *     description: Returns a list of all classes with optional filters.
 *     tags:
 *       - Admin - Classes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, all]
 *         description: Filter by class status
 *       - in: query
 *         name: gradeId
 *         schema:
 *           type: string
 *         description: Filter by grade ID
 *       - in: query
 *         name: options
 *         schema:
 *           type: boolean
 *         description: If true, return simplified class options for dropdowns
 *     responses:
 *       200:
 *         description: List of classes
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Insufficient privileges
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });
    await requireFeature('admin', 'Classes');

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'active' | 'inactive' | 'all' | null;
    const gradeId = searchParams.get('gradeId');
    const optionsOnly = searchParams.get('options') === 'true';

    // If requesting options, return simplified list
    if (optionsOnly) {
      const options = await getActiveClassOptions();
      // Convert timestamps for JSON response
      const formattedOptions = options.map((opt) => ({
        ...opt,
        teachers: opt.teachers.map((t) => ({
          ...t,
          assignedAt: t.assignedAt?.toDate?.()?.toISOString() ?? '',
        })),
      }));
      const responseBody = {
        success: true,
        data: {
          options: formattedOptions,
        },
      };

      const res = NextResponse.json(responseBody, { status: 200 });
      const headers = corsHeaders(origin);
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    // Get full class list with filters
    const result = await getAllClasses({
      status: status || 'all',
      gradeId: gradeId || undefined,
    });

    // Format classes for response
    const formattedClasses = result.classes.map((c) => ({
      id: c.id,
      name: c.name,
      gradeId: c.gradeId || '',
      gradeName: c.gradeName || c.level || '', // Fallback to level for legacy
      day: c.day,
      time: c.time,
      capacity: c.capacity,
      enrolled: c.enrolled,
      available: c.capacity - c.enrolled,
      teachers: (c.teachers || []).map((t) => ({
        ...t,
        assignedAt: t.assignedAt?.toDate?.()?.toISOString() ?? '',
      })),
      // Legacy fields for backward compatibility
      level: c.level,
      teacherId: c.teacherId,
      teacherName: c.teacherName,
      status: c.status,
      academicYear: c.academicYear,
      createdAt: c.createdAt?.toDate?.()?.toISOString() ?? '',
      updatedAt: c.updatedAt?.toDate?.()?.toISOString() ?? '',
    }));

    const responseBody = {
      success: true,
      data: {
        classes: formattedClasses,
        total: result.total,
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: '/api/v1/admin/classes', method: 'GET', count: formattedClasses.length }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: '/api/v1/admin/classes', method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}

/**
 * @swagger
 * /api/v1/admin/classes:
 *   post:
 *     summary: Create a new class (admin)
 *     description: Creates a new class with the provided details.
 *     tags:
 *       - Admin - Classes
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - gradeId
 *               - day
 *               - time
 *               - capacity
 *             properties:
 *               name:
 *                 type: string
 *               gradeId:
 *                 type: string
 *                 description: Reference to grades collection
 *               day:
 *                 type: string
 *               time:
 *                 type: string
 *               capacity:
 *                 type: integer
 *               academicYear:
 *                 type: string
 *     responses:
 *       201:
 *         description: Class created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Insufficient privileges
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const requestId = randomUUID();

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'], requireWriteAccess: true });
    await requireFeature('admin', 'Classes');

    // Parse and validate request body
    const body = await req.json();
    const parseResult = createClassSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return jsonError(400, 'validation/invalid-input', errorMessage, origin);
    }

    // Create the class
    const newClass = await createClass(parseResult.data);

    const responseBody = {
      success: true,
      data: {
        class: {
          id: newClass.id,
          name: newClass.name,
          gradeId: newClass.gradeId,
          gradeName: newClass.gradeName,
          day: newClass.day,
          time: newClass.time,
          capacity: newClass.capacity,
          enrolled: newClass.enrolled,
          available: newClass.capacity - newClass.enrolled,
          teachers: newClass.teachers || [],
          status: newClass.status,
          academicYear: newClass.academicYear,
          createdAt: newClass.createdAt?.toDate?.()?.toISOString() ?? '',
        },
      },
    };

    const res = NextResponse.json(responseBody, { status: 201 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: '/api/v1/admin/classes', method: 'POST', classId: newClass.id }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof SyntaxError) {
      return jsonError(400, 'validation/invalid-json', 'Invalid JSON in request body', origin);
    }
    // Handle grade not found error
    if (err instanceof Error && err.message.includes('Grade not found')) {
      return jsonError(400, 'validation/invalid-grade', err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: '/api/v1/admin/classes', method: 'POST', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
