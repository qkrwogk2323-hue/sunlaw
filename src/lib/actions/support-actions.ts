'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getEffectiveOrganizationId, requireAuthenticatedUser, requireOrganizationActionAccess, requirePlatformAdminAction } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { platformSupportTicketReviewSchema, platformSupportTicketSchema, supportRequestSchema } from '@/lib/validators';
import { clearSupportSessionCookie, writeSupportSessionCookie } from '@/lib/support-cookie';
import { createConditionFailedFeedback, createValidationFailedFeedback, throwGuardFeedback } from '@/lib/guard-feedback';
import { isPlatformManagementOrganization } from '@/lib/platform-governance';

function throwSupportValidation(code: string, blocked: string, cause: string, resolution: string): never {
  throwGuardFeedback(createValidationFailedFeedback({ code, blocked, cause, resolution }));
}

function throwSupportCondition(code: string, blocked: string, cause: string, resolution: string): never {
  throwGuardFeedback(createConditionFailedFeedback({ code, blocked, cause, resolution }));
}

async function notifyProfiles(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('notifications').insert(rows);
  if (error) throw error;
}

async function listPlatformAdminRecipients() {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('organization_memberships')
    .select('profile_id, organization_id, role, organization:organizations(id, kind, is_platform_root)')
    .eq('status', 'active')
    .in('role', ['org_owner', 'org_manager']);

  return (data ?? [])
    .filter((row: any) => isPlatformManagementOrganization(Array.isArray(row.organization) ? row.organization[0] : row.organization))
    .map((row: any) => ({ profileId: row.profile_id as string, organizationId: row.organization_id as string }));
}

// 일반 사용자가 플랫폼 운영팀에 문의·요청·의견을 보낸다.
export async function createPlatformSupportTicketAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  let parsed;
  try {
    parsed = platformSupportTicketSchema.parse({
      category: formData.get('category'),
      title: formData.get('title'),
      body: formData.get('body')
    });
  } catch (error) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'PLATFORM_SUPPORT_TICKET_INVALID',
      blocked: '고객센터 문의 내용을 다시 확인해 주세요.',
      cause: error instanceof Error ? error.message : '필수 항목이 누락되었거나 형식이 올바르지 않습니다.',
      resolution: '구분, 제목, 내용을 다시 확인한 뒤 다시 제출해 주세요.'
    }));
  }

  const organizationId = getEffectiveOrganizationId(auth);
  const organizationName = auth.memberships.find((membership) => membership.organization_id === organizationId)?.organization?.name ?? null;
  const { data: ticket, error } = await supabase
    .from('platform_support_tickets')
    .insert({
      organization_id: organizationId,
      requester_profile_id: auth.user.id,
      requester_name_snapshot: auth.profile.full_name,
      requester_email_snapshot: auth.user.email ?? auth.profile.email,
      organization_name_snapshot: organizationName,
      category: parsed.category,
      title: parsed.title,
      body: parsed.body,
      status: 'received'
    })
    .select('id')
    .single();

  if (error || !ticket) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'PLATFORM_SUPPORT_TICKET_CREATE_FAILED',
      blocked: '고객센터 문의를 저장하지 못했습니다.',
      cause: error?.message ?? '접수 번호를 만들지 못했습니다.',
      resolution: '잠시 후 다시 시도해 주세요. 반복되면 관리자에게 문의해 주세요.'
    }));
  }

  const recipients = await listPlatformAdminRecipients();
  await notifyProfiles(
    recipients.map((recipient) => ({
      organization_id: recipient.organizationId,
      recipient_profile_id: recipient.profileId,
      kind: 'generic',
      title: `고객센터 ${parsed.category === 'bug' ? '오류 신고' : parsed.category === 'opinion' ? '의견' : parsed.category === 'request' ? '요청' : '문의'} 접수`,
      body: `${auth.profile.full_name} 사용자가 "${parsed.title}" 내용을 보냈습니다.`,
      requires_action: true,
      action_label: '고객센터 확인',
      action_href: '/admin/support',
      destination_type: 'internal_route',
      destination_url: '/admin/support',
      action_entity_type: 'platform_support_ticket',
      action_target_id: ticket.id
    }))
  );

  void admin.from('audit_logs').insert({
    actor_id: auth.user.id,
    action: 'platform_support_ticket.created',
    resource_type: 'platform_support_ticket',
    resource_id: ticket.id,
    organization_id: organizationId,
    meta: {
      category: parsed.category,
      title: parsed.title
    }
  });

  revalidatePath('/support');
  revalidatePath('/admin/support');
}

