import { NextResponse } from 'next/server';
import { getCurrentAuth, getEffectiveOrganizationId } from '@/lib/auth';
import { listOrganizationActivityLog } from '@/lib/queries/audit';

export async function GET(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return NextResponse.json({ ok: false, code: 'UNAUTHENTICATED', userMessage: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId') ?? getEffectiveOrganizationId(auth);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '80', 10), 200);

  const logs = await listOrganizationActivityLog({ organizationId, limit });
  return NextResponse.json({ ok: true, logs });
}
