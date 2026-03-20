import { NextResponse } from 'next/server';
import { getCurrentAuth, hasActivePlatformAdminView } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type SelectedItem = {
  label: string;
  detail: string;
  dueAt: string | null;
  priority: 'high' | 'medium' | 'low';
};

export async function POST(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const organizationId = String(body.organizationId || '');
  const caseId = body.caseId ? String(body.caseId) : null;
  const title = String(body.title || '').trim();
  const summary = String(body.summary || '').trim();
  const recipientMode = String(body.recipientMode || 'self');
  const recipientMembershipId = body.recipientMembershipId ? String(body.recipientMembershipId) : null;
  const selectedItems = (Array.isArray(body.selectedItems) ? body.selectedItems : []) as SelectedItem[];

  if (!organizationId || !title || !summary || !selectedItems.length) {
    return NextResponse.json({ error: '필수 항목이 비어 있습니다.' }, { status: 400 });
  }

  const membership = auth.memberships.find((item) => item.organization_id === organizationId) ?? null;
  const isPlatformAdmin = await hasActivePlatformAdminView(auth, organizationId);

  if (!membership && !isPlatformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (caseId && !isPlatformAdmin && !hasPermission(auth, organizationId, 'request_create')) {
    return NextResponse.json({ error: '작업 요청 생성 권한이 없습니다.' }, { status: 403 });
  }

  if (caseId && selectedItems.some((item) => Boolean(item.dueAt)) && !isPlatformAdmin && !hasPermission(auth, organizationId, 'schedule_create')) {
    return NextResponse.json({ error: '일정 생성 권한이 없습니다.' }, { status: 403 });
  }

  if (recipientMode !== 'self' && !isPlatformAdmin && !hasPermission(auth, organizationId, 'notification_create')) {
    return NextResponse.json({ error: '알림 생성 권한이 없습니다.' }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  let caseRow: { id: string; title: string } | null = null;

  if (caseId) {
    const { data, error } = await supabase
      .from('cases')
      .select('id, title')
      .eq('id', caseId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '사건을 찾을 수 없습니다.' }, { status: 404 });
    }

    caseRow = data;
  }

  const messageBody = `[조직간 업무소통 AI 정리]\n${summary}\n\n${selectedItems.map((item, index) => `${index + 1}. ${item.label}${item.dueAt ? ` · ${item.dueAt.slice(0, 10)}` : ''}\n${item.detail}`).join('\n\n')}`;

  if (caseRow) {
    const { error: messageError } = await supabase.from('case_messages').insert({
      organization_id: organizationId,
      case_id: caseRow.id,
      sender_profile_id: auth.user.id,
      sender_role: membership?.role === 'org_owner' || membership?.role === 'org_manager' ? 'admin' : 'staff',
      body: messageBody,
      is_internal: true
    });

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 });
    }

    for (const item of selectedItems) {
      const { error: requestError } = await supabase.from('case_requests').insert({
        organization_id: organizationId,
        case_id: caseRow.id,
        created_by: auth.user.id,
        request_kind: 'other',
        title: item.label,
        body: `[대시보드 AI 소통 정리]\n${item.detail}`,
        due_at: item.dueAt,
        client_visible: false
      });

      if (requestError) {
        return NextResponse.json({ error: requestError.message }, { status: 500 });
      }

      if (item.dueAt) {
        const { error: scheduleError } = await supabase.from('case_schedules').insert({
          organization_id: organizationId,
          case_id: caseRow.id,
          title: item.label,
          schedule_kind: 'reminder',
          scheduled_start: item.dueAt,
          scheduled_end: null,
          location: null,
          notes: `[대시보드 AI 소통 정리]\n${item.detail}`,
          client_visibility: 'internal_only',
          is_important: item.priority === 'high',
          created_by: auth.user.id,
          created_by_name: auth.profile.full_name,
          updated_by: auth.user.id
        });

        if (scheduleError) {
          return NextResponse.json({ error: scheduleError.message }, { status: 500 });
        }
      }
    }
  }

  let recipientProfileIds: string[] = [];
  if (recipientMode === 'self') {
    recipientProfileIds = [auth.user.id];
  } else if (recipientMode === 'one' && recipientMembershipId) {
    const { data: memberRow, error: memberError } = await supabase
      .from('organization_memberships')
      .select('profile_id')
      .eq('id', recipientMembershipId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single();

    if (memberError || !memberRow?.profile_id) {
      return NextResponse.json({ error: memberError?.message ?? '대상 구성원을 찾을 수 없습니다.' }, { status: 400 });
    }

    recipientProfileIds = [memberRow.profile_id];
  } else {
    const { data: rows, error } = await supabase
      .from('organization_memberships')
      .select('profile_id, role')
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    recipientProfileIds = (rows ?? [])
      .filter((row: any) => recipientMode === 'all' || row.role === 'org_owner' || row.role === 'org_manager')
      .map((row: any) => row.profile_id)
      .filter(Boolean);
  }

  recipientProfileIds = [...new Set(recipientProfileIds)].filter(Boolean);
  if (!recipientProfileIds.length) {
    return NextResponse.json({ error: '알림 대상을 찾을 수 없습니다.' }, { status: 400 });
  }

  const notificationBody = `${summary}\n\n${selectedItems.map((item, index) => `${index + 1}. ${item.label}${item.dueAt ? ` · ${item.dueAt.slice(0, 10)}` : ''}`).join('\n')}`;
  const { error: notificationError } = await admin.from('notifications').insert(
    recipientProfileIds.map((recipientProfileId) => ({
      organization_id: organizationId,
      case_id: caseRow?.id ?? null,
      recipient_profile_id: recipientProfileId,
      kind: 'generic',
      title,
      body: notificationBody,
      payload: {
        source: 'dashboard_coordination_ai',
        sender_profile_id: auth.user.id,
        sender_name: auth.profile.full_name,
        case_id: caseRow?.id ?? null,
        checklist_count: selectedItems.length
      }
    }))
  );

  if (notificationError) {
    return NextResponse.json({ error: notificationError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
