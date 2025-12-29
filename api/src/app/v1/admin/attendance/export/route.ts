import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { exportAttendanceRecords } from '@/lib/firestoreAttendance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Query schema
const exportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  classId: z.string().optional(),
  studentId: z.string().optional(),
  format: z.enum(['csv', 'json']).optional().default('csv'),
});

/**
 * @swagger
 * /api/v1/admin/attendance/export:
 *   get:
 *     summary: Export attendance data
 *     description: Export attendance records as CSV or JSON
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
 *         name: studentId
 *         schema:
 *           type: string
 *         description: Filter by student ID
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 *         description: Export format
 *     responses:
 *       200:
 *         description: Exported data
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
      studentId: url.searchParams.get('studentId') || undefined,
      format: url.searchParams.get('format') || 'csv',
    };

    const parseResult = exportQuerySchema.safeParse(params);
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

    const records = await exportAttendanceRecords({
      dateRange: {
        startDate: parseResult.data.startDate,
        endDate: parseResult.data.endDate,
      },
      classId: parseResult.data.classId,
      studentId: parseResult.data.studentId,
    });

    // Format as CSV
    if (parseResult.data.format === 'csv') {
      const headers = [
        'Date',
        'Class',
        'Student Name',
        'Status',
        'Arrival Time',
        'Notes',
        'Recorded By',
        'Recorded At',
      ];

      const rows = records.map((r) => [
        r.date,
        r.className,
        r.studentName,
        r.status,
        r.arrivalTime || '',
        (r.notes || '').replace(/"/g, '""'), // Escape quotes
        r.recordedByName,
        r.recordedAt?.toDate?.()?.toISOString() || '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${cell}"`).join(',')
        ),
      ].join('\n');

      const filename = `attendance_${parseResult.data.startDate}_to_${parseResult.data.endDate}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Format as JSON
    return NextResponse.json({
      success: true,
      data: {
        records: records.map((r) => ({
          date: r.date,
          className: r.className,
          studentName: r.studentName,
          status: r.status,
          arrivalTime: r.arrivalTime,
          notes: r.notes,
          recordedByName: r.recordedByName,
          recordedAt: r.recordedAt?.toDate?.()?.toISOString(),
        })),
        count: records.length,
        dateRange: {
          startDate: parseResult.data.startDate,
          endDate: parseResult.data.endDate,
        },
      },
    });
  } catch (error) {
    console.error('Export attendance error:', error);

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
