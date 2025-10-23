import { NextRequest, NextResponse } from 'next/server';

/**
 * @swagger
 * /api/v1/echo:
 *   post:
 *     summary: Echo endpoint
 *     description: Echoes back the request body along with metadata
 *     tags:
 *       - Echo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successfully echoed the request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 echo:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 headers:
 *                   type: object
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract relevant headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return NextResponse.json({
      echo: body,
      timestamp: new Date().toISOString(),
      headers,
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }
}
