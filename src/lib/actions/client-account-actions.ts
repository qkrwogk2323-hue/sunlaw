'use server';

import type { Route } from 'next';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser, requireOrganizationActionAccess } from '@/lib/auth';
import { clientAccountStatusLabel } from '@/lib/client-account';
import { formatResidentRegistrationNumberMasked } from '@/lib/format';
import {
  createConditionFailedFeedback,
  createValidationFailedFeedback,
  normalizeGuardFeedback,
  parseGuardFeedback,
  throwGuardFeedback
} from '@/lib/guard-feedback';
import { isPlatformManagementOrganization } from '@/lib/platform-governance';
import { encryptString } from '@/lib/pii';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { clientServiceRequestSchema, clientSignupSchema } from '@/lib/validators';

function getActionErrorMessage(error: unknown, fallback: string) {
  const guardFeedback = parseGuardFeedback(error);
  if (guardFeedback) {
    return guardFeedback.cause;
  }

  if (error instanceof z.ZodError || (error instanceof Error && error.message.trim().startsWith('['))) {
    const feedback = normalizeGuardFeedback(error, {
      type: 'validation_failed',
      code: 'VALIDATION_FAILED',
      blocked: fallback,
      cause: '입력값 형식을 확인해 주세요.',
      resolution: '필수 항목과 입력 형식을 수정한 뒤 다시 제출해 주세요.'
    });
    return feedback.cause;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

async function listActivePlatformAdminIds() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('organization_memberships')
    .select('profile_id, profile:profiles(id, is_active), organization:organizations(id, kind, is_platform_root)')
    .eq('status', 'active')
    .in('role', ['org_owner', 'org_manager']);

  if (error) throw error;
  return (data ?? [])
    .filter((row: any) => isPlatformManagementOrganization(row.organization) && row.profile?.is_active !== false)
    .map((row: any) => row.profile_id)
    .filter(Boolean);
}

// 의뢰인 회원가입 정보를 저장하고 초기 계정을 생성한다.
export async function submitClientSignupAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  let parsed: z.infer<typeof clientSignupSchema>;
  try {
    parsed = clientSignupSchema.parse({
      legalName: formData.get('legalName'),
      residentNumber: formData.get('residentNumber'),
      phone: formData.get('phone'),
      addressLine1: formData.get('addressLine1'),
      addressLine2: formData.get('addressLine2'),
      postalCode: formData.get('postalCode'),
      privacyConsent: formData.get('privacyConsent') === 'on',
      serviceConsent: formData.get('serviceConsent') === 'on'
    });
  } catch (error) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'CLIENT_SIGNUP_INPUT_INVALID',
      blocked: '의뢰인 가입 입력값을 다시 확인해 주세요.',
      cause: getActionErrorMessage(error, '필수 항목이 누락되었거나 형식이 올바르지 않습니다.'),
      resolution: '이름, 주민등록번호, 연락처와 필수 동의를 확인한 뒤 다시 제출해 주세요.'
    }));
  }

  const now = new Date().toISOString();
  const residentNumberMasked = formatResidentRegistrationNumberMasked(parsed.residentNumber);

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.legalName,
      phone_e164: parsed.phone,
      is_client_account: true,
      client_account_status: 'pending_initial_approval',
      client_account_status_changed_at: now,
      client_account_status_reason: '본인정보 등록 완료 후 최초 승인 대기',
      client_last_approved_at: null
    })
    .eq('id', auth.user.id);

  if (profileError) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'CLIENT_PROFILE_UPDATE_FAILED',
      blocked: '의뢰인 기본 상태를 저장하지 못했습니다.',
      cause: profileError.message,
      resolution: '잠시 후 다시 시도해 주세요. 반복되면 관리자에게 문의해 주세요.'
    }));
  }

  const { error: privateProfileError } = await supabase
    .from('client_private_profiles')
    .upsert({
      profile_id: auth.user.id,
      legal_name: parsed.legalName,
      resident_number_ciphertext: encryptString(parsed.residentNumber),
      resident_number_masked: residentNumberMasked,
      address_line1_ciphertext: parsed.addressLine1 ? encryptString(parsed.addressLine1) : null,
      address_line2_ciphertext: parsed.addressLine2 ? encryptString(parsed.addressLine2) : null,
      postal_code_ciphertext: parsed.postalCode ? encryptString(parsed.postalCode) : null,
      mobile_phone_ciphertext: encryptString(parsed.phone),
      created_by: auth.user.id,
      updated_by: auth.user.id
    }, { onConflict: 'profile_id' });

  if (privateProfileError) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'CLIENT_PRIVATE_PROFILE_SAVE_FAILED',
      blocked: '민감정보 저장을 완료하지 못했습니다.',
      cause: privateProfileError.message,
      resolution: '잠시 후 다시 시도해 주세요. 반복되면 관리자에게 문의해 주세요.'
    }));
  }

  const { data: authUser } = await admin.auth.admin.getUserById(auth.user.id);
  const existingMetadata = (authUser.user?.user_metadata ?? {}) as Record<string, unknown>;
  const consentRecordedAt = new Date().toISOString();
  await admin.auth.admin.updateUserById(auth.user.id, {
    user_metadata: {
      ...existingMetadata,
      full_name: parsed.legalName,
      signup_method: existingMetadata.signup_method ?? 'credential',
      privacy_consent_recorded_at: consentRecordedAt,
      privacy_consent_placeholder: true,
      service_consent_recorded_at: consentRecordedAt,
      service_consent_placeholder: true
    }
  });

  const selfNotification = {
    recipient_profile_id: auth.user.id,
    kind: 'generic',
    title: '의뢰인 가입이 접수되었습니다.',
    body: '본인정보 등록이 완료되었습니다. 이제 협업할 조직을 선택하고 승인 결과를 기다려 주세요.',
    payload: {
      category: 'client_signup_submitted',
      resident_number_masked: residentNumberMasked,
      client_account_status: 'pending_initial_approval'
    },
    action_label: '대기 상태 보기',
    action_href: '/start/pending',
    destination_type: 'internal_route',
    destination_url: '/start/pending'
  };

  const platformAdminIds = (await listActivePlatformAdminIds()).filter((profileId) => profileId !== auth.user.id);
  const adminNotifications = platformAdminIds.map((profileId) => ({
    recipient_profile_id: profileId,
    kind: 'generic',
    title: '새 의뢰인 가입이 접수되었습니다.',
    body: `${parsed.legalName}님 의뢰인 가입이 접수되었습니다. 조직 연결 및 승인 상태를 확인해 주세요.`,
    requires_action: true,
    payload: {
      category: 'client_signup_pending',
      profile_id: auth.user.id,
      resident_number_masked: residentNumberMasked
    },
    action_label: '의뢰인 가입 검토',
    action_href: '/client-access',
    destination_type: 'internal_route',
    destination_url: '/client-access'
  }));

  const { error: notificationError } = await admin.from('notifications').insert([selfNotification, ...adminNotifications]);
  if (notificationError) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'CLIENT_SIGNUP_NOTIFICATION_FAILED',
      blocked: '가입 알림 생성에 실패했습니다.',
      cause: notificationError.message,
      resolution: '가입 정보는 저장되었을 수 있으니 대기 상태 화면을 새로고침해 확인해 주세요.'
    }));
  }

  revalidatePath('/start/signup');
  revalidatePath('/start/pending');
  revalidatePath('/client-access');
  revalidatePath('/notifications');
  redirect('/start/pending?submitted=1' as Route);
}

