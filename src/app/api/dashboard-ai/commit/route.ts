import { NextResponse } from 'next/server';
import { getCurrentAuth, getPlatformOrganizationContextId, hasActivePlatformAdminView } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { guardAccessDeniedResponse, guardConditionFailedResponse, guardServerErrorResponse, guardValidationFailedResponse } from '@/lib/api-guard-response';

export async function POST(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return guardAccessDeniedResponse(401, {
      code: 'AUTH_REQUIRED',
      blocked: '인증이 필요해 요청이 차단되었습니다.',
      cause: '로그인 세션이 없거나 만료되었습니다.',
      resolution: '다시 로그인한 뒤 요청을 재시도해 주세요.'
    });
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
    return guardValidationFailedResponse(400, {
      blocked: 'AI 실행 요청이 차단되었습니다.',
      cause: 'organizationId, caseId, title, summary 중 필수 항목이 누락되었습니다.',
      resolution: '필수 항목을 입력한 뒤 다시 실행해 주세요.'
    });
  }

  const membership = auth.memberships.find((item) => item.organization_id === organizationId) ?? null;
  const platformContextId = getPlatformOrganizationContextId(auth);
  const isPlatformAdmin = await hasActivePlatformAdminView(auth, platformContextId);

  if (!membership && !isPlatformAdmin) {
    return guardAccessDeniedResponse(403, {
      blocked: 'AI 작업 반영이 차단되었습니다.',
      cause: '현재 조직 멤버십 또는 플랫폼 관리자 권한이 확인되지 않았습니다.',
      resolution: '조직을 다시 선택하거나 권한 승인을 요청해 주세요.'
    });
  }

  if (!isPlatformAdmin && !hasPermission(auth, organizationId, 'request_create')) {
    return guardAccessDeniedResponse(403, {
      blocked: '작업 요청 생성이 차단되었습니다.',
      cause: '현재 계정에 요청 생성 권한이 없습니다.',
      resolution: '조직 관리자에게 request_create 권한 승인을 요청해 주세요.'
    });
  }

  if (dueAt && !isPlatformAdmin && !hasPermission(auth, organizationId, 'schedule_create')) {
    return guardAccessDeniedResponse(403, {
      blocked: '일정 생성이 차단되었습니다.',
      cause: '현재 계정에 일정 생성 권한이 없습니다.',
      resolution: '조직 관리자에게 schedule_create 권한 승인을 요청해 주세요.'
    });
  }

  if (recipientMembershipId && !isPlatformAdmin && !hasPermission(auth, organizationId, 'notification_create')) {
    return guardAccessDeniedResponse(403, {
      blocked: '알림 생성이 차단되었습니다.',
      cause: '현재 계정에 알림 생성 권한이 없습니다.',
      resolution: '조직 관리자에게 notification_create 권한 승인을 요청해 주세요.'
    });
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
    return guardConditionFailedResponse(404, {
      blocked: '요청한 사건을 찾지 못해 작업이 차단되었습니다.',
      cause: '사건이 삭제되었거나 현재 조직과 일치하지 않습니다.',
      resolution: '사건 목록에서 유효한 사건을 다시 선택해 주세요.'
    });
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
    return guardServerErrorResponse(500, '작업 요청 생성에 실패해 AI 반영이 차단되었습니다.');
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
      return guardServerErrorResponse(500, '일정 생성에 실패해 AI 반영이 차단되었습니다.');
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
    return guardServerErrorResponse(500, '메시지 기록에 실패해 AI 반영이 차단되었습니다.');
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
      return guardServerErrorResponse(500, '알림 생성에 실패해 AI 반영이 차단되었습니다.');
    }
  }

  return NextResponse.json({ ok: true });
}