// 플랫폼 운영팀이 고객센터 문의 상태와 답변을 관리한다.
export async function updatePlatformSupportTicketAction(formData: FormData) {
  const auth = await requirePlatformAdminAction('플랫폼 관리자만 고객센터 문의를 처리할 수 있습니다.');
  const supabase = await createSupabaseServerClient();

  let parsed;
  try {
    parsed = platformSupportTicketReviewSchema.parse({
      ticketId: formData.get('ticketId'),
      status: formData.get('status'),
      handledNote: formData.get('handledNote')
    });
  } catch (error) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'PLATFORM_SUPPORT_TICKET_REVIEW_INVALID',
      blocked: '고객센터 처리 정보를 다시 확인해 주세요.',
      cause: error instanceof Error ? error.message : '처리 상태 또는 답변 메모 형식이 올바르지 않습니다.',
      resolution: '상태와 답변 메모를 다시 입력한 뒤 시도해 주세요.'
    }));
  }

  const { data: updated, error } = await supabase
    .from('platform_support_tickets')
    .update({
      status: parsed.status,
      handled_note: parsed.handledNote || null,
      handled_by_profile_id: auth.user.id,
      handled_by_name: auth.profile.full_name,
      handled_at: new Date().toISOString()
    })
    .eq('id', parsed.ticketId)
    .select('id, requester_profile_id, title, organization_id')
    .single();

  if (error || !updated) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'PLATFORM_SUPPORT_TICKET_REVIEW_FAILED',
      blocked: '고객센터 문의 상태를 바꾸지 못했습니다.',
      cause: error?.message ?? '처리 대상 문의를 찾지 못했습니다.',
      resolution: '목록을 새로고침한 뒤 다시 시도해 주세요.'
    }));
  }

  await notifyProfiles([
    {
      organization_id: updated.organization_id,
      recipient_profile_id: updated.requester_profile_id,
      kind: 'generic',
      title: '고객센터 처리 상태가 갱신되었습니다.',
      body: `"${updated.title}" 문의가 ${parsed.status === 'in_review' ? '검토 중' : parsed.status === 'answered' ? '답변 완료' : '종료'} 상태로 변경되었습니다.`,
      action_label: '고객센터 보기',
      action_href: '/support',
      destination_type: 'internal_route',
      destination_url: '/support',
      action_entity_type: 'platform_support_ticket',
      action_target_id: updated.id
    }
  ]);

  revalidatePath('/support');
  revalidatePath('/admin/support');
}