// 의뢰인 포털에서 서비스 요청을 등록한다.
export async function createClientServiceRequestAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  let parsed: z.infer<typeof clientServiceRequestSchema>;
  try {
    parsed = clientServiceRequestSchema.parse({
      organizationId: formData.get('organizationId'),
      requestKind: formData.get('requestKind') || 'status_help',
      title: formData.get('title'),
      body: formData.get('body')
    });
  } catch (error) {
    throw new Error(getActionErrorMessage(error, '문의 내용을 확인해 주세요. 필수 항목이 누락되었거나 형식이 올바르지 않습니다.'));
  }

  const { data: created, error: insertError } = await supabase
    .from('client_service_requests')
    .insert({
      profile_id: auth.user.id,
      organization_id: parsed.organizationId || null,
      request_kind: parsed.requestKind,
      account_status_snapshot: auth.profile.client_account_status,
      title: parsed.title,
      body: parsed.body,
      created_by: auth.user.id,
      updated_by: auth.user.id
    })
    .select('id')
    .single();

  if (insertError || !created) throw insertError ?? new Error('문의 접수에 실패했습니다.');

  const recipientIds = new Set<string>();
  (await listActivePlatformAdminIds()).forEach((id) => recipientIds.add(id));

  if (parsed.organizationId) {
    const { data: managers } = await admin
      .from('organization_memberships')
      .select('profile_id, role')
      .eq('organization_id', parsed.organizationId)
      .eq('status', 'active')
      .in('role', ['org_owner', 'org_manager']);

    (managers ?? []).forEach((row: { profile_id: string }) => {
      if (row.profile_id) recipientIds.add(row.profile_id);
    });
  }

  const notifications = Array.from(recipientIds).map((recipientProfileId) => ({
    organization_id: parsed.organizationId || null,
    recipient_profile_id: recipientProfileId,
    kind: 'support_request',
    title: `의뢰인 문의 접수 - ${auth.profile.full_name}`,
    body: `${clientAccountStatusLabel(auth.profile.client_account_status)} 상태 사용자가 고객센터 문의를 남겼습니다.`,
    requires_action: true,
    payload: {
      category: 'client_service_request',
      request_id: created.id,
      profile_id: auth.user.id,
      request_kind: parsed.requestKind
    },
    action_label: '고객센터 문의 확인',
    action_href: '/admin/support',
    destination_type: 'internal_route',
    destination_url: '/admin/support'
  }));

  if (notifications.length) {
    const { error: notificationError } = await admin.from('notifications').insert(notifications);
    if (notificationError) throw notificationError;
  }

  revalidatePath('/start/pending');
  revalidatePath('/notifications');
  redirect('/start/pending?help=1' as Route);
}

