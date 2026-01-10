import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { queryAuditLogs, getAuditLogFilterOptions, exportAuditLogsToCSV } from '@/lib/auditLog';

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
    'https://www.gsdta.com',
  ]);
  return prodAllowed.has(origin) ? origin : null;
}

function corsHeaders(origin: string | null) {
  const allow = allowedOrigin(origin);
  const headers: Record<string, string> = {
    'Vary': 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
  if (allow) {
    headers['Access-Control-Allow-Origin'] = allow;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

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
 * /api/v1/super-admin/audit-log:
 *   get:
 *     summary: Query audit logs
 *     description: Returns paginated audit log entries with optional filters. Super-admin only.
 *     tags:
 *       - Super Admin
 *       - Audit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action (e.g., admin.promote)
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *         description: Filter by resource type
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [info, warning, critical]
 *         description: Filter by severity level
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Response format
 *       - in: query
 *         name: filters
 *         schema:
 *           type: boolean
 *         description: If true, only return filter options
 *     responses:
 *       200:
 *         description: Audit log entries
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires super_admin role
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');

  try {
    // Require super_admin or admin_readonly role (view-only access)
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['super_admin', 'admin_readonly'] });

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const filtersOnly = searchParams.get('filters') === 'true';
    const format = searchParams.get('format') || 'json';

    // If only requesting filter options
    if (filtersOnly) {
      const filterOptions = await getAuditLogFilterOptions();
      const res = NextResponse.json({
        success: true,
        data: filterOptions,
      }, { status: 200 });
      const headers = corsHeaders(origin);
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    // Build query
    const query = {
      userId: searchParams.get('userId') || undefined,
      action: searchParams.get('action') || undefined,
      resource: searchParams.get('resource') || undefined,
      severity: (searchParams.get('severity') as 'info' | 'warning' | 'critical') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      limit: Math.min(Math.max(1, parseInt(searchParams.get('limit') || '50')), 100),
      offset: Math.max(0, parseInt(searchParams.get('offset') || '0')),
    };

    // Query audit logs
    const { entries, total } = await queryAuditLogs(query);

    // Return CSV format if requested
    if (format === 'csv') {
      const csv = exportAuditLogsToCSV(entries);
      const res = new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
      const headers = corsHeaders(origin);
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    // Return JSON format
    const response = {
      success: true,
      data: {
        entries,
        total,
        limit: query.limit,
        offset: query.offset,
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
    console.error('Error querying audit logs:', err);
    return jsonError(500, 'internal/error', 'Failed to query audit logs', origin);
  }
}