// 고객센터 문의를 생성하고 담당자에게 알린다.
export async function createSupportRequestAction(formData: FormData) {
  const auth = await requirePlatformAdminAction('플랫폼 관리자만 지원 접속을 요청할 수 있습니다.');
  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();

  let parsed;
  try {
    parsed = supportRequestSchema.parse({
      organizationId: formData.get('organizationId'),
      targetEmail: formData.get('targetEmail'),
      reason: formData.get('reason'),
      expiresHours: formData.get('expiresHours')
    });
  } catch (error) {
    throwSupportValidation(
      'SUPPORT_REQUEST_INVALID',
      '지원 접속 요청 정보를 다시 확인해 주세요.',
      error instanceof Error ? error.message : '필수 항목이 누락되었거나 형식이 올바르지 않습니다.',
      '조직, 대상 이메일, 사유와 접속 시간을 다시 입력한 뒤 시도해 주세요.'
    );
  }

  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', parsed.targetEmail)
    .maybeSingle();

  if (!targetProfile) {
    throwSupportCondition(
      'SUPPORT_TARGET_USER_NOT_FOUND',
      '지원 접속 대상 사용자를 찾지 못했습니다.',
      '입력한 이메일에 해당하는 계정이 아직 생성되지 않았습니다.',
      '먼저 대상 사용자를 가입시키거나 계정 이메일을 다시 확인해 주세요.'
    );
  }

  const { data: organization } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', parsed.organizationId)
    .single();

  if (!organization) {
    throwSupportCondition(
      'SUPPORT_ORGANIZATION_NOT_FOUND',
      '지원 대상 조직을 찾지 못했습니다.',
      '선택한 조직이 삭제되었거나 현재 권한으로 조회되지 않습니다.',
      '조직 목록을 새로고침한 뒤 다시 선택해 주세요.'
    );
  }

  const { data: activeMembership } = await adminClient
    .from('organization_memberships')
    .select('id')
    .eq('organization_id', organization.id)
    .eq('profile_id', targetProfile.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!activeMembership) {
    throwSupportCondition(
      'SUPPORT_TARGET_NOT_ACTIVE_MEMBER',
      '지원 접속 대상을 승인할 수 없습니다.',
      '대상 계정이 해당 조직의 활성 구성원이 아닙니다.',
      '먼저 조직 구성원 상태를 활성으로 맞춘 뒤 다시 요청해 주세요.'
    );
  }

  const expiresAt = new Date(Date.now() + parsed.expiresHours * 60 * 60 * 1000).toISOString();

  const { data: requestRow, error } = await supabase
    .from('support_access_requests')
    .insert({
      organization_id: organization.id,
      organization_name_snapshot: organization.name,
      target_profile_id: targetProfile.id,
      target_name_snapshot: targetProfile.full_name,
      target_email_snapshot: targetProfile.email,
      requested_by: auth.user.id,
      requested_by_name: auth.profile.full_name,
      reason: parsed.reason,
      status: 'pending',
      expires_at: expiresAt
    })
    .select('id')
    .single();

  if (error || !requestRow) {
    throwSupportCondition(
      'SUPPORT_REQUEST_CREATE_FAILED',
      '지원 접속 요청을 저장하지 못했습니다.',
      error?.message ?? '요청 번호를 생성하지 못했습니다.',
      '잠시 후 다시 시도해 주세요. 반복되면 관리자에게 문의해 주세요.'
    );
  }

  const { data: approvers } = await supabase
    .from('organization_memberships')
    .select('profile_id')
    .eq('organization_id', organization.id)
    .in('role', ['org_owner', 'org_manager'])
    .eq('status', 'active');

  await notifyProfiles(
    (approvers ?? []).map((approver) => ({
      organization_id: organization.id,
      recipient_profile_id: approver.profile_id,
      kind: 'support_request',
      title: `지원 접속 승인 요청 - ${targetProfile.full_name}`,
      body: `${auth.profile.full_name} 관리자가 지원 접속 승인을 요청했습니다.`,
      requires_action: true,
      action_label: '지원 요청 보기',
      action_href: '/admin/support',
      action_entity_type: 'support_access_request',
      action_target_id: requestRow.id
    }))
  );

  revalidatePath('/admin/support');
}

// 고객센터 문의를 승인 또는 반려 처리한다.
export async function decideSupportRequestAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();
  const requestId = `${formData.get('requestId') ?? ''}`;
  const decision = `${formData.get('decision') ?? ''}`;
  const approvalNote = `${formData.get('approvalNote') ?? ''}`;

  if (!requestId || !['approved', 'rejected'].includes(decision)) {
    throwSupportValidation(
      'SUPPORT_REQUEST_DECISION_INVALID',
      '지원 접속 승인 요청 형식이 올바르지 않습니다.',
      '요청 번호가 없거나 승인 상태 값이 허용된 범위를 벗어났습니다.',
      '목록에서 다시 요청을 선택한 뒤 승인 또는 반려를 진행해 주세요.'
    );
  }

  const { data: requestRow } = await supabase
    .from('support_access_requests')
    .select('id, organization_id, requested_by, organization_name_snapshot, target_name_snapshot')
    .eq('id', requestId)
    .single();

  if (!requestRow) {
    throwSupportCondition(
      'SUPPORT_REQUEST_NOT_FOUND',
      '지원 접속 요청을 찾지 못했습니다.',
      '이미 처리되었거나 삭제된 요청입니다.',
      '목록을 새로고침해 최신 요청 상태를 확인해 주세요.'
    );
  }

  const { auth } = await requireOrganizationActionAccess(requestRow.organization_id, {
    requireManager: true,
    errorMessage: '승인은 해당 조직의 오너 또는 매니저만 가능합니다.'
  });

  const { error } = await supabase
    .from('support_access_requests')
    .update({
      status: decision,
      approved_by: auth.user.id,
      approved_by_name: auth.profile.full_name,
      approved_at: new Date().toISOString(),
      approval_note: approvalNote || null
    })
    .eq('id', requestId);

  if (error) {
    throw error;
  }

  await adminClient
    .from('notifications')
    .update({ resolved_at: new Date().toISOString() })
    .eq('organization_id', requestRow.organization_id)
    .eq('action_entity_type', 'support_access_request')
    .eq('action_target_id', requestId)
    .is('resolved_at', null);

  await notifyProfiles([
    {
      organization_id: requestRow.organization_id,
      recipient_profile_id: requestRow.requested_by,
      kind: 'support_request',
      title: `지원 접속 ${decision === 'approved' ? '승인' : '반려'} - ${requestRow.target_name_snapshot}`,
      body: `${auth.profile.full_name} 사용자가 ${requestRow.organization_name_snapshot} 조직의 지원 접속 요청을 ${decision === 'approved' ? '승인' : '반려'}했습니다.`,
      action_label: '지원 요청 보기',
      action_href: '/admin/support',
      destination_type: 'internal_route',
      destination_url: '/admin/support'
    }
  ]);

  void supabase.from('audit_logs').insert({
    actor_id: auth.user.id,
    action: decision === 'approved' ? 'support_request.approved' : 'support_request.rejected',
    resource_type: 'support_access_request',
    resource_id: requestId,
    organization_id: requestRow.organization_id,
    meta: {
      requested_by: requestRow.requested_by,
      organization_name: requestRow.organization_name_snapshot,
      target_name: requestRow.target_name_snapshot,
      approval_note: approvalNote || null
    }
  });

  revalidatePath('/admin/support');
}