// 의뢰인 포털 접근을 중지하고 관련 연결 상태를 갱신한다.
export async function deactivateClientPortalAccessAction(formData: FormData) {
  const caseClientId = `${formData.get('caseClientId') ?? ''}`;
  if (!caseClientId) {
    throw new Error('caseClientId is required');
  }

  const admin = createSupabaseAdminClient();
  const { data: caseClient, error: caseClientError } = await admin
    .from('case_clients')
    .select('id, organization_id, case_id, profile_id, client_name, is_portal_enabled, link_status')
    .eq('id', caseClientId)
    .maybeSingle();

  if (caseClientError || !caseClient) {
    throw caseClientError ?? new Error('의뢰인 연결 정보를 찾을 수 없습니다.');
  }

  const { auth } = await requireOrganizationActionAccess(caseClient.organization_id, {
    permission: 'case_edit',
    errorMessage: '의뢰인 연결을 해제할 권한이 없습니다.'
  });

  const { error: updateError } = await admin
    .from('case_clients')
    .update({
      is_portal_enabled: false,
      link_status: caseClient.link_status === 'unlinked' ? 'unlinked' : 'pending_unlink',
      relink_policy: 'admin_override_only',
      updated_by: auth.user.id
    })
    .eq('id', caseClientId);

  if (updateError) throw updateError;

  if (caseClient.profile_id) {
    const { count: remainingActiveLinks, error: remainingError } = await admin
      .from('case_clients')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', caseClient.profile_id)
      .eq('is_portal_enabled', true);

    if (remainingError) throw remainingError;

    if ((remainingActiveLinks ?? 0) === 0) {
      const now = new Date().toISOString();
      const { error: profileError } = await admin
        .from('profiles')
        .update({
          is_client_account: true,
          client_account_status: 'pending_reapproval',
          client_account_status_changed_at: now,
          client_account_status_reason: `${caseClient.client_name} 연결이 해제되어 재승인 대기 상태로 전환됨`
        })
        .eq('id', caseClient.profile_id);

      if (profileError) throw profileError;

      const { error: notificationError } = await admin.from('notifications').insert({
        organization_id: caseClient.organization_id,
        case_id: caseClient.case_id,
        recipient_profile_id: caseClient.profile_id,
        kind: 'generic',
        title: '조직 연결이 해제되었습니다.',
        body: '현재 계정은 재승인 대기 상태로 전환되었습니다. 새 연결 요청을 보내거나 고객센터에 문의해 주세요.',
        payload: {
          category: 'client_reapproval_required',
          case_client_id: caseClient.id,
          organization_id: caseClient.organization_id
        },
        action_label: '대기 상태 보기',
        action_href: '/start/pending',
        destination_type: 'internal_route',
        destination_url: '/start/pending'
      });

      if (notificationError) throw notificationError;
    }
  }

  revalidatePath('/clients');
  revalidatePath(`/cases/${caseClient.case_id}`);
  revalidatePath('/portal');
  revalidatePath('/start/pending');
}
