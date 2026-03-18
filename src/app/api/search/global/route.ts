import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth';
import { searchGlobalWorkspace } from '@/lib/queries/global-search';

export async function GET(request: Request) {
  await requireAuthenticatedUser();
  const { searchParams } = new URL(request.url);
  const q = `${searchParams.get('q') ?? ''}`;
  const limitRaw = Number(searchParams.get('limit') ?? '8');
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : 8;

  const result = await searchGlobalWorkspace(q, limit);
  return NextResponse.json(result);
}
