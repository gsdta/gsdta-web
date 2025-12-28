import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { getAttendanceAnalytics } from '@/lib/firestoreAttendance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Query schema
const analyticsQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  classId: z.string().optional(),
  gradeId: z.string().optional(),
});

/**
 * @swagger
 * /api/v1/admin/attendance/analytics:
 *   get:
 *     summary: Get attendance analytics
 *     description: Get attendance analytics with trend data for a date range
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
 *     responses:
 *       200:
 *         description: Analytics data
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
    };

    const parseResult = analyticsQuerySchema.safeParse(params);
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

    const analytics = await getAttendanceAnalytics({
      dateRange: {
        startDate: parseResult.data.startDate,
        endDate: parseResult.data.endDate,
      },
      classId: parseResult.data.classId,
      gradeId: parseResult.data.gradeId,
    });

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Get attendance analytics error:', error);

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
