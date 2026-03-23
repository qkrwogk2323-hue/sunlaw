import { NextResponse } from 'next/server';
import { getCurrentAuth, getEffectiveOrganizationId } from '@/lib/auth';
import { listOrganizationActivityLog } from '@/lib/queries/audit';
import { listOrganizationTableHistory } from '@/lib/queries/menu-history';

export async function GET(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return NextResponse.json({ ok: false, code: 'UNAUTHENTICATED', userMessage: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId') ?? getEffectiveOrganizationId(auth);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '80', 10), 200);
  const mode = searchParams.get('mode') ?? 'activity';

  if (mode === 'change_log') {
    const tables = searchParams.getAll('table').filter(Boolean);
    if (!organizationId) {
      return NextResponse.json({ ok: true, logs: [] });
    }

    const grouped = await Promise.all(
      tables.map(async (tableName) => ({
        tableName,
        rows: await listOrganizationTableHistory(organizationId, tableName, limit)
      }))
    );

    const logs = grouped
      .flatMap(({ tableName, rows }) => rows.map((row) => ({
        id: `${tableName}:${row.id}`,
        action: row.operation,
        resource_type: row.table_name,
        resource_id: row.record_id,
        organization_id: row.organization_id,
        created_at: row.logged_at,
        actor: { full_name: row.actor_email ?? row.actor_user_id ?? '-' },
        meta: {
          changed_fields: row.changed_fields ?? [],
          case_id: row.case_id
        }
      })))
      .sort((left, right) => new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime())
      .slice(0, limit);

    return NextResponse.json({ ok: true, logs });
  }

  const logs = await listOrganizationActivityLog({ organizationId, limit });
  return NextResponse.json({ ok: true, logs });
}
