import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { getExportJob, generateExportContent, cancelExportJob } from '@/lib/dataExport';

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
    'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
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
 * /api/v1/super-admin/export/{jobId}:
 *   get:
 *     summary: Get export job status or download
 *     description: Get export job details or download the export file. Super-admin only.
 *     tags:
 *       - Super Admin
 *       - Data Export
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Export job ID
 *       - in: query
 *         name: download
 *         schema:
 *           type: boolean
 *         description: If true, download the export file
 *     responses:
 *       200:
 *         description: Export job details or file download
 *       404:
 *         description: Export job not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires super_admin role
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const origin = req.headers.get('origin');

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['super_admin'] });

    const { jobId } = await params;
    const { searchParams } = new URL(req.url);
    const download = searchParams.get('download') === 'true';

    const job = await getExportJob(jobId);

    if (!job) {
      return jsonError(404, 'export/not_found', 'Export job not found', origin);
    }

    // If download requested, generate and return the file
    if (download) {
      if (job.status !== 'completed') {
        return jsonError(400, 'export/not_ready', 'Export is not complete', origin);
      }

      const result = await generateExportContent(jobId);

      if (!result.success || !result.content) {
        return jsonError(400, 'export/failed', result.error || 'Failed to generate export', origin);
      }

      // Return as downloadable JSON file
      const res = new NextResponse(result.content, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      });
      const headers = corsHeaders(origin);
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    // Otherwise return job status
    const response = {
      success: true,
      data: job,
    };

    const res = NextResponse.json(response, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error('Error getting export job:', err);
    return jsonError(500, 'internal/error', 'Failed to get export job', origin);
  }
}

/**
 * @swagger
 * /api/v1/super-admin/export/{jobId}:
 *   delete:
 *     summary: Cancel a pending export job
 *     description: Cancel a pending export. Super-admin only.
 *     tags:
 *       - Super Admin
 *       - Data Export
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Export job ID
 *     responses:
 *       200:
 *         description: Export job cancelled
 *       400:
 *         description: Cannot cancel (not pending)
 *       404:
 *         description: Export job not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires super_admin role
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const origin = req.headers.get('origin');

  try {
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['super_admin'] });

    const { jobId } = await params;

    const result = await cancelExportJob(jobId, profile.uid, profile.email || '');

    if (!result.success) {
      const status = result.error === 'Export job not found' ? 404 : 400;
      return jsonError(status, 'cancel/failed', result.error || 'Failed to cancel export', origin);
    }

    const response = {
      success: true,
      message: 'Export job cancelled',
    };

    const res = NextResponse.json(response, { status: 200 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(err.status, err.code, err.message, origin);
    }
    console.error('Error cancelling export job:', err);
    return jsonError(500, 'internal/error', 'Failed to cancel export job', origin);
  }
}
