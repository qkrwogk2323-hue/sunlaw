import { NextResponse } from 'next/server';
import { getCurrentAuth, getPlatformOrganizationContextId, hasActivePlatformAdminView } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const organizationId = String(body.organizationId || '');
  const caseId = String(body.caseId || '');
  const content = String(body.content || '').trim();
  const title = String(body.title || '').trim();
  const summary = String(body.summary || '').trim();
  const dueAt = body.dueAt ? String(body.dueAt) : null;
  const scheduleKind = String(body.scheduleKind || 'other');
  const isImportant = Boolean(body.isImportant);
  const recipientMembershipId = body.recipientMembershipId ? String(body.recipientMembershipId) : null;

  if (!organizationId || !caseId || !title || !summary) {
    return NextResponse.json({ error: '필수 항목이 비어 있습니다.' }, { status: 400 });
  }

  const membership = auth.memberships.find((item) => item.organization_id === organizationId) ?? null;
  const platformContextId = getPlatformOrganizationContextId(auth);
  const isPlatformAdmin = await hasActivePlatformAdminView(auth, platformContextId);

  if (!membership && !isPlatformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!isPlatformAdmin && !hasPermission(auth, organizationId, 'request_create')) {
    return NextResponse.json({ error: '작업 요청 생성 권한이 없습니다.' }, { status: 403 });
  }

  if (dueAt && !isPlatformAdmin && !hasPermission(auth, organizationId, 'schedule_create')) {
    return NextResponse.json({ error: '일정 생성 권한이 없습니다.' }, { status: 403 });
  }

  if (recipientMembershipId && !isPlatformAdmin && !hasPermission(auth, organizationId, 'notification_create')) {
    return NextResponse.json({ error: '알림 생성 권한이 없습니다.' }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const { data: caseRow, error: caseError } = await supabase
    .from('cases')
    .select('id, organization_id, title')
    .eq('id', caseId)
    .eq('organization_id', organizationId)
    .single();

  if (caseError || !caseRow) {
    return NextResponse.json({ error: '사건을 찾을 수 없습니다.' }, { status: 404 });
  }

  const { data: requestRow, error: requestError } = await supabase.from('case_requests').insert({
    organization_id: organizationId,
    case_id: caseId,
    created_by: auth.user.id,
    request_kind: 'other',
    title,
    body: `${summary}\n\n[대시보드 AI 초안]\n${content}`,
    due_at: dueAt,
    client_visible: false
  }).select('id').single();

  if (requestError || !requestRow) {
    return NextResponse.json({ error: requestError?.message ?? '작업 요청을 생성하지 못했습니다.' }, { status: 500 });
  }

  if (dueAt) {
    const { error: scheduleError } = await supabase.from('case_schedules').insert({
      organization_id: organizationId,
      case_id: caseId,
      title,
      schedule_kind: scheduleKind,
      scheduled_start: dueAt,
      scheduled_end: null,
      location: null,
      notes: `[대시보드 AI 초안]\n${summary}`,
      client_visibility: 'internal_only',
      is_important: isImportant,
      created_by: auth.user.id,
      created_by_name: auth.profile.full_name,
      updated_by: auth.user.id
    });

    if (scheduleError) {
      return NextResponse.json({ error: scheduleError.message }, { status: 500 });
    }
  }

  const { error: messageError } = await supabase.from('case_messages').insert({
    organization_id: organizationId,
    case_id: caseId,
    sender_profile_id: auth.user.id,
    sender_role: membership?.role === 'org_owner' || membership?.role === 'org_manager' ? 'admin' : 'staff',
    body: `[대시보드 AI 기록]\n${summary}`,
    is_internal: true
  });

  if (messageError) {
    return NextResponse.json({ error: messageError.message }, { status: 500 });
  }

  let recipientProfileId: string | null = null;
  if (recipientMembershipId) {
    const { data: membershipRow } = await supabase
      .from('organization_memberships')
      .select('profile_id')
      .eq('id', recipientMembershipId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .maybeSingle();

    recipientProfileId = membershipRow?.profile_id ?? null;
  }

  const recipientIds = [recipientProfileId, auth.user.id].filter(Boolean) as string[];
  const uniqueRecipientIds = [...new Set(recipientIds)];

  if (uniqueRecipientIds.length) {
    const { error: notificationError } = await admin.from('notifications').insert(
      uniqueRecipientIds.map((recipientId) => ({
        organization_id: organizationId,
        case_id: caseId,
        recipient_profile_id: recipientId,
        kind: 'generic',
        title: `AI 작업 등록: ${title}`,
        body: dueAt
          ? `${caseRow.title} 사건에 작업과 일정이 등록되었습니다. 완료 전까지 대시보드와 일정 확인 메뉴에서 추적하세요.`
          : `${caseRow.title} 사건에 작업이 등록되었습니다. 일정은 수동 확인이 필요합니다.`,
        payload: {
          source: 'dashboard_ai',
          request_id: requestRow.id,
          due_at: dueAt
        }
      }))
    );

    if (notificationError) {
      return NextResponse.json({ error: notificationError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
