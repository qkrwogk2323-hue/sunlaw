'use server';

import type { Route } from 'next';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { findMembership, getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { getAuthenticatedHomePath } from '@/lib/client-account';
import { formatResidentRegistrationNumberMasked, isValidResidentRegistrationNumber, normalizeResidentRegistrationNumber } from '@/lib/format';
import { encryptString } from '@/lib/pii';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { profileLegalNameSchema } from '@/lib/validators';

function isMissingLegalNameColumnError(error: { code?: string; message?: string } | null) {
  return error?.code === '42703'
    || error?.code === 'PGRST204'
    || Boolean(error?.message?.includes('legal_name'));
}

const initialProfileSchema = z.object({
  phone: z.string().trim().min(8, '연락처를 입력해 주세요.'),
  residentNumber: z.string().trim().min(13, '주민등록번호 13자리를 입력해 주세요.'),
  addressLine1: z.string().trim().min(3, '주소를 입력해 주세요.'),
  addressLine2: z.string().trim().optional().or(z.literal(''))
});

// 회원 실명 입력을 확정하고 필수 프로필 단계를 갱신한다.
export async function completeLegalNameAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  const parsed = profileLegalNameSchema.parse({
    legalName: formData.get('legalName')
  });
  const supabase = await createSupabaseServerClient();
  const confirmedAt = new Date().toISOString();

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.legalName,
      legal_name: parsed.legalName,
      legal_name_confirmed_at: confirmedAt
    })
    .eq('id', auth.user.id);

  if (error) {
    if (!isMissingLegalNameColumnError(error)) {
      throw error;
    }

    const { error: fallbackError } = await supabase
      .from('profiles')
      .update({
        full_name: parsed.legalName
      })
      .eq('id', auth.user.id);

    if (fallbackError) throw fallbackError;
  }

  revalidatePath('/login');
  revalidatePath('/dashboard');
  revalidatePath('/portal');
  revalidatePath('/start/profile-name');
  redirect(getAuthenticatedHomePath({
    ...auth,
    profile: {
      ...auth.profile,
      full_name: parsed.legalName,
      legal_name: parsed.legalName,
      legal_name_confirmed_at: confirmedAt
    }
  }) as Route);
}

// 구성원이 처음 사용하는 데 필요한 기본 프로필을 저장한다.
export async function completeMemberInitialProfileAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  const parsed = initialProfileSchema.parse({
    phone: formData.get('phone'),
    residentNumber: formData.get('residentNumber'),
    addressLine1: formData.get('addressLine1'),
    addressLine2: formData.get('addressLine2')
  });

  const normalizedResident = normalizeResidentRegistrationNumber(parsed.residentNumber);
  if (normalizedResident.length !== 13 || !isValidResidentRegistrationNumber(normalizedResident)) {
    throw new Error('유효한 주민등록번호 13자리를 입력해 주세요.');
  }

  const supabase = await createSupabaseServerClient();
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      phone_e164: parsed.phone.trim(),
      must_complete_profile: false
    })
    .eq('id', auth.user.id);
  if (profileError) throw profileError;

  const { error: privateProfileError } = await supabase
    .from('member_private_profiles')
    .upsert({
      profile_id: auth.user.id,
      resident_number_ciphertext: encryptString(normalizedResident),
      resident_number_masked: formatResidentRegistrationNumberMasked(normalizedResident),
      address_line1_ciphertext: encryptString(parsed.addressLine1.trim()),
      address_line2_ciphertext: parsed.addressLine2?.trim() ? encryptString(parsed.addressLine2.trim()) : null
    }, { onConflict: 'profile_id' });
  if (privateProfileError) throw privateProfileError;

  const organizationId = getEffectiveOrganizationId(auth);
  if (organizationId) {
    const admin = createSupabaseAdminClient();
    const [{ data: managers }, { data: existing }] = await Promise.all([
      admin
        .from('organization_memberships')
        .select('profile_id')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .in('role', ['org_owner', 'org_manager']),
      admin
        .from('notifications')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('action_label', '초기 등록 확인')
        .eq('action_target_id', auth.user.id)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .limit(1)
        .maybeSingle()
    ]);

    if (!existing?.id) {
      const recipients = Array.from(new Set((managers ?? []).map((row: any) => row.profile_id).filter(Boolean)));
      const currentMembership = findMembership(auth, organizationId);
      if (recipients.length) {
        await admin.from('notifications').insert(
          recipients.map((recipientProfileId) => ({
            organization_id: organizationId,
            recipient_profile_id: recipientProfileId,
            kind: 'generic',
            title: `${auth.profile.full_name || '구성원'} 초기 등록 정보 확인`,
            body: '임시 계정 사용자가 비밀번호 변경 및 본인정보 입력을 완료했습니다. 연결 상태를 확인해 주세요.',
            requires_action: true,
            action_label: '초기 등록 확인',
            action_href: currentMembership?.id ? `/settings/team?member=${currentMembership.id}` : '/settings/team',
            action_entity_type: 'membership',
            action_target_id: auth.user.id
          }))
        );
      }
    }
  }

  revalidatePath('/settings/team');
  revalidatePath('/dashboard');
  revalidatePath('/start/member-profile');
  redirect(getAuthenticatedHomePath({
    ...auth,
    profile: {
      ...auth.profile,
      must_complete_profile: false
    }
  }) as Route);
}
