import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError } from '@/lib/auth';
import { requireAuth } from '@/lib/guard';
import { requireFeature } from '@/lib/featureFlags';
import { getAllTextbooks, createTextbook } from '@/lib/firestoreTextbooks';
import type { TextbookStatus, TextbookType } from '@/types/textbook';

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

// Validation schema for creating a textbook
const createTextbookSchema = z.object({
  gradeId: z.string().min(1).max(50),
  itemNumber: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  type: z.enum(['textbook', 'homework', 'combined']),
  semester: z.string().max(50).optional(),
  pageCount: z.number().int().min(1).max(1000),
  copies: z.number().int().min(0).max(10000),
  unitCost: z.number().min(0).max(1000).optional(),
  academicYear: z.string().min(4).max(20),
});

/**
 * GET /api/v1/admin/textbooks
 * List all textbooks with optional filters
 * Query params: ?gradeId=&type=&academicYear=&status=active|inactive|all
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');

  try {
    const authz = req.headers.get('authorization');
    await requireAuth(authz, { requireRoles: ['admin'] });
    await requireFeature('admin', 'Textbooks');

    const { searchParams } = new URL(req.url);
    const gradeId = searchParams.get('gradeId') || undefined;
    const type = (searchParams.get('type') || undefined) as TextbookType | undefined;
    const academicYear = searchParams.get('academicYear') || undefined;
    const status = (searchParams.get('status') || 'all') as TextbookStatus | 'all';
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await getAllTextbooks({ gradeId, type, academicYear, status, limit, offset });

    // Convert Timestamps to ISO strings for JSON response
    const textbooks = result.textbooks.map(textbook => ({
      ...textbook,
      createdAt: textbook.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: textbook.updatedAt?.toDate?.()?.toISOString() || null,
    }));

    const response = {
      success: true,
      data: {
        textbooks,
        total: result.total,
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
    console.error('Error fetching textbooks:', err);
    return jsonError(500, 'internal/error', 'Failed to fetch textbooks', origin);
  }
}

/**
 * POST /api/v1/admin/textbooks
 * Create a new textbook
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  try {
    const authz = req.headers.get('authorization');
    const { profile } = await requireAuth(authz, { requireRoles: ['admin'], requireWriteAccess: true });
    await requireFeature('admin', 'Textbooks');

    const body = await req.json();
    const validData = createTextbookSchema.parse(body);

    const textbook = await createTextbook(validData, profile.uid);

    const response = {
      success: true,
      data: {
        id: textbook.id,
        message: 'Textbook created successfully',
        textbook: {
          ...textbook,
          createdAt: textbook.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: textbook.updatedAt?.toDate?.()?.toISOString() || null,
        },
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
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return jsonError(400, 'validation/error', firstError?.message || 'Invalid input', origin);
    }
    console.error('Error creating textbook:', err);
    return jsonError(500, 'internal/error', 'Failed to create textbook', origin);
  }
}
