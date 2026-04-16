/**
 * clients.ts — **직원(roster) 전용** 쿼리 계층.
 *
 * 규약 (2026-04-16):
 *   - 이 파일은 조직 직원/관리자가 의뢰인 명단·상세를 내부 운영 관점으로 조회할 때만 사용.
 *   - 허용 호출처: `src/app/(app)/clients/*`, `src/lib/actions/client-management-*` 등
 *     **직원 앱(app group)** 전용.
 *   - **금지**: `src/app/portal/**` 에서 이 파일을 import하면 안 된다.
 *     포털은 `src/lib/queries/portal.ts` (session client + profile_id 필터)만 사용.
 *   - 경계 회귀는 `scripts/check-query-boundaries.mjs`가 차단.
 *
 * 참조: `docs/page-specs/clients.md`, `docs/system-map.md` §6 (데이터 계층)
 */
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { decryptString } from '@/lib/pii';
import { decodeInvitationNote } from '@/lib/invitation-metadata';

export async function listClients(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('case_clients')
    .select('id, organization_id, case_id, client_name, client_email_snapshot, relation_label, is_portal_enabled, link_status, created_at, cases(title)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (organizationId) query = query.eq('organization_id', organizationId);

  const { data } = await query;
  return data ?? [];
}

function inviteStatusLabel(invite: any) {
  if (invite.status === 'accepted') return '가입 완료';
  if (invite.status === 'pending') return '초대 발송됨';
  return '가입 전';
}

function caseLinkStatusLabel(linkStatus: string | null, hasCaseId: boolean) {
  if (!hasCaseId) return '미연결';
  if (linkStatus === 'pending_unlink') return '연결 해제 대기';
  if (linkStatus === 'orphan_review') return '복구 검토 중';
  if (linkStatus === 'unlinked') return '연결 해제';
  return '연결 완료';
}

function linkedClientNextAction(linkStatus: string | null, isPortalEnabled: boolean) {
  if (linkStatus === 'orphan_review') return '복구 검토';
  if (linkStatus === 'pending_unlink') return '해제 상태 확인';
  return isPortalEnabled ? '상세 확인' : '초대 발송';
}

export async function listClientRosterSummary(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();

  let caseClientsQuery = supabase
    .from('case_clients')
    .select('id, organization_id, case_id, profile_id, client_name, client_email_snapshot, relation_label, is_portal_enabled, link_status, orphan_reason, review_deadline, created_at, cases(title, stage_key, updated_at)')
    .order('created_at', { ascending: false })
    .limit(120);

  let invitationsQuery = supabase
    .from('invitations')
    .select('id, organization_id, case_id, email, invited_name, status, created_at, expires_at, note, token_hint, cases(title)')
    .eq('kind', 'client_invite')
    .order('created_at', { ascending: false })
    .limit(120);

  if (organizationId) {
    caseClientsQuery = caseClientsQuery.eq('organization_id', organizationId);
    invitationsQuery = invitationsQuery.eq('organization_id', organizationId);
  }

  let tempCredentialsQuery = supabase
    .from('client_temp_credentials')
    .select('profile_id, organization_id, case_id, login_id, created_at, contact_email, must_change_password, profile:profiles(full_name, must_change_password, must_complete_profile)')
    .order('created_at', { ascending: false })
    .limit(120);

  if (organizationId) {
    tempCredentialsQuery = tempCredentialsQuery.eq('organization_id', organizationId);
  }

  const [{ data: caseClients }, { data: invitations }, { data: tempCredentials }] = await Promise.all([caseClientsQuery, invitationsQuery, tempCredentialsQuery]);

  // 연결된 사건 ID 목록으로 미납 청구 건수 조회
  const linkedCaseIds = [...new Set((caseClients ?? []).map((row: any) => row.case_id).filter(Boolean))];
  const overdueByCase = new Map<string, number>();
  if (linkedCaseIds.length) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: overdueEntries } = await supabase
      .from('billing_entries')
      .select('case_id, id')
      .in('case_id', linkedCaseIds)
      .eq('status', 'pending')
      .lt('due_on', today)
      .is('deleted_at', null)
      .limit(1000);
    for (const entry of overdueEntries ?? []) {
      if (entry.case_id) overdueByCase.set(entry.case_id, (overdueByCase.get(entry.case_id) ?? 0) + 1);
    }
  }

  const linkedRows = (caseClients ?? []).map((row: any) => ({
    id: `linked:${row.id}`,
    clientKey: `caseclient-${row.id}`,
    caseClientId: row.id,
    profileId: row.profile_id ?? null,
    source: 'linked',
    name: row.client_name ?? '이름 미입력',
    email: row.client_email_snapshot ?? null,
    caseId: row.case_id ?? null,
    caseTitle: Array.isArray(row.cases) ? row.cases[0]?.title ?? null : row.cases?.title ?? null,
    residentNumberMasked: null,
    addressSummary: null,
    contactPhone: null,
    signupStatus: row.is_portal_enabled ? '가입 완료' : '가입 전',
    inviteStatus: row.is_portal_enabled ? '완료' : '미발송',
    caseLinkStatus: caseLinkStatusLabel(row.link_status ?? 'linked', Boolean(row.case_id)),
    nextAction: linkedClientNextAction(row.link_status ?? 'linked', row.is_portal_enabled),
    linkStatus: row.link_status ?? 'linked',
    orphanReason: row.orphan_reason ?? null,
    reviewDeadline: row.review_deadline ?? null,
    overdueCount: row.case_id ? (overdueByCase.get(row.case_id) ?? 0) : 0,
    raw: row
  }));

  const pendingRows = (invitations ?? [])
    .filter((invite: any) => !linkedRows.some((client: any) => client.email && client.email === invite.email && client.caseId === invite.case_id))
    .map((invite: any) => ({
      id: `invite:${invite.id}`,
      clientKey: `invite-${invite.id}`,
      caseClientId: null,
      profileId: null,
      source: 'invite',
      invitationId: invite.id,
      name: invite.invited_name ?? '이름 미입력',
      email: invite.email ?? null,
      caseId: invite.case_id ?? null,
      caseTitle: Array.isArray(invite.cases) ? invite.cases[0]?.title ?? null : invite.cases?.title ?? null,
      residentNumberMasked: null,
      addressSummary: null,
      contactPhone: null,
      signupStatus: invite.status === 'accepted' ? '가입 완료' : '가입 전',
      inviteStatus: inviteStatusLabel(invite),
      caseLinkStatus: invite.case_id ? '연결 대기' : '미연결',
      nextAction: invite.status === 'accepted' ? '사건 연결 확인' : '초대 재발송',
      raw: invite
    }));

  const tempRows = (tempCredentials ?? []).map((item: any) => ({
    id: `temp:${item.profile_id}`,
    clientKey: `profile-${item.profile_id}`,
    caseClientId: null,
    profileId: item.profile_id,
    source: 'temp',
    invitationId: null,
    name: item.profile?.full_name ?? '이름 미입력',
    email: item.contact_email ?? null,
    caseId: item.case_id ?? null,
    caseTitle: null,
    residentNumberMasked: null,
    addressSummary: null,
    contactPhone: null,
    signupStatus: item.must_change_password ? '가입 전' : '가입 완료',
    inviteStatus: '임시계정 발급',
    caseLinkStatus: item.case_id ? '연결 완료' : '미연결',
    nextAction: item.must_change_password ? '비밀번호 변경 대기' : '상세 확인',
    initialSetupStatus: (item.profile?.must_change_password || item.profile?.must_complete_profile || item.must_change_password) ? '이행 필요' : '이행 완료',
    tempLoginId: item.login_id,
    raw: item
  }));

  return [...pendingRows, ...tempRows, ...linkedRows];
}

