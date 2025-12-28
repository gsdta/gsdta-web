import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { getChronicAbsentees } from '@/lib/firestoreAttendance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Query schema
const chronicAbsenteesQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  classId: z.string().optional(),
  gradeId: z.string().optional(),
  threshold: z.coerce.number().min(0).max(100).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

/**
 * @swagger
 * /api/v1/admin/attendance/chronic-absentees:
 *   get:
 *     summary: Get chronic absentees
 *     description: Get students with attendance below threshold
 *     tags:
 *       - Admin Attendance
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: classId
 *         schema:
 *           type: string
 *         description: Filter by class ID
 *       - in: query
 *         name: gradeId
 *         schema:
 *           type: string
 *         description: Filter by grade ID
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           default: 80
 *         description: Attendance threshold percentage
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: Chronic absentees list
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin)
 */
export async function GET(req: NextRequest) {
  const authz = req.headers.get('authorization');

  try {
    await requireAuth(authz, { requireRoles: ['admin'] });
    await requireFeature('admin', 'AttendanceAnalytics');

    // Parse query parameters
    const url = new URL(req.url);
    const params = {
      startDate: url.searchParams.get('startDate') || '',
      endDate: url.searchParams.get('endDate') || '',
      classId: url.searchParams.get('classId') || undefined,
      gradeId: url.searchParams.get('gradeId') || undefined,
      threshold: url.searchParams.get('threshold') || undefined,
      limit: url.searchParams.get('limit') || undefined,
      offset: url.searchParams.get('offset') || undefined,
    };

    const parseResult = chronicAbsenteesQuerySchema.safeParse(params);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_REQUEST',
          message: parseResult.error.issues.map((e) => e.message).join(', '),
        },
        { status: 400 }
      );
    }

    const result = await getChronicAbsentees({
      dateRange: {
        startDate: parseResult.data.startDate,
        endDate: parseResult.data.endDate,
      },
      classId: parseResult.data.classId,
      gradeId: parseResult.data.gradeId,
      threshold: parseResult.data.threshold,
      limit: parseResult.data.limit,
      offset: parseResult.data.offset,
    });

    return NextResponse.json({
      success: true,
      data: {
        absentees: result.absentees,
        total: result.total,
        pagination: {
          limit: parseResult.data.limit || 50,
          offset: parseResult.data.offset || 0,
          hasMore: (parseResult.data.offset || 0) + result.absentees.length < result.total,
        },
      },
    });
  } catch (error) {
    console.error('Get chronic absentees error:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, code: 'auth/missing-token', message: 'Authentication required' },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message.includes('permission')) {
      return NextResponse.json(
        { success: false, code: 'auth/forbidden', message: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
