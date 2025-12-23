import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { corsHeaders } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const res = new NextResponse(null, { status: 204 });
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API and its dependencies (Firestore)
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 firestore:
 *                   type: string
 *                   example: connected
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: API is unhealthy
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const timestamp = new Date().toISOString();
  
  try {
    const db = adminDb();
    // Simple connectivity check: try to read a non-existent doc to verify connection permissions
    await db.collection('_health_check').doc('ping').get();
    
    const res = NextResponse.json({
      status: 'ok',
      firestore: 'connected',
      timestamp,
    }, { status: 200 });
    
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (err) {
    console.error('Health check failed:', err);
    
    const res = NextResponse.json({
      status: 'error',
      firestore: 'disconnected',
      error: String(err),
      timestamp,
    }, { status: 500 });
    
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
}
