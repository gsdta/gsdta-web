import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { adminDb } from '@/lib/firebaseAdmin';
import { corsHeaders } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
 * @swagger
 * /api/v1/admin/teachers:
 *   get:
 *     summary: Get all teachers
 *     description: Returns a list of all users with teacher role. Supports search and filtering.
 *     tags:
 *       - Admin
 *       - Teachers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, all]
 *         description: Filter by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: List of teachers
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
 *                     teachers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           uid:
 *                             type: string
 *                           email:
 *                             type: string
 *                           name:
 *                             type: string
 *                           roles:
 *                             type: array
 *                             items:
 *                               type: string
 *                           status:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    // Require admin role
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const statusFilter = searchParams.get('status') || 'active';
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50')), 100);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'));

    // Build Firestore query
    const db = adminDb();
    let query = db.collection('users')
      .where('roles', 'array-contains', 'teacher');

    // Filter by status
    if (statusFilter !== 'all') {
      query = query.where('status', '==', statusFilter);
    }

    // Execute query
    const snapshot = await query.get();

    // Filter by search term (client-side filtering for name/email)
    let teachers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: data.email || '',
        name: data.name || '',
        roles: data.roles || [],
        status: data.status || 'active',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      };
    });

    // Apply search filter
    if (search) {
      teachers = teachers.filter(teacher => 
        teacher.name.toLowerCase().includes(search) ||
        teacher.email.toLowerCase().includes(search)
      );
    }

    // Get total count before pagination
    const total = teachers.length;

    // Apply pagination
    const paginatedTeachers = teachers.slice(offset, offset + limit);

    const response = {
      success: true,
      data: {
        teachers: paginatedTeachers,
        total,
        limit,
        offset,
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
    console.error('Error fetching teachers:', err);
    return jsonError(500, 'internal/error', 'Failed to fetch teachers', origin);
  }
}
