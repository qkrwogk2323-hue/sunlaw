import { NextResponse } from 'next/server';
import { getCurrentAuth, getEffectiveOrganizationId, isPlatformOperator, isManagementRole } from '@/lib/auth';
import { listOrganizationActivityLog } from '@/lib/queries/audit';
import { listOrganizationTableHistory } from '@/lib/queries/menu-history';

export async function GET(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return NextResponse.json({ ok: false, code: 'UNAUTHENTICATED', userMessage: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  // Restrict organizationId to the caller's own organization unless platform admin.
  const callerOrgId = getEffectiveOrganizationId(auth);
  const requestedOrgId = searchParams.get('organizationId');
  const organizationId = (isPlatformOperator(auth) ? (requestedOrgId ?? callerOrgId) : callerOrgId);

  const limit = Math.min(parseInt(searchParams.get('limit') ?? '80', 10), 200);
  const mode = searchParams.get('mode') ?? 'activity';

  if (mode === 'change_log') {
    // change_log contains raw DB diffs — restrict to org managers and platform admins only.
    const membership = auth.memberships?.find(m => m.organization_id === organizationId);
    const isOrgManager = membership && isManagementRole(membership.role);
    if (!isPlatformOperator(auth) && !isOrgManager) {
      return NextResponse.json(
        { ok: false, code: 'FORBIDDEN', userMessage: '변경 기록은 관리자만 조회할 수 있습니다.' },
        { status: 403 }
      );
    }

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
