import { NextResponse } from 'next/server';
import { openapiSpecification } from '@/lib/swagger';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(openapiSpecification);
}
