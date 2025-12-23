import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { getGradeById, updateGrade } from '@/lib/firestoreGrades';
import { corsHeaders } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

// Validation schema for updating a grade
const updateGradeSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  displayName: z.string().min(1).max(100).optional(),
  displayOrder: z.number().int().min(1).max(100).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/v1/admin/grades/{id}
 * Get a single grade by ID
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const { id } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });

    const grade = await getGradeById(id);

    if (!grade) {
      return jsonError(404, 'grade/not-found', 'Grade not found', origin);
    }

    const response = {
      success: true,
      data: {
        grade: {
          ...grade,
          createdAt: grade.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: grade.updatedAt?.toDate?.()?.toISOString() || null,
        },
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
    console.error('Error fetching grade:', err);
    return jsonError(500, 'internal/error', 'Failed to fetch grade', origin);
  }
}

/**
 * PATCH /api/v1/admin/grades/{id}
 * Update a grade
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const { id } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });

    const body = await req.json();
    const validData = updateGradeSchema.parse(body);

    // Check if at least one field is provided
    if (Object.keys(validData).length === 0) {
      return jsonError(400, 'validation/error', 'At least one field must be provided for update', origin);
    }

    const grade = await updateGrade(id, validData);

    if (!grade) {
      return jsonError(404, 'grade/not-found', 'Grade not found', origin);
    }

    const response = {
      success: true,
      data: {
        message: 'Grade updated successfully',
        grade: {
          ...grade,
          createdAt: grade.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: grade.updatedAt?.toDate?.()?.toISOString() || null,
        },
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
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return jsonError(400, 'validation/error', firstError?.message || 'Invalid input', origin);
    }
    console.error('Error updating grade:', err);
    return jsonError(500, 'internal/error', 'Failed to update grade', origin);
  }
}
