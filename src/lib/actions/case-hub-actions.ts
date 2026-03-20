'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireOrganizationActionAccess } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// ────────────────────────────────────────────────────────────────────
// createCaseHubAction: 사건허브 생성
// 권한: case_edit
// ────────────────────────────────────────────────────────────────────
export async function createCaseHubAction(formData: FormData) {
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  const caseId = `${formData.get('caseId') ?? ''}`.trim();
  const primaryClientProfileId = `${formData.get('primaryClientProfileId') ?? ''}`.trim() || null;
  const title = `${formData.get('title') ?? ''}`.trim() || null;
  const collaboratorLimit = Math.max(1, parseInt(`${formData.get('collaboratorLimit') ?? '5'}`, 10) || 5);
  const viewerLimit = Math.max(1, parseInt(`${formData.get('viewerLimit') ?? '12'}`, 10) || 12);
  const visibilityScope = `${formData.get('visibilityScope') ?? 'organization'}`.trim();

  if (!organizationId || !caseId) {
    throw new Error('조직과 사건 정보가 필요합니다. 다시 시도해 주세요.');
  }

  const { auth } = await requireOrganizationActionAccess(organizationId, {
    permission: 'case_edit',
    errorMessage: '사건 수정 권한이 없어 허브를 생성할 수 없습니다.'
  });

  const admin = createSupabaseAdminClient();

  // 사건 존재 확인
  const { data: caseRow } = await admin
    .from('cases')
    .select('id, organization_id')
    .eq('id', caseId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!caseRow) {
    throw new Error('해당 사건을 찾을 수 없습니다. 사건 정보를 확인해 주세요.');
  }

  // 의뢰인 연결 확인
  const { data: clients } = await admin
    .from('case_clients')
    .select('id, profile_id')
    .eq('case_id', caseId)
    .limit(1);

  if (!clients?.length) {
    throw new Error('사건에 연결된 의뢰인이 없습니다. 먼저 의뢰인을 연결해 주세요.');
  }

  // 중복 허브 확인 (case_id UNIQUE)
  const { data: existing } = await admin
    .from('case_hubs')
    .select('id')
    .eq('case_id', caseId)
    .eq('lifecycle_status', 'active')
    .maybeSingle();

  if (existing) {
    throw new Error('이 사건에는 이미 허브가 존재합니다. 허브 입장을 이용해 주세요.');
  }

  // primary_client_id는 profiles.id여야 함 – case_clients의 profile_id를 사용
  let resolvedPrimaryClientId: string | null = null;
  if (primaryClientProfileId) {
    const { data: clientRow } = await admin
      .from('case_clients')
      .select('id, profile_id')
      .eq('case_id', caseId)
      .eq('profile_id', primaryClientProfileId)
      .maybeSingle();
    resolvedPrimaryClientId = clientRow?.profile_id ?? null;
  }
  if (!resolvedPrimaryClientId && clients[0]?.profile_id) {
    // 의뢰인 1명이면 자동 설정
    resolvedPrimaryClientId = clients[0].profile_id ?? null;
  }

  const { data: hub, error: insertError } = await admin
    .from('case_hubs')
    .insert({
      organization_id: organizationId,
      case_id: caseId,
      primary_client_id: resolvedPrimaryClientId,
      title,
      status: 'setup_required',
      collaborator_limit: collaboratorLimit,
      viewer_limit: viewerLimit,
      visibility_scope: ['organization', 'private', 'custom'].includes(visibilityScope)
        ? visibilityScope
        : 'organization',
      created_by: auth.profile.id,
      lifecycle_status: 'active'
    })
    .select('id')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      throw new Error('이 사건에는 이미 허브가 존재합니다. 허브 입장을 이용해 주세요.');
    }
    throw new Error(`허브 생성 중 오류가 발생했습니다. (${insertError.message}) 잠시 후 다시 시도해 주세요.`);
  }

  // 생성자를 owner로 자동 추가
  await admin.from('case_hub_members').insert({
    hub_id: hub.id,
    profile_id: auth.profile.id,
    membership_role: 'owner',
    access_level: 'full',
    seat_kind: 'collaborator',
    is_ready: false
  });

  // 활동 로그
  await admin.from('case_hub_activity').insert({
    hub_id: hub.id,
    actor_profile_id: auth.profile.id,
    action: 'hub_created',
    payload: { title, collaborator_limit: collaboratorLimit, viewer_limit: viewerLimit }
  });

  revalidatePath('/cases');
  revalidatePath('/case-hubs');

  redirect(`/case-hubs/${hub.id}`);
}

