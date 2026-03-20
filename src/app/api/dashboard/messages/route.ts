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
  const caseId = String(body.caseId || '');
  const content = String(body.content || '').trim();
  const recipientMembershipId = String(body.recipientMembershipId || '');
  const targetType = ['org', 'client', 'partner'].includes(String(body.targetType || '')) ? String(body.targetType) : 'org';
  const isInternal = true;

  if (!organizationId || !caseId || !content) {
    return guardValidationFailedResponse(400, {
      blocked: '업무소통 전송이 차단되었습니다.',
      cause: 'organizationId, caseId, content 중 필수 값이 누락되었습니다.',
      resolution: '조직/사건/메시지 내용을 확인한 뒤 다시 전송해 주세요.'
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
  const { data: caseRow, error: caseError } = await supabase
    .from('cases')
    .select('id, organization_id, title')
    .eq('id', caseId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (caseError || !caseRow) {
    return guardConditionFailedResponse(404, {
      blocked: '업무소통 전송이 차단되었습니다.',
      cause: caseError?.message || '요청한 사건을 찾을 수 없습니다.',
      resolution: '유효한 사건을 다시 선택한 뒤 전송해 주세요.'
    });
  }

  const senderRole = membership && isManagementRole(membership.role) ? 'admin' : 'staff';
  const { error: messageError } = await supabase.from('case_messages').insert({
    organization_id: organizationId,
    case_id: caseId,
    sender_profile_id: auth.user.id,
    sender_role: senderRole,
    body: content,
    is_internal: isInternal
  });

  if (messageError) {
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
      const { error: notificationError } = await admin.from('notifications').insert({
        organization_id: organizationId,
        case_id: caseId,
        recipient_profile_id: recipientRow.profile_id,
        kind: 'generic',
        title: `조직간 업무소통: ${caseRow.title}`,
        body: content.slice(0, 160),
        action_label: '대시보드 열기',
        action_href: '/dashboard',
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
  revalidatePath(`/cases/${caseId}`);

  return NextResponse.json({ ok: true });
}
