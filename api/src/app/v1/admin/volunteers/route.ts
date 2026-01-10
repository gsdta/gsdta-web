import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { getAllVolunteers, createVolunteer } from '@/lib/firestoreVolunteers';
import type { VolunteerStatus, VolunteerType } from '@/types/volunteer';

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

// Validation schema for emergency contact
const emergencyContactSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
  relationship: z.string().min(1).max(50),
});

// Validation schema for creating a volunteer
const createVolunteerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(200).optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  type: z.enum(['high_school', 'parent', 'community']),
  school: z.string().max(200).optional(),
  gradeLevel: z.string().max(20).optional(),
  parentId: z.string().max(100).optional(),
  studentIds: z.array(z.string()).optional(),
  availableDays: z.array(z.string()).optional(),
  availableTimes: z.array(z.string()).optional(),
  academicYear: z.string().min(4).max(20),
  emergencyContact: emergencyContactSchema.optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * GET /api/v1/admin/volunteers
 * List all volunteers with optional filters
 * Query params: ?type=&status=&classId=&academicYear=&search=
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });
    await requireFeature('admin', 'Volunteers');

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get('type') || undefined) as VolunteerType | undefined;
    const status = (searchParams.get('status') || 'all') as VolunteerStatus | 'all';
    const classId = searchParams.get('classId') || undefined;
    const academicYear = searchParams.get('academicYear') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await getAllVolunteers({ type, status, classId, academicYear, search, limit, offset });

    // Convert Timestamps to ISO strings for JSON response
    const volunteers = result.volunteers.map(volunteer => ({
      ...volunteer,
      createdAt: volunteer.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: volunteer.updatedAt?.toDate?.()?.toISOString() || null,
      classAssignments: volunteer.classAssignments?.map(a => ({
        ...a,
        assignedAt: a.assignedAt?.toDate?.()?.toISOString() || null,
      })),
    }));

    const response = {
      success: true,
      data: {
        volunteers,
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
    console.error('Error fetching volunteers:', err);
    return jsonError(500, 'internal/error', 'Failed to fetch volunteers', origin);
  }
}

/**
 * POST /api/v1/admin/volunteers
 * Create a new volunteer
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  try {
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['admin'], requireWriteAccess: true });
    await requireFeature('admin', 'Volunteers');

    const body = await req.json();
    const validData = createVolunteerSchema.parse(body);

    const volunteer = await createVolunteer(validData, profile.uid);

    const response = {
      success: true,
      data: {
        id: volunteer.id,
        message: 'Volunteer created successfully',
        volunteer: {
          ...volunteer,
          createdAt: volunteer.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: volunteer.updatedAt?.toDate?.()?.toISOString() || null,
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
    console.error('Error creating volunteer:', err);
    return jsonError(500, 'internal/error', 'Failed to create volunteer', origin);
  }
}
