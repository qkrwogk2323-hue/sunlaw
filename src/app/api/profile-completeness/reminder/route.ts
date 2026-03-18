import { NextResponse } from 'next/server';
import { findMembership, getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

function startOfTodayIso() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return start.toISOString();
}

export async function POST() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  if (!organizationId) {
    return NextResponse.json({ ok: true, skipped: 'no_org' });
  }

  const admin = createSupabaseAdminClient();
  const [{ data: profile }, { data: privateProfile }] = await Promise.all([
    admin
      .from('profiles')
      .select('phone_e164')
      .eq('id', auth.user.id)
      .maybeSingle(),
    admin
      .from('member_private_profiles')
      .select('resident_number_masked, address_line1_ciphertext')
      .eq('profile_id', auth.user.id)
      .maybeSingle()
  ]);

  const missingResident = !`${privateProfile?.resident_number_masked ?? ''}`.trim();
  const missingAddress = !`${privateProfile?.address_line1_ciphertext ?? ''}`.trim();
  const missingPhone = !`${profile?.phone_e164 ?? ''}`.trim();
  if (!missingResident && !missingAddress && !missingPhone) {
    return NextResponse.json({ ok: true, missing: false });
  }

  const since = startOfTodayIso();
  const { data: alreadySent } = await admin
    .from('notifications')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('kind', 'generic')
    .eq('action_label', '구성원 정보 확인')
    .eq('action_target_id', auth.user.id)
    .gte('created_at', since)
    .limit(1)
    .maybeSingle();

  if (alreadySent?.id) {
    return NextResponse.json({ ok: true, sent: false, reason: 'already_sent_today' });
  }

  const { data: managers } = await admin
    .from('organization_memberships')
    .select('profile_id')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .in('role', ['org_owner', 'org_manager']);

  const recipients = Array.from(new Set((managers ?? []).map((item: any) => item.profile_id).filter(Boolean)));
  if (!recipients.length) {
    return NextResponse.json({ ok: true, sent: false, reason: 'no_manager' });
  }

  const missingItems = [
    missingResident ? '주민등록번호' : null,
    missingAddress ? '주소' : null,
    missingPhone ? '연락처' : null
  ].filter(Boolean).join(', ');

  const currentMembership = findMembership(auth, organizationId);
  const destinationUrl = currentMembership?.id ? `/settings/team?member=${currentMembership.id}` : '/settings/team';

  const rows = recipients.map((recipientProfileId) => ({
    organization_id: organizationId,
    recipient_profile_id: recipientProfileId,
    kind: 'generic',
    title: `${auth.profile.full_name} 구성원 정보 보완 필요`,
    body: `미기재 항목: ${missingItems}. 본인 수정 영역에서 입력이 필요합니다.`,
    requires_action: true,
    action_label: '구성원 정보 확인',
    action_href: destinationUrl,
    action_entity_type: 'client',
    action_target_id: auth.user.id
  }));

  const { error } = await admin.from('notifications').insert(rows);
  if (error) throw error;

  return NextResponse.json({ ok: true, sent: true, recipients: recipients.length });
}
