import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function listClients(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('case_clients')
    .select('id, organization_id, case_id, client_name, client_email_snapshot, relation_label, is_portal_enabled, created_at, cases(title)')
    .order('created_at', { ascending: false });

  if (organizationId) query = query.eq('organization_id', organizationId);

  const { data } = await query;
  return data ?? [];
}

function inviteStatusLabel(invite: any) {
  if (invite.status === 'accepted') return '가입 완료';
  if (invite.status === 'pending') return '초대 발송됨';
  return '가입 전';
}

export async function listClientRosterSummary(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();

  let caseClientsQuery = supabase
    .from('case_clients')
    .select('id, organization_id, case_id, client_name, client_email_snapshot, relation_label, is_portal_enabled, created_at, cases(title, stage_key, updated_at)')
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
    .select('profile_id, organization_id, case_id, login_id, created_at, contact_email, must_change_password, profile:profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(120);

  if (organizationId) {
    tempCredentialsQuery = tempCredentialsQuery.eq('organization_id', organizationId);
  }

  const [{ data: caseClients }, { data: invitations }, { data: tempCredentials }] = await Promise.all([caseClientsQuery, invitationsQuery, tempCredentialsQuery]);
  const linkedRows = (caseClients ?? []).map((row: any) => ({
    id: `linked:${row.id}`,
    source: 'linked',
    name: row.client_name ?? '이름 미입력',
    email: row.client_email_snapshot ?? null,
    caseId: row.case_id ?? null,
    caseTitle: Array.isArray(row.cases) ? row.cases[0]?.title ?? null : row.cases?.title ?? null,
    signupStatus: row.is_portal_enabled ? '가입 완료' : '가입 전',
    inviteStatus: row.is_portal_enabled ? '완료' : '미발송',
    caseLinkStatus: row.case_id ? '연결 완료' : '미연결',
    nextAction: row.is_portal_enabled ? '상세 확인' : '초대 발송',
    raw: row
  }));

  const pendingRows = (invitations ?? [])
    .filter((invite: any) => !linkedRows.some((client: any) => client.email && client.email === invite.email && client.caseId === invite.case_id))
    .map((invite: any) => ({
      id: `invite:${invite.id}`,
      source: 'invite',
      invitationId: invite.id,
      name: invite.invited_name ?? '이름 미입력',
      email: invite.email ?? null,
      caseId: invite.case_id ?? null,
      caseTitle: Array.isArray(invite.cases) ? invite.cases[0]?.title ?? null : invite.cases?.title ?? null,
      signupStatus: invite.status === 'accepted' ? '가입 완료' : '가입 전',
      inviteStatus: inviteStatusLabel(invite),
      caseLinkStatus: invite.case_id ? '연결 대기' : '미연결',
      nextAction: invite.status === 'accepted' ? '사건 연결 확인' : '초대 재발송',
      raw: invite
    }));

  const tempRows = (tempCredentials ?? []).map((item: any) => ({
    id: `temp:${item.profile_id}`,
    source: 'temp',
    invitationId: null,
    name: item.profile?.full_name ?? '이름 미입력',
    email: item.contact_email ?? null,
    caseId: item.case_id ?? null,
    caseTitle: null,
    signupStatus: item.must_change_password ? '가입 전' : '가입 완료',
    inviteStatus: '임시계정 발급',
    caseLinkStatus: item.case_id ? '연결 완료' : '미연결',
    nextAction: item.must_change_password ? '비밀번호 변경 대기' : '상세 확인',
    tempLoginId: item.login_id,
    raw: item
  }));

  return [...pendingRows, ...tempRows, ...linkedRows];
}
