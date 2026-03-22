'use server';

import { revalidatePath } from 'next/cache';
import { requireOrganizationActionAccess } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 대시보드 공지 메시지를 저장하고 조직 구성원에게 노출한다.
export async function sendDashboardNoticeAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const organizationId = `${formData.get('organizationId') ?? ''}`;
  const recipientMode = `${formData.get('recipientMode') ?? 'managers'}`;
  const recipientMembershipId = `${formData.get('recipientMembershipId') ?? ''}`;
  const title = `${formData.get('title') ?? ''}`.trim();
  const body = `${formData.get('body') ?? ''}`.trim();

  if (!organizationId || !title || !body) {
    throw new Error('조직, 제목, 내용을 모두 입력해 주세요.');
  }

  const { auth } = await requireOrganizationActionAccess(organizationId, {
    permission: 'notification_create',
    errorMessage: '알리기 권한이 없습니다.'
  });

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
      throw memberError ?? new Error('대상 구성원을 찾을 수 없습니다.');
    }

    recipientProfileIds = [memberRow.profile_id];
  } else {
    const { data: rows, error } = await supabase
      .from('organization_memberships')
      .select('profile_id, role')
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    if (error) throw error;

    recipientProfileIds = (rows ?? [])
      .filter((row: any) => recipientMode === 'all' || row.role === 'org_owner' || row.role === 'org_manager')
      .map((row: any) => row.profile_id)
      .filter(Boolean);
  }

  recipientProfileIds = [...new Set(recipientProfileIds)].filter(Boolean);
  if (recipientMode !== 'self') {
    recipientProfileIds = recipientProfileIds.filter((id) => id !== auth.user.id);
  }
  if (!recipientProfileIds.length) {
    throw new Error('보낼 대상이 없습니다.');
  }

  const { error: notificationError } = await admin.from('notifications').insert(
    recipientProfileIds.map((recipientProfileId) => ({
      organization_id: organizationId,
      recipient_profile_id: recipientProfileId,
      kind: 'generic',
      title,
      body,
      action_label: '대시보드에서 확인',
      action_href: '/dashboard',
      destination_type: 'internal_route',
      destination_url: '/dashboard',
      payload: {
        source: 'dashboard_notice',
        sender_profile_id: auth.user.id,
        sender_name: auth.profile.full_name
      }
    }))
  );

  if (notificationError) throw notificationError;

  revalidatePath('/dashboard');
  revalidatePath('/notifications');
}