// 승인된 고객센터 요청에 대한 지원 세션을 시작한다.
export async function beginSupportSessionAction(formData: FormData) {
  const auth = await requirePlatformAdminAction('플랫폼 관리자만 지원 세션을 시작할 수 있습니다.');
  const requestId = `${formData.get('requestId') ?? ''}`;
  if (!requestId) {
    throwSupportValidation(
      'SUPPORT_SESSION_REQUEST_ID_MISSING',
      '지원 세션을 시작할 요청 번호가 없습니다.',
      '지원 세션 시작에 필요한 요청 식별자가 전달되지 않았습니다.',
      '지원 요청 목록에서 다시 시작해 주세요.'
    );
  }

  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();
  const { data: requestRow } = await supabase
    .from('support_access_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (!requestRow) {
    throwSupportCondition(
      'SUPPORT_SESSION_REQUEST_NOT_FOUND',
      '지원 세션 대상 요청을 찾지 못했습니다.',
      '요청이 이미 처리되었거나 삭제되었습니다.',
      '목록을 새로고침한 뒤 다시 시도해 주세요.'
    );
  }

  if (requestRow.status !== 'approved') {
    throwSupportCondition(
      'SUPPORT_SESSION_REQUEST_NOT_APPROVED',
      '지원 세션을 시작할 수 없는 상태입니다.',
      '승인된 요청만 실제 지원 세션으로 전환할 수 있습니다.',
      '먼저 해당 요청을 승인한 뒤 다시 시도해 주세요.'
    );
  }

  if (requestRow.expires_at && new Date(requestRow.expires_at).getTime() < Date.now()) {
    throwSupportCondition(
      'SUPPORT_SESSION_REQUEST_EXPIRED',
      '지원 접속 요청의 유효시간이 지났습니다.',
      '요청 만료 시각이 지나 더 이상 세션을 시작할 수 없습니다.',
      '새 지원 접속 요청을 다시 생성해 주세요.'
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: requestRow.target_email_snapshot,
    options: {
      redirectTo: `${appUrl}/dashboard`
    }
  });

  if (error || !data?.properties?.action_link) {
    throwSupportCondition(
      'SUPPORT_SESSION_LINK_CREATE_FAILED',
      '지원 접속 링크를 생성하지 못했습니다.',
      error?.message ?? '로그인 링크를 만들지 못했습니다.',
      '잠시 후 다시 시도해 주세요. 반복되면 관리자에게 문의해 주세요.'
    );
  }

  await writeSupportSessionCookie({
    requestId: requestRow.id,
    organizationId: requestRow.organization_id,
    organizationName: requestRow.organization_name_snapshot,
    targetName: requestRow.target_name_snapshot,
    targetEmail: requestRow.target_email_snapshot,
    startedAt: new Date().toISOString()
  });

  await supabase
    .from('support_access_requests')
    .update({ status: 'consumed', consumed_at: new Date().toISOString() })
    .eq('id', requestRow.id);

  redirect(data.properties.action_link as never);
}

// 현재 진행 중인 지원 세션을 종료한다.
export async function endSupportSessionAction() {
  const supabase = await createSupabaseServerClient();
  await clearSupportSessionCookie();
  await supabase.auth.signOut();
  redirect('/login');
}
