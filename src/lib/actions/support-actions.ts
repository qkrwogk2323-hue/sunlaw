'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireOrganizationActionAccess, requirePlatformAdminAction } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supportRequestSchema } from '@/lib/validators';
import { clearSupportSessionCookie, writeSupportSessionCookie } from '@/lib/support-cookie';

async function notifyProfiles(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('notifications').insert(rows);
  if (error) throw error;
}

export async function createSupportRequestAction(formData: FormData) {
  const auth = await requirePlatformAdminAction('플랫폼 관리자만 지원 접속을 요청할 수 있습니다.');
  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();

  const parsed = supportRequestSchema.parse({
    organizationId: formData.get('organizationId'),
    targetEmail: formData.get('targetEmail'),
    reason: formData.get('reason'),
    expiresHours: formData.get('expiresHours')
  });

  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', parsed.targetEmail)
    .maybeSingle();

  if (!targetProfile) {
    throw new Error('대상 사용자를 찾을 수 없습니다. 먼저 Supabase Auth 사용자로 생성되어 있어야 합니다.');
  }

  const { data: organization } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', parsed.organizationId)
    .single();

  if (!organization) {
    throw new Error('조직을 찾을 수 없습니다.');
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
    throw error ?? new Error('지원 접속 요청 생성 실패');
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

export async function decideSupportRequestAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();
  const requestId = `${formData.get('requestId') ?? ''}`;
  const decision = `${formData.get('decision') ?? ''}`;
  const approvalNote = `${formData.get('approvalNote') ?? ''}`;

  if (!requestId || !['approved', 'rejected'].includes(decision)) {
    throw new Error('잘못된 요청입니다.');
  }

  const { data: requestRow } = await supabase
    .from('support_access_requests')
    .select('id, organization_id, requested_by, organization_name_snapshot, target_name_snapshot')
    .eq('id', requestId)
    .single();

  if (!requestRow) {
    throw new Error('지원 접속 요청을 찾을 수 없습니다.');
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
      action_href: '/admin/support'
    }
  ]);

  revalidatePath('/admin/support');
}

export async function beginSupportSessionAction(formData: FormData) {
  const auth = await requirePlatformAdminAction('플랫폼 관리자만 지원 세션을 시작할 수 있습니다.');
  const requestId = `${formData.get('requestId') ?? ''}`;
  if (!requestId) {
    throw new Error('requestId is required');
  }

  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();
  const { data: requestRow } = await supabase
    .from('support_access_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (!requestRow) {
    throw new Error('지원 접속 요청을 찾을 수 없습니다.');
  }

  if (requestRow.status !== 'approved') {
    throw new Error('승인된 요청만 지원 접속으로 전환할 수 있습니다.');
  }

  if (requestRow.expires_at && new Date(requestRow.expires_at).getTime() < Date.now()) {
    throw new Error('만료된 지원 접속 요청입니다.');
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
    throw error ?? new Error('지원 접속 링크를 생성하지 못했습니다.');
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

export async function endSupportSessionAction() {
  const supabase = await createSupabaseServerClient();
  await clearSupportSessionCookie();
  await supabase.auth.signOut();
  redirect('/login');
}