// ────────────────────────────────────────────────────────────────────
// updateCaseHubAction: 허브 설정 수정
// 권한: case_edit
// ────────────────────────────────────────────────────────────────────
export async function updateCaseHubAction(formData: FormData) {
  const hubId = `${formData.get('hubId') ?? ''}`.trim();
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  const title = `${formData.get('title') ?? ''}`.trim() || null;
  const collaboratorLimit = Math.max(1, parseInt(`${formData.get('collaboratorLimit') ?? '5'}`, 10) || 5);
  const viewerLimit = Math.max(1, parseInt(`${formData.get('viewerLimit') ?? '12'}`, 10) || 12);
  const status = `${formData.get('status') ?? ''}`.trim();

  if (!hubId || !organizationId) {
    throw new Error('허브 정보가 올바르지 않습니다. 페이지를 새로고침 해주세요.');
  }

  const { auth } = await requireOrganizationActionAccess(organizationId, {
    permission: 'case_edit',
    errorMessage: '사건 수정 권한이 없어 허브를 수정할 수 없습니다.'
  });

  const admin = createSupabaseAdminClient();

  const validStatuses = ['draft', 'setup_required', 'ready', 'active', 'review_pending', 'archived'];
  const { error } = await admin
    .from('case_hubs')
    .update({
      title,
      collaborator_limit: collaboratorLimit,
      viewer_limit: viewerLimit,
      ...(status && validStatuses.includes(status) ? { status } : {}),
      updated_at: new Date().toISOString()
    })
    .eq('id', hubId)
    .eq('organization_id', organizationId)
    .eq('lifecycle_status', 'active');

  if (error) {
    throw new Error(`허브 수정에 실패했습니다. (${error.message}) 잠시 후 다시 시도해 주세요.`);
  }

  await admin.from('case_hub_activity').insert({
    hub_id: hubId,
    actor_profile_id: auth.profile.id,
    action: 'hub_updated',
    payload: { title, collaborator_limit: collaboratorLimit, viewer_limit: viewerLimit }
  });

  revalidatePath(`/case-hubs/${hubId}`);
  revalidatePath('/case-hubs');
}

// ────────────────────────────────────────────────────────────────────
// inviteHubMemberAction: 참여자 초대
// 권한: case_assign
// ────────────────────────────────────────────────────────────────────
export async function inviteHubMemberAction(formData: FormData) {
  const hubId = `${formData.get('hubId') ?? ''}`.trim();
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  const profileId = `${formData.get('profileId') ?? ''}`.trim();
  const seatKind = `${formData.get('seatKind') ?? 'viewer'}`.trim() as 'collaborator' | 'viewer';
  const membershipRole = `${formData.get('membershipRole') ?? 'member'}`.trim();
  const accessLevel = `${formData.get('accessLevel') ?? 'view'}`.trim();

  if (!hubId || !organizationId || !profileId) {
    throw new Error('초대 정보가 올바르지 않습니다. 다시 시도해 주세요.');
  }

  const { auth } = await requireOrganizationActionAccess(organizationId, {
    permission: 'case_assign',
    errorMessage: '사건 배정 권한이 없어 참여자를 초대할 수 없습니다.'
  });

  const admin = createSupabaseAdminClient();

  // 허브 및 좌석 한도 확인
  const { data: hub } = await admin
    .from('case_hubs')
    .select('id, collaborator_limit, viewer_limit')
    .eq('id', hubId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!hub) {
    throw new Error('허브를 찾을 수 없습니다. 페이지를 새로고침 해주세요.');
  }

  // 현재 좌석 수 확인
  const { data: existing } = await admin
    .from('case_hub_members')
    .select('id, seat_kind')
    .eq('hub_id', hubId);

  const collaboratorCount = (existing ?? []).filter((m: any) => m.seat_kind === 'collaborator').length;
  const viewerCount = (existing ?? []).filter((m: any) => m.seat_kind === 'viewer').length;

  if (seatKind === 'collaborator' && collaboratorCount >= hub.collaborator_limit) {
    throw new Error(`협업 인원 한도(${hub.collaborator_limit}명)에 도달했습니다. 좌석 조정 후 다시 시도해 주세요.`);
  }
  if (seatKind === 'viewer' && viewerCount >= hub.viewer_limit) {
    throw new Error(`열람 인원 한도(${hub.viewer_limit}명)에 도달했습니다. 좌석 조정 후 다시 시도해 주세요.`);
  }

  const validRoles = ['owner', 'admin', 'member', 'viewer'];
  const validLevels = ['full', 'edit', 'view'];

  const { error } = await admin.from('case_hub_members').upsert({
    hub_id: hubId,
    profile_id: profileId,
    membership_role: validRoles.includes(membershipRole) ? membershipRole : 'member',
    access_level: validLevels.includes(accessLevel) ? accessLevel : 'view',
    seat_kind: seatKind,
    is_ready: false
  }, { onConflict: 'hub_id,profile_id' });

  if (error) {
    throw new Error(`참여자 초대에 실패했습니다. (${error.message}) 잠시 후 다시 시도해 주세요.`);
  }

  await admin.from('case_hub_activity').insert({
    hub_id: hubId,
    actor_profile_id: auth.profile.id,
    action: 'member_invited',
    payload: { profile_id: profileId, seat_kind: seatKind }
  });

  // 허브 updated_at 갱신
  await admin.from('case_hubs').update({ updated_at: new Date().toISOString() }).eq('id', hubId);

  revalidatePath(`/case-hubs/${hubId}`);
}

