import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { getTextbookById, updateTextbook, deleteTextbook } from '@/lib/firestoreTextbooks';

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
    'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
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

// Validation schema for updating a textbook
const updateTextbookSchema = z.object({
  gradeId: z.string().min(1).max(50).optional(),
  itemNumber: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['textbook', 'homework', 'combined']).optional(),
  semester: z.string().max(50).optional(),
  pageCount: z.number().int().min(1).max(1000).optional(),
  copies: z.number().int().min(0).max(10000).optional(),
  unitCost: z.number().min(0).max(1000).optional(),
  academicYear: z.string().min(4).max(20).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/v1/admin/textbooks/{id}
 * Get a single textbook by ID
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const { id } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });
    await requireFeature('admin', 'Textbooks');

    const textbook = await getTextbookById(id);

    if (!textbook) {
      return jsonError(404, 'textbook/not-found', 'Textbook not found', origin);
    }

    const response = {
      success: true,
      data: {
        textbook: {
          ...textbook,
          createdAt: textbook.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: textbook.updatedAt?.toDate?.()?.toISOString() || null,
        },
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
    console.error('Error fetching textbook:', err);
    return jsonError(500, 'internal/error', 'Failed to fetch textbook', origin);
  }
}

/**
 * PATCH /api/v1/admin/textbooks/{id}
 * Update a textbook
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const { id } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });
    await requireFeature('admin', 'Textbooks');

    const body = await req.json();
    const validData = updateTextbookSchema.parse(body);

    // Check if at least one field is provided
    if (Object.keys(validData).length === 0) {
      return jsonError(400, 'validation/error', 'At least one field must be provided for update', origin);
    }

    const textbook = await updateTextbook(id, validData);

    if (!textbook) {
      return jsonError(404, 'textbook/not-found', 'Textbook not found', origin);
    }

    const response = {
      success: true,
      data: {
        message: 'Textbook updated successfully',
        textbook: {
          ...textbook,
          createdAt: textbook.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: textbook.updatedAt?.toDate?.()?.toISOString() || null,
        },
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
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return jsonError(400, 'validation/error', firstError?.message || 'Invalid input', origin);
    }
    console.error('Error updating textbook:', err);
    return jsonError(500, 'internal/error', 'Failed to update textbook', origin);
  }
}

/**
 * DELETE /api/v1/admin/textbooks/{id}
 * Delete a textbook (soft delete)
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const origin = req.headers.get('origin');
  const { id } = await context.params;

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });
    await requireFeature('admin', 'Textbooks');

    const success = await deleteTextbook(id);

    if (!success) {
      return jsonError(404, 'textbook/not-found', 'Textbook not found', origin);
    }

    const response = {
      success: true,
      data: {
        message: 'Textbook deleted successfully',
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
    console.error('Error deleting textbook:', err);
    return jsonError(500, 'internal/error', 'Failed to delete textbook', origin);
  }
}
