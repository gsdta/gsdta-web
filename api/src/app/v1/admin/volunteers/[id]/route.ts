import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { getVolunteerById, updateVolunteer, deleteVolunteer, logVolunteerHours } from '@/lib/firestoreVolunteers';

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
  const prodAllowed = new Set<string>(['https://www.gsdta.com']);
  return prodAllowed.has(origin) ? origin : null;
}

function corsHeaders(origin: string | null) {
  const allow = allowedOrigin(origin);
  const headers: Record<string, string> = {
    'Vary': 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method',
    'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
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

// Validation schema for emergency contact
const emergencyContactSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
  relationship: z.string().min(1).max(50),
});

// Validation schema for updating a volunteer
const updateVolunteerSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().max(200).optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  type: z.enum(['high_school', 'parent', 'community']).optional(),
  school: z.string().max(200).optional(),
  gradeLevel: z.string().max(20).optional(),
  parentId: z.string().max(100).optional(),
  studentIds: z.array(z.string()).optional(),
  availableDays: z.array(z.string()).optional(),
  availableTimes: z.array(z.string()).optional(),
  academicYear: z.string().min(4).max(20).optional(),
  emergencyContact: emergencyContactSchema.optional(),
  status: z.enum(['active', 'inactive']).optional(),
  notes: z.string().max(1000).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/v1/admin/volunteers/{id}
 * Get a single volunteer by ID
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const { id } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });

    const volunteer = await getVolunteerById(id);

    if (!volunteer) {
      return jsonError(404, 'volunteer/not-found', 'Volunteer not found', origin);
    }

    const response = {
      success: true,
      data: {
        volunteer: {
          ...volunteer,
          createdAt: volunteer.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: volunteer.updatedAt?.toDate?.()?.toISOString() || null,
          classAssignments: volunteer.classAssignments?.map(a => ({
            ...a,
            assignedAt: a.assignedAt?.toDate?.()?.toISOString() || null,
          })),
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
    console.error('Error fetching volunteer:', err);
    return jsonError(500, 'internal/error', 'Failed to fetch volunteer', origin);
  }
}

/**
 * PATCH /api/v1/admin/volunteers/{id}
 * Update a volunteer
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const { id } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });

    const body = await req.json();
    const validData = updateVolunteerSchema.parse(body);

    // Check if at least one field is provided
    if (Object.keys(validData).length === 0) {
      return jsonError(400, 'validation/error', 'At least one field must be provided for update', origin);
    }

    const volunteer = await updateVolunteer(id, validData);

    if (!volunteer) {
      return jsonError(404, 'volunteer/not-found', 'Volunteer not found', origin);
    }

    const response = {
      success: true,
      data: {
        message: 'Volunteer updated successfully',
        volunteer: {
          ...volunteer,
          createdAt: volunteer.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: volunteer.updatedAt?.toDate?.()?.toISOString() || null,
          classAssignments: volunteer.classAssignments?.map(a => ({
            ...a,
            assignedAt: a.assignedAt?.toDate?.()?.toISOString() || null,
          })),
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
    console.error('Error updating volunteer:', err);
    return jsonError(500, 'internal/error', 'Failed to update volunteer', origin);
  }
}

/**
 * DELETE /api/v1/admin/volunteers/{id}
 * Delete a volunteer (soft delete)
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const { id } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });

    const success = await deleteVolunteer(id);

    if (!success) {
      return jsonError(404, 'volunteer/not-found', 'Volunteer not found', origin);
    }

    const response = {
      success: true,
      data: {
        message: 'Volunteer deleted successfully',
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
    console.error('Error deleting volunteer:', err);
    return jsonError(500, 'internal/error', 'Failed to delete volunteer', origin);
  }
}
