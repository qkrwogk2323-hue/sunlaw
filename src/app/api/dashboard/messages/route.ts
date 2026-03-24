import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { findMembership, getCurrentAuth, hasActivePlatformAdminView, isManagementRole } from '@/lib/auth';
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

  const body = await request.json().catch(() => ({}));
  const organizationId = String(body.organizationId || '');
  // caseId는 선택 사항 — null이면 사건과 무관한 조직 내부 메시지로 저장
  const caseId = body.caseId ? String(body.caseId) : null;
  const content = String(body.content || '').trim();
  const recipientMembershipId = String(body.recipientMembershipId || '');
  const targetType = ['org', 'client', 'partner'].includes(String(body.targetType || '')) ? String(body.targetType) : 'org';
  const isInternal = true;

  if (!organizationId || !content) {
    return guardValidationFailedResponse(400, {
      blocked: '업무소통 전송이 차단되었습니다.',
      cause: 'organizationId 또는 content가 누락되었습니다.',
      resolution: '조직/메시지 내용을 확인한 뒤 다시 전송해 주세요.'
    });
  }

  if (targetType !== 'org') {
    return guardValidationFailedResponse(400, {
      blocked: '업무소통 전송이 차단되었습니다.',
      cause: '현재 대시보드는 조직 내부 업무소통(targetType=org)만 지원합니다.',
      resolution: '수신 대상을 조직 내부로 선택해 주세요.'
    });
  }

  const membership = findMembership(auth, organizationId);
  const isPlatformAdmin = await hasActivePlatformAdminView(auth, organizationId);
  if (!membership && !isPlatformAdmin) {
    return guardAccessDeniedResponse(403, {
      blocked: '업무소통 전송이 차단되었습니다.',
      cause: '현재 조직 멤버십 또는 플랫폼 관리자 권한이 확인되지 않았습니다.',
      resolution: '조직을 다시 선택하거나 권한 승인을 요청해 주세요.'
    });
  }

  const supabase = await createSupabaseServerClient();

  // caseId가 있을 때만 사건 존재 여부를 검증한다.
  let caseRow: { id: string; organization_id: string; title: string } | null = null;
  if (caseId) {
    const { data, error: caseError } = await supabase
      .from('cases')
      .select('id, organization_id, title')
      .eq('id', caseId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (caseError || !data) {
      return guardConditionFailedResponse(404, {
        blocked: '업무소통 전송이 차단되었습니다.',
        cause: caseError?.message || '요청한 사건을 찾을 수 없습니다.',
        resolution: '유효한 사건을 다시 선택한 뒤 전송해 주세요.'
      });
    }
    caseRow = data;
  }

  const senderRole = membership && isManagementRole(membership.role) ? 'admin' : 'staff';
  const { error: messageError } = await supabase.from('case_messages').insert({
    organization_id: organizationId,
    case_id: caseRow?.id ?? null,
    sender_profile_id: auth.user.id,
    sender_role: senderRole,
    body: content,
    is_internal: isInternal
  });

  if (messageError) {
    // case_id NOT NULL 제약 위반 감지 — migration 0084 미적용 상태
    const isNullViolation = messageError.message?.includes('null') && messageError.message?.includes('case_id');
    if (isNullViolation) {
      return guardConditionFailedResponse(500, {
        blocked: '조직소통 메시지 전송이 차단되었습니다.',
        cause: 'DB 스키마 업데이트(migration 0084)가 아직 적용되지 않았습니다.',
        resolution: 'Supabase 대시보드에서 migration 0084를 적용한 뒤 다시 시도해 주세요. (사건 연결 없이도 조직소통 메시지 전송 가능)'
      });
    }
    return guardServerErrorResponse(500, '메시지 저장에 실패해 전송이 차단되었습니다.');
  }

  if (recipientMembershipId && recipientMembershipId !== 'self') {
    const { data: recipientRow, error: recipientError } = await supabase
      .from('organization_memberships')
      .select('profile_id, profile:profiles(full_name)')
      .eq('id', recipientMembershipId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .maybeSingle();

    if (recipientError) {
      return guardServerErrorResponse(500, '수신 대상 조회에 실패해 전송이 차단되었습니다.');
    }

    if (recipientRow?.profile_id && recipientRow.profile_id !== auth.user.id) {
      const recipientProfile = Array.isArray(recipientRow.profile) ? recipientRow.profile[0] : recipientRow.profile;
      const admin = createSupabaseAdminClient();
      const destinationUrl = caseRow ? `/cases/${caseRow.id}` : '/dashboard';
      const { error: notificationError } = await admin.from('notifications').insert({
        organization_id: organizationId,
        case_id: caseRow?.id ?? null,
        recipient_profile_id: recipientRow.profile_id,
        kind: 'generic',
        title: caseRow ? `조직간 업무소통: ${caseRow.title}` : '조직소통 메시지',
        body: content.slice(0, 160),
        action_label: caseRow ? '사건 보기' : '대시보드로 이동',
        action_href: destinationUrl,
        destination_type: 'internal_route',
        destination_url: destinationUrl,
        payload: {
          source: 'dashboard_message',
          sender_profile_id: auth.user.id,
          sender_name: auth.profile.full_name,
          recipient_name: recipientProfile?.full_name ?? null
        }
      });

      if (notificationError) {
        return guardServerErrorResponse(500, '알림 생성에 실패해 전송이 차단되었습니다.');
      }
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/inbox');
  if (caseRow) revalidatePath(`/cases/${caseRow.id}`);

  return NextResponse.json({ ok: true });
}