export async function listClientPageRoster(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();

  let caseClientsQuery = supabase
    .from('case_clients')
    .select('id, organization_id, case_id, profile_id, client_name, client_email_snapshot, relation_label, is_portal_enabled, link_status, orphan_reason, review_deadline, created_at')
    .order('created_at', { ascending: false })
    .limit(120);

  let invitationsQuery = supabase
    .from('invitations')
    .select('id, organization_id, case_id, email, invited_name, status, created_at, expires_at, note, token_hint')
    .eq('kind', 'client_invite')
    .order('created_at', { ascending: false })
    .limit(100);

  let tempCredentialsQuery = supabase
    .from('client_temp_credentials')
    .select('profile_id, organization_id, case_id, login_id, created_at, contact_email, must_change_password, profile:profiles(full_name, must_change_password, must_complete_profile)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (organizationId) {
    caseClientsQuery = caseClientsQuery.eq('organization_id', organizationId);
    invitationsQuery = invitationsQuery.eq('organization_id', organizationId);
    tempCredentialsQuery = tempCredentialsQuery.eq('organization_id', organizationId);
  }

  const [{ data: caseClients }, { data: invitations }, { data: tempCredentials }] = await Promise.all([
    caseClientsQuery,
    invitationsQuery,
    tempCredentialsQuery
  ]);

  const linkedCaseIds = [...new Set((caseClients ?? []).map((row: any) => row.case_id).filter(Boolean))];
  const overdueByCase = new Map<string, number>();
  if (linkedCaseIds.length) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: overdueEntries } = await supabase
      .from('billing_entries')
      .select('case_id, id')
      .in('case_id', linkedCaseIds)
      .eq('status', 'pending')
      .lt('due_on', today)
      .is('deleted_at', null)
      .limit(1000);
    for (const entry of overdueEntries ?? []) {
      if (entry.case_id) overdueByCase.set(entry.case_id, (overdueByCase.get(entry.case_id) ?? 0) + 1);
    }
  }

  const staffInvitations = (invitations ?? []).map((invite: any) => ({ ...invite, ...decodeInvitationNote(invite.note) }));
  const activeMemberEmailSet = new Set(
    (caseClients ?? [])
      .map((member: any) => `${member.client_email_snapshot ?? ''}`.trim().toLowerCase())
      .filter(Boolean)
  );

  const inviteOnlyRows = staffInvitations
    .filter((invite: any) => invite.status === 'pending' && !activeMemberEmailSet.has(`${invite.email ?? ''}`.trim().toLowerCase()))
    .map((invite: any) => ({
      id: `invite:${invite.id}`,
      clientKey: `invite-${invite.id}`,
      source: 'invite',
      invitationId: invite.id,
      name: invite.invited_name ?? '이름 미입력',
      email: invite.email ?? null,
      signupStatus: invite.status === 'accepted' ? '가입 완료' : '가입 전',
      inviteStatus: inviteStatusLabel(invite),
      caseLinkStatus: invite.case_id ? '연결 대기' : '미연결',
      activeStatus: '가입 전',
      overdueCount: 0,
    }));

  const linkedRows = (caseClients ?? []).map((row: any) => ({
    id: `linked:${row.id}`,
    clientKey: `caseclient-${row.id}`,
    caseClientId: row.id,
    source: 'linked',
    name: row.client_name ?? '이름 미입력',
    email: row.client_email_snapshot ?? null,
    signupStatus: row.is_portal_enabled ? '가입 완료' : '가입 전',
    inviteStatus: row.is_portal_enabled ? '완료' : '미발송',
    caseLinkStatus: caseLinkStatusLabel(row.link_status ?? 'linked', Boolean(row.case_id)),
    linkStatus: row.link_status ?? 'linked',
    orphanReason: row.orphan_reason ?? null,
    reviewDeadline: row.review_deadline ?? null,
    overdueCount: row.case_id ? (overdueByCase.get(row.case_id) ?? 0) : 0,
  }));

  const tempRows = (tempCredentials ?? []).map((item: any) => ({
    id: `temp:${item.profile_id}`,
    clientKey: `profile-${item.profile_id}`,
    source: 'temp',
    name: item.profile?.full_name ?? '이름 미입력',
    email: item.contact_email ?? null,
    signupStatus: item.must_change_password ? '가입 전' : '가입 완료',
    inviteStatus: '임시계정 발급',
    caseLinkStatus: item.case_id ? '연결 완료' : '미연결',
    activeStatus: item.must_change_password ? '가입 전' : '활성',
    overdueCount: 0,
  }));

  return [...inviteOnlyRows, ...tempRows, ...linkedRows];
}

