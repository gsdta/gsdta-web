import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { seedDefaultGrades, areGradesSeeded } from '@/lib/firestoreGrades';
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

/**
 * GET /api/v1/admin/grades/seed
 * Check if grades have been seeded
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });

    const seeded = await areGradesSeeded();

    const response = {
      success: true,
      data: {
        seeded,
        message: seeded ? 'Grades have been seeded' : 'Grades have not been seeded',
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
    console.error('Error checking seed status:', err);
    return jsonError(500, 'internal/error', 'Failed to check seed status', origin);
  }
}

/**
 * POST /api/v1/admin/grades/seed
 * Seed default grades (idempotent - skips existing grades)
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  try {
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['admin'] });

    const result = await seedDefaultGrades(profile.uid);

    const response = {
      success: true,
      data: {
        message: `Seeding complete: ${result.created} grades created, ${result.skipped} grades already existed`,
        created: result.created,
        skipped: result.skipped,
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
    console.error('Error seeding grades:', err);
    return jsonError(500, 'internal/error', 'Failed to seed grades', origin);
  }
}