// ────────────────────────────────────────────────────────────────────
// updateHubMemberSeatAction: 좌석 변경
// 권한: case_assign
// ────────────────────────────────────────────────────────────────────
export async function updateHubMemberSeatAction(formData: FormData) {
  const hubId = `${formData.get('hubId') ?? ''}`.trim();
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  const memberId = `${formData.get('memberId') ?? ''}`.trim();
  const seatKind = `${formData.get('seatKind') ?? 'viewer'}`.trim();

  if (!hubId || !organizationId || !memberId) {
    throw new Error('좌석 변경 정보가 올바르지 않습니다. 다시 시도해 주세요.');
  }

  const { auth } = await requireOrganizationActionAccess(organizationId, {
    permission: 'case_assign',
    errorMessage: '사건 배정 권한이 없어 좌석을 변경할 수 없습니다.'
  });

  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from('case_hub_members')
    .update({ seat_kind: ['collaborator', 'viewer'].includes(seatKind) ? seatKind : 'viewer' })
    .eq('id', memberId)
    .eq('hub_id', hubId);

  if (error) {
    throw new Error(`좌석 변경에 실패했습니다. (${error.message}) 잠시 후 다시 시도해 주세요.`);
  }

  await admin.from('case_hub_activity').insert({
    hub_id: hubId,
    actor_profile_id: auth.profile.id,
    action: 'seat_changed',
    payload: { member_id: memberId, seat_kind: seatKind }
  });

  revalidatePath(`/case-hubs/${hubId}`);
}

// ────────────────────────────────────────────────────────────────────
// archiveCaseHubAction: 허브 보관 (soft delete)
// 권한: case_edit
// ────────────────────────────────────────────────────────────────────
export async function archiveCaseHubAction(formData: FormData) {
  const hubId = `${formData.get('hubId') ?? ''}`.trim();
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();

  if (!hubId || !organizationId) {
    throw new Error('허브 정보가 올바르지 않습니다. 페이지를 새로고침 해주세요.');
  }

  const { auth } = await requireOrganizationActionAccess(organizationId, {
    permission: 'case_edit',
    errorMessage: '사건 수정 권한이 없어 허브를 보관할 수 없습니다.'
  });

  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from('case_hubs')
    .update({ lifecycle_status: 'soft_deleted', status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', hubId)
    .eq('organization_id', organizationId);

  if (error) {
    throw new Error(`허브 보관에 실패했습니다. (${error.message}) 잠시 후 다시 시도해 주세요.`);
  }

  await admin.from('case_hub_activity').insert({
    hub_id: hubId,
    actor_profile_id: auth.profile.id,
    action: 'hub_archived',
    payload: {}
  });

  revalidatePath('/case-hubs');
  revalidatePath('/cases');

  redirect('/case-hubs');
}

// ────────────────────────────────────────────────────────────────────
// activateCaseHubAction: 허브 상태를 active로 전환 (협업 시작)
// 권한: case_edit
// ────────────────────────────────────────────────────────────────────
export async function activateCaseHubAction(formData: FormData) {
  const hubId = `${formData.get('hubId') ?? ''}`.trim();
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();

  if (!hubId || !organizationId) {
    throw new Error('허브 정보가 올바르지 않습니다. 페이지를 새로고침 해주세요.');
  }

  const { auth } = await requireOrganizationActionAccess(organizationId, {
    permission: 'case_edit',
    errorMessage: '사건 수정 권한이 없어 협업을 시작할 수 없습니다.'
  });

  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from('case_hubs')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', hubId)
    .eq('organization_id', organizationId)
    .eq('lifecycle_status', 'active');

  if (error) {
    throw new Error(`협업 시작 처리에 실패했습니다. (${error.message}) 잠시 후 다시 시도해 주세요.`);
  }

  await admin.from('case_hub_activity').insert({
    hub_id: hubId,
    actor_profile_id: auth.profile.id,
    action: 'hub_activated',
    payload: {}
  });

  revalidatePath(`/case-hubs/${hubId}`);
}
