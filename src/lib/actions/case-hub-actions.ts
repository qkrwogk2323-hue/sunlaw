'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser, requireOrganizationActionAccess } from '@/lib/auth';
import { throwGuardFeedback } from '@/lib/guard-feedback';
import { grantHubPinAccess, hashHubPin, revokeHubPinAccess } from '@/lib/hub-access';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

function generateFourDigitPin() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return `${1000 + (arr[0] % 9000)}`;
}

function pinExpiresAt() {
  return new Date(Date.now() + 1000 * 60 * 2).toISOString();
}

async function getAccessibleHubRecord(admin: ReturnType<typeof createSupabaseAdminClient>, hubId: string, organizationId: string) {
  const { data: bridgeRow, error: bridgeError } = await admin
    .from('case_hub_organizations')
    .select('hub_id')
    .eq('hub_id', hubId)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .maybeSingle();

  if (bridgeError || !bridgeRow) {
    return null;
  }

  const { data: hubRow, error: hubError } = await admin
    .from('case_hubs')
    .select('id, case_id, organization_id, collaborator_limit, viewer_limit, lifecycle_status')
    .eq('id', hubId)
    .maybeSingle();

  if (hubError || !hubRow) {
    return null;
  }

  return hubRow;
}

// ────────────────────────────────────────────────────────────────────
// createCaseHubAction: 사건허브 생성
// 권한: case_edit
// ────────────────────────────────────────────────────────────────────
// 사건허브를 새로 만들고 초기 좌석 구성을 저장한다.
export async function createCaseHubAction(formData: FormData) {
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  const caseId = `${formData.get('caseId') ?? ''}`.trim();
  const primaryClientProfileId = `${formData.get('primaryClientProfileId') ?? ''}`.trim() || null;
  const title = `${formData.get('title') ?? ''}`.trim() || null;
  const collaboratorLimit = Math.max(1, parseInt(`${formData.get('collaboratorLimit') ?? '5'}`, 10) || 5);
  const viewerLimit = Math.max(1, parseInt(`${formData.get('viewerLimit') ?? '12'}`, 10) || 12);
  const visibilityScope = `${formData.get('visibilityScope') ?? 'organization'}`.trim();
  const accessPin = `${formData.get('accessPin') ?? ''}`.trim();

  if (!organizationId || !caseId) {
    throw new Error('조직과 사건 정보가 필요합니다. 다시 시도해 주세요.');
  }

  const { auth } = await requireOrganizationActionAccess(organizationId, {
    permission: 'case_edit',
    errorMessage: '사건 수정 권한이 없어 허브를 생성할 수 없습니다.'
  });

  const admin = createSupabaseAdminClient();

  const [{ data: caseRow }, { data: caseOrganizationRow }] = await Promise.all([
    admin
      .from('cases')
      .select('id, organization_id')
      .eq('id', caseId)
      .maybeSingle(),
    admin
      .from('case_organizations')
      .select('id, organization_id, role, status')
      .eq('case_id', caseId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .maybeSingle()
  ]);

  if (!caseRow || (!caseOrganizationRow && caseRow.organization_id !== organizationId)) {
    throw new Error('해당 사건을 찾을 수 없습니다. 사건 정보를 확인해 주세요.');
  }

  // 의뢰인 연결 확인 (linked/pending_unlink만 유효)
  const { data: clients } = await admin
    .from('case_clients')
    .select('id, profile_id, link_status')
    .eq('case_id', caseId)
    .in('link_status', ['linked', 'pending_unlink'])
    .limit(1);

  if (!clients?.length) {
    throw new Error('사건에 연결된 의뢰인이 없습니다. 먼저 의뢰인을 연결해 주세요.');
  }

  // 중복 허브 확인 (case_id UNIQUE — soft_deleted 포함)
  const { data: existing } = await admin
    .from('case_hubs')
    .select('id, lifecycle_status')
    .eq('case_id', caseId)
    .maybeSingle();

  if (existing) {
    if (existing.lifecycle_status === 'soft_deleted') {
      throw new Error('이 사건에 삭제된 허브가 존재합니다. 보관함에서 복구하거나 관리자에게 문의해 주세요.');
    }
    throw new Error('이 사건에는 이미 허브가 존재합니다. 허브 입장을 이용해 주세요.');
  }

  // primary_client_id는 profiles.id여야 함 – case_clients의 profile_id를 사용
  let resolvedPrimaryClientId: string | null = null;
  let resolvedPrimaryClientCaseClientId: string | null = null;
  if (primaryClientProfileId) {
    const { data: clientRow } = await admin
      .from('case_clients')
      .select('id, profile_id')
      .eq('case_id', caseId)
      .eq('profile_id', primaryClientProfileId)
      .in('link_status', ['linked', 'pending_unlink'])
      .maybeSingle();
    resolvedPrimaryClientId = clientRow?.profile_id ?? null;
    resolvedPrimaryClientCaseClientId = clientRow?.id ?? null;
  }
  if (!resolvedPrimaryClientId && clients[0]?.profile_id) {
    // 의뢰인 1명이면 자동 설정
    resolvedPrimaryClientId = clients[0].profile_id ?? null;
    resolvedPrimaryClientCaseClientId = clients[0].id ?? null;
  }

  const { data: hub, error: insertError } = await admin
    .from('case_hubs')
    .insert({
      organization_id: organizationId,
      case_id: caseId,
      primary_client_id: resolvedPrimaryClientId,
      primary_case_client_id: resolvedPrimaryClientCaseClientId,
      title,
      status: 'setup_required',
      collaborator_limit: collaboratorLimit,
      viewer_limit: viewerLimit,
      visibility_scope: ['organization', 'private', 'custom'].includes(visibilityScope)
        ? visibilityScope
        : 'organization',
      access_pin_enabled: accessPin.length === 4,
      access_pin_hash: accessPin.length === 4 ? hashHubPin(accessPin) : null,
      access_pin_expires_at: accessPin.length === 4 ? pinExpiresAt() : null,
      created_by: auth.profile.id,
      lifecycle_status: 'active'
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[createCaseHubAction] 허브 insert 실패:', JSON.stringify(insertError));
    if (insertError.code === '23505') {
      throw new Error('이 사건에는 이미 허브가 존재합니다. 허브 입장을 이용해 주세요.');
    }
    throwGuardFeedback({
      type: 'condition_failed',
      code: 'HUB_CREATE_FAILED',
      blocked: '허브 생성에 실패했습니다.',
      cause: insertError.code === '23503' ? '사건 또는 조직 정보가 올바르지 않습니다.' : '데이터베이스 저장 중 문제가 발생했습니다.',
      resolution: '입력 조건을 확인하고 다시 시도해 주세요. 문제가 반복되면 관리자에게 문의하세요.'
    });
  }

  // 생성자를 owner로 자동 추가 + 활동 로그 (병렬 실행)
  const [memberResult, activityResult] = await Promise.all([
    admin.from('case_hub_members').insert({
      hub_id: hub.id,
      profile_id: auth.profile.id,
      membership_role: 'owner',
      access_level: 'full',
      seat_kind: 'collaborator',
      is_ready: false
    }),
    admin.from('case_hub_activity').insert({
      hub_id: hub.id,
      actor_profile_id: auth.profile.id,
      action: 'hub_created',
      payload: { title, collaborator_limit: collaboratorLimit, viewer_limit: viewerLimit }
    })
  ]);

  if (memberResult.error) {
    console.error('[createCaseHubAction] 허브 멤버 추가 실패:', memberResult.error);
  }
  if (activityResult.error) {
    console.error('[createCaseHubAction] 활동 로그 기록 실패:', activityResult.error);
  }

  revalidatePath('/cases');
  revalidatePath('/case-hubs');

  redirect(`/case-hubs/${hub.id}`);
}

// ────────────────────────────────────────────────────────────────────
// updateCaseHubAction: 허브 설정 수정
// 권한: case_edit
// ────────────────────────────────────────────────────────────────────
// 기존 사건허브의 기본 정보와 설정을 수정한다.
export async function updateCaseHubAction(formData: FormData) {
  const hubId = `${formData.get('hubId') ?? ''}`.trim();
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  const title = `${formData.get('title') ?? ''}`.trim() || null;
  const collaboratorLimit = Math.max(1, parseInt(`${formData.get('collaboratorLimit') ?? '5'}`, 10) || 5);
  const viewerLimit = Math.max(1, parseInt(`${formData.get('viewerLimit') ?? '12'}`, 10) || 12);
  const status = `${formData.get('status') ?? ''}`.trim();
  const accessPin = `${formData.get('accessPin') ?? ''}`.trim();

  if (!hubId || !organizationId) {
    throw new Error('허브 정보가 올바르지 않습니다. 페이지를 새로고침 해주세요.');
  }

  const { auth } = await requireOrganizationActionAccess(organizationId, {
    permission: 'case_edit',
    errorMessage: '사건 수정 권한이 없어 허브를 수정할 수 없습니다.'
  });

  const admin = createSupabaseAdminClient();

  const validStatuses = ['draft', 'setup_required', 'ready', 'active', 'review_pending', 'archived'];
  const hubRecord = await getAccessibleHubRecord(admin, hubId, organizationId);
  if (!hubRecord || hubRecord.lifecycle_status !== 'active') {
    throw new Error('현재 조직에서 접근 가능한 허브가 아닙니다. 허브 연결 상태를 확인해 주세요.');
  }
  const { error } = await admin
    .from('case_hubs')
    .update({
      title,
      collaborator_limit: collaboratorLimit,
      viewer_limit: viewerLimit,
      access_pin_enabled: accessPin.length === 4,
      access_pin_hash: accessPin.length === 4 ? hashHubPin(accessPin) : null,
      access_pin_expires_at: accessPin.length === 4 ? pinExpiresAt() : null,
      ...(status && validStatuses.includes(status) ? { status } : {}),
      updated_at: new Date().toISOString()
    })
    .eq('id', hubId)
    .eq('lifecycle_status', 'active');

  if (error) {
    throwGuardFeedback({
      type: 'condition_failed',
      code: 'HUB_UPDATE_FAILED',
      blocked: '허브 수정에 실패했습니다.',
      cause: '허브가 이미 보관됐거나 접근 권한이 없습니다.',
      resolution: '페이지를 새로고침하고 다시 시도해 주세요.'
    });
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

export async function verifyCaseHubPinAction(formData: FormData) {
  const hubId = `${formData.get('hubId') ?? ''}`.trim();
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  const pin = `${formData.get('pin') ?? ''}`.trim();

  if (!hubId || pin.length !== 4) {
    throw new Error('사건허브 비밀번호 4자리를 입력해 주세요.');
  }

  const auth = await requireAuthenticatedUser();
  const admin = createSupabaseAdminClient();
  const { data: hubRow, error } = await admin
    .from('case_hubs')
    .select('id, lifecycle_status, primary_client_id, access_pin_enabled, access_pin_hash, access_pin_expires_at')
    .eq('id', hubId)
    .eq('lifecycle_status', 'active')
    .maybeSingle();

  if (error || !hubRow) {
    throw error ?? new Error('사건허브를 찾을 수 없습니다.');
  }

  const isPrimaryClientViewer = Boolean(
    auth.profile.is_client_account
    && auth.profile.client_account_status === 'active'
    && hubRow.primary_client_id === auth.profile.id
  );

  if (!isPrimaryClientViewer) {
    if (!organizationId) {
      throw new Error('조직 기준이 확인되지 않아 사건허브 비밀번호를 검증할 수 없습니다.');
    }
    const hubRecord = await getAccessibleHubRecord(admin, hubId, organizationId);
    if (!hubRecord) {
      throw new Error('현재 조직은 이 사건허브를 볼 수 없습니다.');
    }
  }

  if (hubRow.access_pin_enabled && hubRow.access_pin_hash) {
    if (!hubRow.access_pin_expires_at || new Date(hubRow.access_pin_expires_at).getTime() <= Date.now()) {
      const refreshedPin = generateFourDigitPin();
      const nextExpiresAt = pinExpiresAt();
      await admin
        .from('case_hubs')
        .update({
          access_pin_hash: hashHubPin(refreshedPin),
          access_pin_expires_at: nextExpiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', hubId)
        .eq('lifecycle_status', 'active');
      await revokeHubPinAccess('case_hub', hubId);
      throw new Error('기존 사건허브 PIN이 만료되었습니다. 새 PIN이 다시 생성되었습니다. 허브 관리자에게 새 PIN을 확인해 주세요.');
    }
    if (hashHubPin(pin) !== hubRow.access_pin_hash) {
      throw new Error('사건허브 비밀번호가 맞지 않습니다.');
    }
  }

  await grantHubPinAccess('case_hub', hubId, hubRow.access_pin_expires_at ?? null);
}

export async function clearCaseHubPinAction(formData: FormData) {
  const hubId = `${formData.get('hubId') ?? ''}`.trim();
  if (!hubId) return;
  await revokeHubPinAccess('case_hub', hubId);
}

export async function updateCaseHubPinAction(formData: FormData) {
  const hubId = `${formData.get('hubId') ?? ''}`.trim();
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  const pin = `${formData.get('pin') ?? ''}`.trim();

  if (!hubId || !organizationId) {
    throw new Error('사건허브 정보를 확인할 수 없습니다.');
  }

  await requireOrganizationActionAccess(organizationId, {
    permission: 'case_edit',
    errorMessage: '사건 수정 권한이 있어야 허브 비밀번호를 설정할 수 있습니다.'
  });

  const admin = createSupabaseAdminClient();
  const hubRecord = await getAccessibleHubRecord(admin, hubId, organizationId);
  if (!hubRecord) {
    throw new Error('현재 조직은 이 사건허브를 관리할 수 없습니다.');
  }

  const nextEnabled = pin.length === 4;
  const { error } = await admin
    .from('case_hubs')
    .update({
      access_pin_enabled: nextEnabled,
      access_pin_hash: nextEnabled ? hashHubPin(pin) : null,
      access_pin_expires_at: nextEnabled ? pinExpiresAt() : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', hubId)
    .eq('lifecycle_status', 'active');

  if (error) throw error;

  await revokeHubPinAccess('case_hub', hubId);
  revalidatePath(`/case-hubs/${hubId}`);
  revalidatePath('/case-hubs');
}

export async function generateCaseHubPinAction(formData: FormData) {
  const hubId = `${formData.get('hubId') ?? ''}`.trim();
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  if (!hubId || !organizationId) {
    throw new Error('사건허브 정보를 확인할 수 없습니다.');
  }

  await requireOrganizationActionAccess(organizationId, {
    permission: 'case_edit',
    errorMessage: '사건 수정 권한이 있어야 허브 비밀번호를 생성할 수 있습니다.'
  });

  const admin = createSupabaseAdminClient();
  const hubRecord = await getAccessibleHubRecord(admin, hubId, organizationId);
  if (!hubRecord) {
    throw new Error('현재 조직은 이 사건허브를 관리할 수 없습니다.');
  }

  const pin = generateFourDigitPin();
  const { error } = await admin
    .from('case_hubs')
    .update({
      access_pin_enabled: true,
      access_pin_hash: hashHubPin(pin),
      access_pin_expires_at: pinExpiresAt(),
      updated_at: new Date().toISOString()
    })
    .eq('id', hubId)
    .eq('lifecycle_status', 'active');

  if (error) throw error;

  await revokeHubPinAccess('case_hub', hubId);
  revalidatePath(`/case-hubs/${hubId}`);
  revalidatePath('/case-hubs');
  redirect(`/case-hubs/${hubId}/pin?generated=${pin}` as any);
}

// ────────────────────────────────────────────────────────────────────
// inviteHubMemberAction: 참여자 초대
// 권한: case_assign
// ────────────────────────────────────────────────────────────────────
// 사건허브에 새 참여자를 초대한다.
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
  const hub = await getAccessibleHubRecord(admin, hubId, organizationId);

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
    throwGuardFeedback({
      type: 'condition_failed',
      code: 'HUB_MEMBER_INVITE_FAILED',
      blocked: '참여자 초대에 실패했습니다.',
      cause: error.code === '23505' ? '이미 허브에 참여 중인 멤버입니다.' : '허브 멤버 등록 중 문제가 발생했습니다.',
      resolution: '허브 멤버 목록을 확인하고 다시 시도해 주세요.'
    });
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
// 사건허브 참여자의 좌석과 역할을 변경한다.
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
  const hubRecord = await getAccessibleHubRecord(admin, hubId, organizationId);
  if (!hubRecord || hubRecord.lifecycle_status !== 'active') {
    throw new Error('현재 조직에서 접근 가능한 허브가 아닙니다. 허브 연결 상태를 확인해 주세요.');
  }

  const { error } = await admin
    .from('case_hub_members')
    .update({ seat_kind: ['collaborator', 'viewer'].includes(seatKind) ? seatKind : 'viewer' })
    .eq('id', memberId)
    .eq('hub_id', hubId);

  if (error) {
    throwGuardFeedback({
      type: 'condition_failed',
      code: 'HUB_SEAT_CHANGE_FAILED',
      blocked: '좌석 변경에 실패했습니다.',
      cause: '멤버 정보가 없거나 이미 변경된 상태입니다.',
      resolution: '허브 멤버 목록을 새로고침하고 다시 시도해 주세요.'
    });
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
// 사건허브를 보관 상태로 전환한다.
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
  const hubRecord = await getAccessibleHubRecord(admin, hubId, organizationId);
  if (!hubRecord || hubRecord.lifecycle_status !== 'active') {
    throw new Error('현재 조직에서 접근 가능한 허브가 아닙니다. 허브 연결 상태를 확인해 주세요.');
  }

  const { error } = await admin
    .from('case_hubs')
    .update({ lifecycle_status: 'soft_deleted', status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', hubId)
    .eq('lifecycle_status', 'active');

  if (error) {
    throwGuardFeedback({
      type: 'condition_failed',
      code: 'HUB_ARCHIVE_FAILED',
      blocked: '허브 보관에 실패했습니다.',
      cause: '허브가 이미 보관됐거나 접근 권한이 없습니다.',
      resolution: '페이지를 새로고침하고 다시 시도해 주세요.'
    });
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
// 보관된 사건허브를 다시 활성화한다.
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
  const hubRecord = await getAccessibleHubRecord(admin, hubId, organizationId);
  if (!hubRecord || hubRecord.lifecycle_status !== 'active') {
    throw new Error('현재 조직에서 접근 가능한 허브가 아닙니다. 허브 연결 상태를 확인해 주세요.');
  }

  const { error } = await admin
    .from('case_hubs')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', hubId)
    .eq('lifecycle_status', 'active');

  if (error) {
    throwGuardFeedback({
      type: 'condition_failed',
      code: 'HUB_ACTIVATE_FAILED',
      blocked: '협업 시작에 실패했습니다.',
      cause: '허브가 이미 활성 상태이거나 접근 권한이 없습니다.',
      resolution: '페이지를 새로고침하고 다시 시도해 주세요.'
    });
  }

  await admin.from('case_hub_activity').insert({
    hub_id: hubId,
    actor_profile_id: auth.profile.id,
    action: 'hub_activated',
    payload: {}
  });

  revalidatePath(`/case-hubs/${hubId}`);
}
