import { NextResponse } from 'next/server';
import { getCurrentAuth, getPlatformOrganizationContextId, hasActivePlatformAdminView } from '@/lib/auth';
import { sanitizeAiChecklist, sanitizeAiText } from '@/lib/ai/guardrails';
import { prepareAiTextForFeature, prepareAiTextListForFeature } from '@/lib/ai/policy';
import { hasPermission } from '@/lib/permissions';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { guardAccessDeniedResponse, guardConditionFailedResponse, guardServerErrorResponse, guardValidationFailedResponse } from '@/lib/api-guard-response';

type SelectedItem = {
  label: string;
  detail: string;
  dueAt: string | null;
  priority: 'high' | 'medium' | 'low';
};

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
  const caseId = body.caseId ? String(body.caseId) : null;
  const title = String(body.title || '').trim();
  const summary = String(body.summary || '').trim();
  const recipientMode = String(body.recipientMode || 'self');
  const recipientMembershipId = body.recipientMembershipId ? String(body.recipientMembershipId) : null;
  const selectedItems = (Array.isArray(body.selectedItems) ? body.selectedItems : []) as SelectedItem[];

  if (!organizationId || !title || !summary || !selectedItems.length) {
    return guardValidationFailedResponse(400, {
      blocked: '조직 소통 AI 반영 요청이 차단되었습니다.',
      cause: 'organizationId, title, summary 또는 선택 항목이 누락되었습니다.',
      resolution: '필수 항목을 확인한 뒤 다시 실행해 주세요.'
    });
  }

  const membership = auth.memberships.find((item) => item.organization_id === organizationId) ?? null;
  const platformContextId = getPlatformOrganizationContextId(auth);
  const isPlatformAdmin = await hasActivePlatformAdminView(auth, platformContextId);

  if (!membership && !isPlatformAdmin) {
    return guardAccessDeniedResponse(403, {
      blocked: '조직 소통 AI 반영이 차단되었습니다.',
      cause: '현재 조직 멤버십 또는 플랫폼 관리자 권한이 확인되지 않았습니다.',
      resolution: '권한 없음'
    });
  }

  if (caseId && !isPlatformAdmin && !hasPermission(auth, organizationId, 'request_create')) {
    return guardAccessDeniedResponse(403, {
      blocked: '작업 요청 생성이 차단되었습니다.',
      cause: '현재 계정에 요청 생성 권한이 없습니다.',
      resolution: '조직 관리자에게 request_create 권한 승인을 요청해 주세요.'
    });
  }

  if (caseId && selectedItems.some((item) => Boolean(item.dueAt)) && !isPlatformAdmin && !hasPermission(auth, organizationId, 'schedule_create')) {
    return guardAccessDeniedResponse(403, {
      blocked: '일정 생성이 차단되었습니다.',
      cause: '현재 계정에 일정 생성 권한이 없습니다.',
      resolution: '조직 관리자에게 schedule_create 권한 승인을 요청해 주세요.'
    });
  }

  if (recipientMode !== 'self' && !isPlatformAdmin && !hasPermission(auth, organizationId, 'notification_create')) {
    return guardAccessDeniedResponse(403, {
      blocked: '알림 생성이 차단되었습니다.',
      cause: '현재 계정에 알림 생성 권한이 없습니다.',
      resolution: '조직 관리자에게 notification_create 권한 승인을 요청해 주세요.'
    });
  }

  const preparedHeader = prepareAiTextListForFeature('case_hub_conversation', [title, summary]);
  const [preparedTitle, preparedSummary] = preparedHeader.values;
  let itemSanitized = false;
  const sanitizedItems = sanitizeAiChecklist(selectedItems.map((item) => {
    const preparedLabel = prepareAiTextForFeature('case_hub_conversation', item.label);
    const preparedDetail = prepareAiTextForFeature('case_hub_conversation', item.detail);
    itemSanitized = itemSanitized || preparedLabel.hadSensitiveData || preparedDetail.hadSensitiveData;
    return ({
    ...item,
    label: sanitizeAiText(preparedLabel.value),
    detail: sanitizeAiText(preparedDetail.value)
  });
  }));
  const sanitizedSummary = sanitizeAiText(preparedSummary);

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
      return guardConditionFailedResponse(404, {
        blocked: '요청한 사건을 찾지 못해 작업이 차단되었습니다.',
        cause: '사건이 삭제되었거나 현재 조직과 일치하지 않습니다.',
        resolution: '사건 목록에서 유효한 사건을 다시 선택해 주세요.'
      });
    }

    caseRow = data;
  }

  const messageBody = `[조직간 업무소통 AI 정리]\n${sanitizedSummary}\n\n${sanitizedItems.map((item, index) => `${index + 1}. ${item.label}${item.dueAt ? ` · ${item.dueAt.slice(0, 10)}` : ''}\n${item.detail}`).join('\n\n')}`;

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
      return guardServerErrorResponse(500, '메시지 기록에 실패해 AI 반영이 차단되었습니다.');
    }

    for (const item of sanitizedItems) {
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
        return guardServerErrorResponse(500, '작업 요청 생성에 실패해 AI 반영이 차단되었습니다.');
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
          return guardServerErrorResponse(500, '일정 생성에 실패해 AI 반영이 차단되었습니다.');
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
      return guardConditionFailedResponse(400, {
        blocked: '알림 대상 선택이 차단되었습니다.',
        cause: memberError?.message ?? '선택한 구성원을 찾을 수 없습니다.',
        resolution: '유효한 활성 구성원을 다시 선택해 주세요.'
      });
    }

    recipientProfileIds = [memberRow.profile_id];
  } else {
    const { data: rows, error } = await supabase
      .from('organization_memberships')
      .select('profile_id, role')
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    if (error) {
      return guardServerErrorResponse(500, '알림 대상 조회에 실패해 작업이 차단되었습니다.');
    }

    recipientProfileIds = (rows ?? [])
      .filter((row: any) => recipientMode === 'all' || row.role === 'org_owner' || row.role === 'org_manager')
      .map((row: any) => row.profile_id)
      .filter(Boolean);
  }

  recipientProfileIds = [...new Set(recipientProfileIds)].filter(Boolean);
  if (!recipientProfileIds.length) {
    return guardConditionFailedResponse(400, {
      blocked: '알림 전송이 차단되었습니다.',
      cause: '전송 가능한 수신 대상을 찾지 못했습니다.',
      resolution: '수신자 모드를 확인하고 다시 시도해 주세요.'
    });
  }

  const notificationBody = `${sanitizedSummary}\n\n${sanitizedItems.map((item, index) => `${index + 1}. ${item.label}${item.dueAt ? ` · ${item.dueAt.slice(0, 10)}` : ''}`).join('\n')}`;
  const destinationUrl = caseRow?.id ? `/cases/${caseRow.id}` : '/notifications';
  const { error: notificationError } = await admin.from('notifications').insert(
    recipientProfileIds.map((recipientProfileId) => ({
      organization_id: organizationId,
      case_id: caseRow?.id ?? null,
      recipient_profile_id: recipientProfileId,
      kind: 'generic',
      entity_type: 'collaboration',
      action_label: '소통 내용 확인',
      action_href: destinationUrl,
      destination_type: 'internal_route',
      destination_url: destinationUrl,
      title: sanitizeAiText(preparedTitle),
      body: notificationBody,
      payload: {
        source: 'dashboard_coordination_ai',
        sender_profile_id: auth.user.id,
        sender_name: auth.profile.full_name,
        case_id: caseRow?.id ?? null,
        checklist_count: sanitizedItems.length
      }
    }))
  );

  if (notificationError) {
    return guardServerErrorResponse(500, '알림 생성에 실패해 AI 반영이 차단되었습니다.');
  }

  return NextResponse.json({ ok: true, inputSanitized: preparedHeader.hadSensitiveData || itemSanitized });
}
