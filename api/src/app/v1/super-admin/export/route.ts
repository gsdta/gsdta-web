import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { createExportJob, listExportJobs, processExportJob, ExportType } from '@/lib/dataExport';

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

const VALID_EXPORT_TYPES: ExportType[] = ['full', 'users', 'students', 'audit', 'classes'];

/**
 * @swagger
 * /api/v1/super-admin/export:
 *   get:
 *     summary: List export jobs
 *     description: Returns list of export jobs. Super-admin only.
 *     tags:
 *       - Super Admin
 *       - Data Export
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *         description: Filter by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of records to return
 *     responses:
 *       200:
 *         description: Export jobs list
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires super_admin role
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['super_admin'] });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'pending' | 'processing' | 'completed' | 'failed' | null;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const jobs = await listExportJobs({
      limit,
      status: status || undefined,
    });

    const response = {
      success: true,
      data: {
        jobs,
        total: jobs.length,
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
    console.error('Error listing export jobs:', err);
    return jsonError(500, 'internal/error', 'Failed to list export jobs', origin);
  }
}

/**
 * @swagger
 * /api/v1/super-admin/export:
 *   post:
 *     summary: Create a new export job
 *     description: Initiate a data export. Super-admin only.
 *     tags:
 *       - Super Admin
 *       - Data Export
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [full, users, students, audit, classes]
 *                 description: Type of export
 *     responses:
 *       201:
 *         description: Export job created
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires super_admin role
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  try {
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['super_admin'] });

    const body = await req.json();
    const { type } = body;

    if (!type || !VALID_EXPORT_TYPES.includes(type)) {
      return jsonError(400, 'validation/error', `Invalid export type. Must be one of: ${VALID_EXPORT_TYPES.join(', ')}`, origin);
    }

    // Create the export job
    const job = await createExportJob(type, profile.uid, profile.email || '');

    // Process it immediately (in production, this would be a background job)
    // For now, we process synchronously
    const processResult = await processExportJob(job.id);

    if (!processResult.success) {
      return jsonError(500, 'export/failed', processResult.error || 'Failed to process export', origin);
    }

    const response = {
      success: true,
      message: 'Export job created and processing',
      data: {
        jobId: job.id,
        type: job.type,
        status: 'processing',
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
    console.error('Error creating export job:', err);
    return jsonError(500, 'internal/error', 'Failed to create export job', origin);
  }
}