export async function listClientRelationCandidates(organizationId: string) {
  const supabase = await createSupabaseServerClient();

  const [{ data: caseClients }, { data: invitations }, { data: tempCredentials }] = await Promise.all([
    supabase
      .from('case_clients')
      .select('id, client_name')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(120),
    supabase
      .from('invitations')
      .select('id, invited_name')
      .eq('organization_id', organizationId)
      .eq('kind', 'client_invite')
      .order('created_at', { ascending: false })
      .limit(80),
    supabase
      .from('client_temp_credentials')
      .select('profile_id, profile:profiles(full_name)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(80)
  ]);

  return [
    ...(caseClients ?? []).map((item: any) => ({
      clientKey: `caseclient-${item.id}`,
      name: item.client_name ?? '이름 미입력'
    })),
    ...(invitations ?? []).map((item: any) => ({
      clientKey: `invite-${item.id}`,
      name: item.invited_name ?? '이름 미입력'
    })),
    ...(tempCredentials ?? []).map((item: any) => ({
      clientKey: `profile-${item.profile_id}`,
      name: item.profile?.full_name ?? '이름 미입력'
    }))
  ].filter((item, index, list) => list.findIndex((candidate) => candidate.clientKey === item.clientKey) === index);
}

function parseClientKey(clientKey: string) {
  if (clientKey.startsWith('caseclient-')) return { kind: 'caseclient' as const, id: clientKey.slice('caseclient-'.length) };
  if (clientKey.startsWith('profile-')) return { kind: 'profile' as const, id: clientKey.slice('profile-'.length) };
  if (clientKey.startsWith('invite-')) return { kind: 'invite' as const, id: clientKey.slice('invite-'.length) };
  return { kind: 'unknown' as const, id: clientKey };
}

export async function getClientDetailSummary(organizationId: string, clientKey: string) {
  const supabase = await createSupabaseServerClient();
  const parsed = parseClientKey(clientKey);

  let caseClient: any = null;
  let tempCredential: any = null;
  let invitation: any = null;

  if (parsed.kind === 'caseclient') {
    const { data } = await supabase
      .from('case_clients')
      .select('id, organization_id, case_id, profile_id, client_name, client_email_snapshot, relation_label, is_portal_enabled, link_status, orphan_reason, review_deadline, created_at, updated_at, cases(id, title, reference_no, stage_key)')
      .eq('organization_id', organizationId)
      .eq('id', parsed.id)
      .maybeSingle();
    caseClient = data ?? null;

    if (caseClient?.profile_id) {
      const { data: temp } = await supabase
        .from('client_temp_credentials')
        .select('profile_id, login_id, contact_email, contact_phone, must_change_password, created_at')
        .eq('organization_id', organizationId)
        .eq('profile_id', caseClient.profile_id)
        .maybeSingle();
      tempCredential = temp ?? null;
    }
  } else if (parsed.kind === 'profile') {
    const { data: temp } = await supabase
      .from('client_temp_credentials')
      .select('profile_id, organization_id, case_id, login_id, contact_email, contact_phone, must_change_password, created_at')
      .eq('organization_id', organizationId)
      .eq('profile_id', parsed.id)
      .maybeSingle();
    tempCredential = temp ?? null;

    const { data: client } = await supabase
      .from('case_clients')
      .select('id, organization_id, case_id, profile_id, client_name, client_email_snapshot, relation_label, is_portal_enabled, link_status, orphan_reason, review_deadline, created_at, updated_at, cases(id, title, reference_no, stage_key)')
      .eq('organization_id', organizationId)
      .eq('profile_id', parsed.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    caseClient = client ?? null;
  } else if (parsed.kind === 'invite') {
    const { data } = await supabase
      .from('invitations')
      .select('id, organization_id, case_id, email, invited_name, status, created_at, note, cases(id, title, reference_no, stage_key)')
      .eq('organization_id', organizationId)
      .eq('id', parsed.id)
      .eq('kind', 'client_invite')
      .maybeSingle();
    invitation = data ?? null;
  }

  if (!caseClient && !tempCredential && !invitation) return null;

  const profileId = caseClient?.profile_id ?? tempCredential?.profile_id ?? null;
  const caseId = caseClient?.case_id ?? tempCredential?.case_id ?? invitation?.case_id ?? null;
  const caseClientId = caseClient?.id ?? null;

  const noteOrFilters = [caseClientId ? `case_client_id.eq.${caseClientId}` : null, profileId ? `profile_id.eq.${profileId}` : null, caseId ? `case_id.eq.${caseId}` : null]
    .filter(Boolean)
    .join(',');

  const [profileRowRes, privateRowRes, manualNotesRes, requestRes, messageRes, serviceRes, hubMessageRes] = await Promise.all([
    profileId
      ? supabase.from('profiles').select('phone_e164').eq('id', profileId).maybeSingle()
      : Promise.resolve({ data: null as any }),
    profileId
      ? supabase.from('client_private_profiles').select('resident_number_masked, address_line1_ciphertext').eq('profile_id', profileId).maybeSingle()
      : Promise.resolve({ data: null as any }),
    noteOrFilters
      ? supabase
          .from('client_special_notes')
          .select('id, note_type, note_body, created_at')
          .eq('organization_id', organizationId)
          .or(noteOrFilters)
          .order('created_at', { ascending: false })
          .limit(60)
      : Promise.resolve({ data: [] as any[], error: null }),
    caseId
      ? supabase
          .from('case_requests')
          .select('id, request_kind, title, body, status, created_at, due_at')
          .eq('case_id', caseId)
          .eq('client_visible', true)
          .order('created_at', { ascending: false })
          .limit(40)
      : Promise.resolve({ data: [] as any[], error: null }),
    caseId
      ? supabase
          .from('case_messages')
          .select('id, body, created_at, sender_role, sender:profiles(full_name)')
          .eq('case_id', caseId)
          .eq('is_internal', false)
          .order('created_at', { ascending: false })
          .limit(40)
      : Promise.resolve({ data: [] as any[], error: null }),
    profileId
      ? supabase
          .from('client_service_requests')
          .select('id, request_kind, title, body, status, created_at, resolved_note')
          .eq('organization_id', organizationId)
          .eq('profile_id', profileId)
          .order('created_at', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as any[], error: null }),
    caseId
      ? supabase
          .from('organization_collaboration_messages')
          .select('id, body, created_at')
          .eq('case_id', caseId)
          .order('created_at', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as any[], error: null })
  ]);

  let addressSummary: string | null = null;
  try {
    addressSummary = privateRowRes.data?.address_line1_ciphertext ? decryptString(privateRowRes.data.address_line1_ciphertext) : null;
  } catch {
    addressSummary = null;
  }

  const activities = [
    ...((manualNotesRes.data ?? []).map((row: any) => ({
      id: `note-${row.id}`,
      type: '특이사항',
      title: row.note_type === 'phone_window' ? '전화 가능 시간대' : row.note_type === 'request' ? '요청 메모' : row.note_type === 'response' ? '응답 메모' : row.note_type === 'hub' ? '허브 메모' : '특이사항',
      body: row.note_body,
      createdAt: row.created_at
    }))),
    ...((requestRes.data ?? []).map((row: any) => ({
      id: `req-${row.id}`,
      type: '요청',
      title: row.title ?? '요청',
      body: `${row.body ?? ''}\n상태: ${row.status ?? '-'}`,
      createdAt: row.created_at
    }))),
    ...((messageRes.data ?? []).map((row: any) => ({
      id: `msg-${row.id}`,
      type: '소통',
      title: row.sender?.full_name ? `${row.sender.full_name} 메시지` : `${row.sender_role ?? '담당자'} 메시지`,
      body: row.body ?? '',
      createdAt: row.created_at
    }))),
    ...((serviceRes.data ?? []).map((row: any) => ({
      id: `svc-${row.id}`,
      type: '의뢰인 요청',
      title: row.title ?? '의뢰인 요청',
      body: `${row.body ?? ''}${row.resolved_note ? `\n처리 메모: ${row.resolved_note}` : ''}`,
      createdAt: row.created_at
    }))),
    ...((hubMessageRes.data ?? []).map((row: any) => ({
      id: `hub-${row.id}`,
      type: '허브 소통',
      title: '사건허브 대화',
      body: row.body ?? '',
      createdAt: row.created_at
    })))
  ]
    .filter((item) => item.body || item.title)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const relatedPeople = (manualNotesRes.data ?? [])
    .map((row: any) => {
      const body = `${row.note_body ?? ''}`;
      if (!body.startsWith('[관련인연동]')) return null;
      const targetMatch = body.match(/대상:(.+?)\s*\((.+?)\)/);
      const relationMatch = body.match(/관계:(.+)$/);
      return {
        id: row.id,
        targetName: targetMatch?.[1]?.trim() ?? '관련인',
        targetClientKey: targetMatch?.[2]?.trim() ?? '',
        relation: relationMatch?.[1]?.trim() ?? '-',
        createdAt: row.created_at
      };
    })
    .filter(Boolean);

  return {
    organizationId,
    clientKey,
    source: parsed.kind,
    invitationId: invitation?.id ?? null,
    profileId,
    caseId,
    caseClientId,
    name: caseClient?.client_name ?? invitation?.invited_name ?? '이름 미입력',
    email: caseClient?.client_email_snapshot ?? tempCredential?.contact_email ?? invitation?.email ?? null,
    relationLabel: caseClient?.relation_label ?? null,
    residentNumberMasked: privateRowRes.data?.resident_number_masked ?? null,
    addressSummary,
    isPortalEnabled: caseClient?.is_portal_enabled ?? false,
    linkStatus: (caseClient?.link_status ?? 'linked') as 'linked' | 'pending_unlink' | 'unlinked' | 'orphan_review',
    tempLoginId: tempCredential?.login_id ?? null,
    mustChangePassword: tempCredential?.must_change_password ?? false,
    contactPhone: profileRowRes.data?.phone_e164 ?? tempCredential?.contact_phone ?? null,
    caseTitle: (Array.isArray(caseClient?.cases) ? caseClient?.cases[0]?.title : caseClient?.cases?.title)
      ?? (Array.isArray(invitation?.cases) ? invitation?.cases[0]?.title : invitation?.cases?.title)
      ?? null,
    invitationStatus: invitation?.status ?? null,
    activities,
    relatedPeople
  };
}
