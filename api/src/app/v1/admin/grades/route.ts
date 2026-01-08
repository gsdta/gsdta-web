import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { getAllGrades, createGrade } from '@/lib/firestoreGrades';
import type { GradeStatus } from '@/types/grade';

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

// Validation schema for creating a grade
const createGradeSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'ID must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100),
  displayOrder: z.number().int().min(1).max(100),
});

/**
 * GET /api/v1/admin/grades
 * List all grades with optional status filter
 * Query params: ?status=active|inactive|all (default: all)
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });
    await requireFeature('admin', 'Grades');

    const { searchParams } = new URL(req.url);
    const statusFilter = (searchParams.get('status') || 'all') as GradeStatus | 'all';

    const result = await getAllGrades({ status: statusFilter });

    // Convert Timestamps to ISO strings for JSON response
    const grades = result.grades.map(grade => ({
      ...grade,
      createdAt: grade.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: grade.updatedAt?.toDate?.()?.toISOString() || null,
    }));

    const response = {
      success: true,
      data: {
        grades,
        total: result.total,
      },
    };

    const res = NextResponse.json(response, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error('Error fetching grades:', err);
    return jsonError(500, 'internal/error', 'Failed to fetch grades', origin);
  }
}

/**
 * POST /api/v1/admin/grades
 * Create a new grade
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  try {
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['admin'] });
    await requireFeature('admin', 'Grades');

    const body = await req.json();
    const validData = createGradeSchema.parse(body);

    const grade = await createGrade(validData, profile.uid);

    const response = {
      success: true,
      data: {
        id: grade.id,
        message: 'Grade created successfully',
        grade: {
          ...grade,
          createdAt: grade.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: grade.updatedAt?.toDate?.()?.toISOString() || null,
        },
      },
    };

    const res = NextResponse.json(response, { status: 201 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return jsonError(400, 'validation/error', firstError?.message || 'Invalid input', origin);
    }
    console.error('Error creating grade:', err);
    return jsonError(500, 'internal/error', 'Failed to create grade', origin);
  }
}
