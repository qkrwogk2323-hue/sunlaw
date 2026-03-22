'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser, requireOrganizationUserManagementAccess } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// 현재 세션을 종료하고 로그인 화면 흐름으로 되돌린다.
export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath('/');
  redirect('/login');
}

/**
 * 관리자가 특정 구성원의 모든 세션을 강제 무효화합니다.
 * 퇴사 처리, 계정 탈취 의심 시 즉시 세션 차단에 사용합니다.
 */
// 지정한 사용자의 활성 세션을 강제로 종료한다.
export async function revokeUserSessionsAction(formData: FormData) {
  const organizationId = `${formData.get('organizationId') ?? ''}`;
  const targetProfileId = `${formData.get('targetProfileId') ?? ''}`;

  if (!organizationId || !targetProfileId) {
    throw new Error('필수 파라미터가 누락되었습니다.');
  }

  const { auth } = await requireOrganizationUserManagementAccess(
    organizationId,
    '구성원 세션 무효화는 관리자만 할 수 있습니다.'
  );

  if (targetProfileId === auth.user.id) {
    throw new Error('자신의 세션은 이 기능으로 무효화할 수 없습니다. 직접 로그아웃하세요.');
  }

  const admin = createSupabaseAdminClient();

  // Supabase Auth Admin API — 해당 사용자의 모든 활성 세션 즉시 만료
  const { error } = await admin.auth.admin.signOut(targetProfileId, 'global');
  if (error) {
    throw new Error(`세션 무효화에 실패했습니다. Supabase Auth 오류: ${error.message}`);
  }

  revalidatePath('/settings/team');
}

// 임시 계정 사용자의 비밀번호 재설정 완료 상태를 저장한다.
export async function completeTemporaryCredentialPasswordResetAction() {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      must_change_password: false,
      must_complete_profile: true
    })
    .eq('id', auth.user.id);
  if (profileError) throw profileError;

  const { error: credentialError } = await supabase
    .from('organization_staff_temp_credentials')
    .update({
      must_change_password: false,
      last_password_changed_at: new Date().toISOString()
    })
    .eq('profile_id', auth.user.id);
  if (credentialError) throw credentialError;

  const { error: clientCredentialError } = await supabase
    .from('client_temp_credentials')
    .update({
      must_change_password: false,
      last_password_changed_at: new Date().toISOString()
    })
    .eq('profile_id', auth.user.id);
  if (clientCredentialError) throw clientCredentialError;

  revalidatePath('/settings/team');
  revalidatePath('/login');
}
