import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { getAllStudents, countStudentsByStatus } from '@/lib/firestoreStudents';
import type { StudentStatus } from '@/types/student';
import { randomUUID } from 'crypto';
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
 * @swagger
 * /api/v1/admin/students:
 *   get:
 *     summary: List all students (admin)
 *     description: Returns a paginated list of all students with optional filters.
 *     tags:
 *       - Admin - Students
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, admitted, active, inactive, withdrawn, all]
 *         description: Filter by student status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by student name or parent email
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of students per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of students
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as StudentStatus | 'all' | null;
    const search = searchParams.get('search') || undefined;
    const gradeId = searchParams.get('gradeId') || undefined;
    const unassigned = searchParams.get('unassigned') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get students with filters
    const result = await getAllStudents({
      status: status || 'all',
      search,
      gradeId,
      unassigned,
      limit,
      offset,
    });

    // Get status counts for dashboard
    const counts = await countStudentsByStatus();

    // Format students for response
    const formattedStudents = result.students.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      name: `${s.firstName} ${s.lastName}`,
      dateOfBirth: s.dateOfBirth,
      parentId: s.parentId,
      parentEmail: s.parentEmail,
      grade: s.grade,
      schoolName: s.schoolName,
      priorTamilLevel: s.priorTamilLevel,
      classId: s.classId,
      className: s.className,
      status: s.status,
      createdAt: s.createdAt?.toDate?.()?.toISOString() ?? '',
      updatedAt: s.updatedAt?.toDate?.()?.toISOString() ?? '',
      admittedAt: s.admittedAt?.toDate?.()?.toISOString(),
      admittedBy: s.admittedBy,
    }));

    const responseBody = {
      success: true,
      data: {
        students: formattedStudents,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.offset + result.students.length < result.total,
        },
        counts,
      },
    };

    const res = NextResponse.json(responseBody, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    console.info(JSON.stringify({ requestId, path: '/api/v1/admin/students', method: 'GET', count: formattedStudents.length }));
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error(JSON.stringify({ requestId, path: '/api/v1/admin/students', method: 'GET', error: String(err) }));
    return jsonError(500, 'internal/error', 'Internal server error', origin);
  }
}
