import { getCurrentAuth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { calculateHubReadiness } from '@/lib/case-hub-metrics';

// ────────────────────────────────────────────────────────────────────
// 타입
// ────────────────────────────────────────────────────────────────────

export type CaseHubStatus =
  | 'draft'
  | 'setup_required'
  | 'ready'
  | 'active'
  | 'review_pending'
  | 'archived';

export type HubSeatKind = 'collaborator' | 'viewer';
export type HubMemberRole = 'owner' | 'admin' | 'member' | 'viewer';
export type HubAccessLevel = 'full' | 'edit' | 'view';

export type CaseHubSummary = {
  id: string;
  organizationId: string;
  caseId: string;
  caseTitle: string | null;
  caseReferenceNo: string | null;
  primaryClientId: string | null;
  primaryClientName: string | null;
  title: string | null;
  status: CaseHubStatus;
  collaboratorLimit: number;
  viewerLimit: number;
  collaboratorCount: number;
  viewerCount: number;
  readyMemberCount: number;
  unreadCount: number;
  visibilityScope: string | null;
  accessPinEnabled: boolean;
  readinessPercent: number;
  lifecycleStatus: string;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CaseHubMember = {
  id: string;
  hubId: string;
  profileId: string;
  profileName: string | null;
  profileEmail: string | null;
  membershipRole: HubMemberRole;
  accessLevel: HubAccessLevel;
  seatKind: HubSeatKind;
  isReady: boolean;
  joinedAt: string;
  lastSeenAt: string | null;
  lastReadAt: string | null;
};

export type CaseHubActivityItem = {
  id: string;
  hubId: string;
  actorProfileId: string | null;
  actorName: string | null;
  action: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

export type CaseHubDetail = CaseHubSummary & {
  createdBy: string | null;
  accessPinEnabled: boolean;
  primaryClientLinkStatus: 'linked' | 'pending_unlink' | 'unlinked' | 'orphan_review' | null;
  primaryClientOrphanReason: string | null;
  primaryClientReviewDeadline: string | null;
  members: CaseHubMember[];
  recentActivity: CaseHubActivityItem[];
};

async function listLegacyCaseHubIds(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  organizationId: string
) {
  const { data, error } = await admin
    .from('case_hubs')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('lifecycle_status', 'active');

  if (error) {
    console.error('[case-hubs] legacy fallback error:', error.message);
    return [];
  }

  return [...new Set(((data ?? []) as any[]).map((row) => row.id).filter(Boolean))];
}

async function listAccessibleCaseHubIds(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  organizationId: string
) {
  const { data, error } = await admin
    .from('case_hub_organizations')
    .select('hub_id')
    .eq('organization_id', organizationId)
    .eq('status', 'active');

  if (error) {
    console.error('[case-hubs] bridge error, falling back to legacy owner path:', error.message);
    return listLegacyCaseHubIds(admin, organizationId);
  }

  const bridgeHubIds = [...new Set(((data ?? []) as any[]).map((row) => row.hub_id).filter(Boolean))];
  if (bridgeHubIds.length > 0) return bridgeHubIds;

  return listLegacyCaseHubIds(admin, organizationId);
}

export async function getCaseHubLinkMap(
  organizationId: string,
  caseIds: string[]
): Promise<Record<string, { id: string } | null>> {
  const empty: Record<string, { id: string } | null> = Object.fromEntries(
    caseIds.map((id) => [id, null])
  );
  if (!caseIds.length) return empty;

  const auth = await getCurrentAuth();
  if (!auth) return empty;
  if (!auth.memberships.some((membership) => membership.organization_id === organizationId)) {
    return empty;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('case_hubs')
    .select('id, case_id')
    .eq('organization_id', organizationId)
    .eq('lifecycle_status', 'active')
    .in('case_id', caseIds);

  if (error) {
    console.error('[getCaseHubLinkMap] query error:', error.message);
    return empty;
  }

  const result = { ...empty };
  for (const row of (data ?? []) as Array<{ id: string; case_id: string | null }>) {
    if (row.case_id) {
      result[row.case_id] = { id: row.id };
    }
  }
  return result;
}

// ────────────────────────────────────────────────────────────────────
// getCaseHubsForCases: 사건목록용 – case_id → 허브 기본 정보 맵
// ────────────────────────────────────────────────────────────────────
export async function getCaseHubsForCases(
  organizationId: string,
  caseIds: string[]
): Promise<Record<string, CaseHubSummary | null>> {
  const empty = Object.fromEntries(caseIds.map((id) => [id, null]));
  if (!caseIds.length) return empty;

  const auth = await getCurrentAuth();
  if (!auth) return empty;
  if (!auth.memberships.some((m) => m.organization_id === organizationId)) return empty;
  const currentProfileId = auth.profile.id;

  const admin = createSupabaseAdminClient();
  const accessibleHubIds = await listAccessibleCaseHubIds(admin, organizationId);
  if (!accessibleHubIds.length) return empty;

  const { data: hubs, error } = await admin
    .from('case_hubs')
    .select('id, organization_id, case_id, primary_client_id, primary_case_client_id, title, status, collaborator_limit, viewer_limit, visibility_scope, access_pin_enabled, lifecycle_status, created_at, updated_at')
    .eq('lifecycle_status', 'active')
    .in('id', accessibleHubIds)
    .in('case_id', caseIds);

  if (error) { console.error('[getCaseHubsForCases] query error:', error.message); return empty; }
  if (!hubs?.length) return empty;

  const hubIds = hubs.map((h: any) => h.id as string);
  const caseClientIds = [...new Set(hubs.map((h: any) => h.primary_case_client_id).filter(Boolean))] as string[];

  const [membersResult, clientsResult, activityResult] = await Promise.all([
    admin
      .from('case_hub_members')
      .select('hub_id, profile_id, seat_kind, is_ready, last_read_at')
      .in('hub_id', hubIds),
    caseClientIds.length
      ? admin
          .from('case_clients')
          .select('id, client_name')
          .in('id', caseClientIds)
      : Promise.resolve({ data: [], error: null }),
    admin
      .from('case_hub_activity')
      .select('hub_id, created_at')
      .in('hub_id', hubIds)
      .order('created_at', { ascending: false })
      .limit(hubIds.length * 3)
  ]);

  if (membersResult.error) { console.error('[getCaseHubsForCases] members error:', membersResult.error.message); return empty; }

  const membersByHub = ((membersResult.data ?? []) as any[]).reduce<Record<string, { collaborator: number; viewer: number; ready: number; lastReadAt: string | null }>>((acc: any, row: any) => {
      if (!acc[row.hub_id]) acc[row.hub_id] = { collaborator: 0, viewer: 0, ready: 0, lastReadAt: null };
      acc[row.hub_id][row.seat_kind as HubSeatKind] += 1;
      if (row.is_ready) acc[row.hub_id].ready += 1;
      if (row.profile_id === currentProfileId) acc[row.hub_id].lastReadAt = row.last_read_at ?? null;
      return acc;
    }, {});

  const clientNameMap = ((clientsResult.data ?? []) as any[]).reduce<Record<string, string>>((acc, row) => {
    acc[row.id] = row.client_name ?? null;
    return acc;
  }, {});

  const lastActivityByHub = ((activityResult.data ?? []) as any[]).reduce<Record<string, string>>((acc, row) => {
    if (!acc[row.hub_id]) acc[row.hub_id] = row.created_at;
    return acc;
  }, {});

  const unreadCountByHub = ((activityResult.data ?? []) as any[]).reduce<Record<string, number>>((acc, row) => {
    const lastReadAt = membersByHub[row.hub_id]?.lastReadAt;
    const isUnread = !lastReadAt || new Date(row.created_at).getTime() > new Date(lastReadAt).getTime();
    if (isUnread) acc[row.hub_id] = (acc[row.hub_id] ?? 0) + 1;
    return acc;
  }, {});

  const result: Record<string, CaseHubSummary | null> = { ...empty };
  for (const hub of hubs as any[]) {
    const counts = membersByHub[hub.id] ?? { collaborator: 0, viewer: 0, ready: 0, lastReadAt: null };
    const readiness = calculateHubReadiness({
      primaryClientId: hub.primary_case_client_id ?? hub.primary_client_id ?? null,
      visibilityScope: hub.visibility_scope ?? null,
      memberCount: counts.collaborator + counts.viewer,
      collaboratorCount: counts.collaborator,
      collaboratorLimit: hub.collaborator_limit,
      lifecycleStatus: hub.lifecycle_status
    });
    result[hub.case_id] = {
      id: hub.id,
      organizationId: hub.organization_id,
      caseId: hub.case_id,
      caseTitle: null,
      caseReferenceNo: null,
      primaryClientId: hub.primary_case_client_id ?? hub.primary_client_id ?? null,
      primaryClientName: hub.primary_case_client_id ? (clientNameMap[hub.primary_case_client_id] ?? null) : null,
      title: hub.title ?? null,
      status: hub.status as CaseHubStatus,
      collaboratorLimit: hub.collaborator_limit,
      viewerLimit: hub.viewer_limit,
      collaboratorCount: counts.collaborator,
      viewerCount: counts.viewer,
      readyMemberCount: counts.ready,
      unreadCount: unreadCountByHub[hub.id] ?? 0,
      visibilityScope: hub.visibility_scope ?? null,
      accessPinEnabled: Boolean(hub.access_pin_enabled),
      readinessPercent: readiness.percent,
      lifecycleStatus: hub.lifecycle_status,
      lastActivityAt: lastActivityByHub[hub.id] ?? null,
      createdAt: hub.created_at,
      updatedAt: hub.updated_at
    } satisfies CaseHubSummary;
  }
  return result;
}

// ────────────────────────────────────────────────────────────────────
// getCaseHubList: 사건허브 목록 페이지용
// ────────────────────────────────────────────────────────────────────
export async function getCaseHubList(organizationId: string, limit?: number): Promise<CaseHubSummary[]> {
  const auth = await getCurrentAuth();
  if (!auth) return [];
  if (!auth.memberships.some((m) => m.organization_id === organizationId)) return [];
  const currentProfileId = auth.profile.id;

  const admin = createSupabaseAdminClient();
  const accessibleHubIds = await listAccessibleCaseHubIds(admin, organizationId);
  if (!accessibleHubIds.length) return [];

  let hubsQuery = admin
    .from('case_hubs')
    .select('id, organization_id, case_id, primary_client_id, primary_case_client_id, title, status, collaborator_limit, viewer_limit, visibility_scope, access_pin_enabled, lifecycle_status, created_at, updated_at')
    .eq('lifecycle_status', 'active')
    .in('id', accessibleHubIds)
    .order('updated_at', { ascending: false });

  if (limit) hubsQuery = hubsQuery.limit(limit);

  const { data: hubs, error } = await hubsQuery;

  if (error) { console.error('[getCaseHubList] query error:', error.message); return []; }
  if (!hubs?.length) return [];

  const hubIds = (hubs as any[]).map((h) => h.id as string);
  const caseIds = (hubs as any[]).map((h) => h.case_id as string);
  const caseClientIds = [...new Set((hubs as any[]).map((h) => h.primary_case_client_id).filter(Boolean))] as string[];

  const [casesResult, membersResult, clientsResult, activityResult] = await Promise.all([
    admin.from('cases').select('id, title, reference_no').in('id', caseIds),
    admin.from('case_hub_members').select('hub_id, profile_id, seat_kind, is_ready, last_read_at').in('hub_id', hubIds),
    caseClientIds.length
      ? admin.from('case_clients').select('id, client_name').in('id', caseClientIds)
      : Promise.resolve({ data: [], error: null }),
    admin
      .from('case_hub_activity')
      .select('hub_id, created_at')
      .in('hub_id', hubIds)
      .order('created_at', { ascending: false })
      .limit(hubIds.length * 3)
  ]);

  if (casesResult.error) { console.error('[getCaseHubList] cases error:', casesResult.error.message); return []; }
  if (membersResult.error) { console.error('[getCaseHubList] members error:', membersResult.error.message); return []; }

  const caseMap = ((casesResult.data ?? []) as any[]).reduce<Record<string, { title: string; reference_no: string | null }>>((acc, row) => {
    acc[row.id] = { title: row.title, reference_no: row.reference_no };
    return acc;
  }, {});

  const membersByHub = ((membersResult.data ?? []) as any[]).reduce<Record<string, { collaborator: number; viewer: number; ready: number; lastReadAt: string | null }>>((acc, row) => {
    if (!acc[row.hub_id]) acc[row.hub_id] = { collaborator: 0, viewer: 0, ready: 0, lastReadAt: null };
    acc[row.hub_id][row.seat_kind as HubSeatKind] += 1;
    if (row.is_ready) acc[row.hub_id].ready += 1;
    if (row.profile_id === currentProfileId) acc[row.hub_id].lastReadAt = row.last_read_at ?? null;
    return acc;
  }, {});

  const clientNameMap = ((clientsResult.data ?? []) as any[]).reduce<Record<string, string>>((acc, row) => {
    acc[row.id] = row.client_name ?? null;
    return acc;
  }, {});

  const lastActivityByHub = ((activityResult.data ?? []) as any[]).reduce<Record<string, string>>((acc, row) => {
    if (!acc[row.hub_id]) acc[row.hub_id] = row.created_at;
    return acc;
  }, {});

  const unreadCountByHub = ((activityResult.data ?? []) as any[]).reduce<Record<string, number>>((acc, row) => {
    const lastReadAt = membersByHub[row.hub_id]?.lastReadAt;
    const isUnread = !lastReadAt || new Date(row.created_at).getTime() > new Date(lastReadAt).getTime();
    if (isUnread) acc[row.hub_id] = (acc[row.hub_id] ?? 0) + 1;
    return acc;
  }, {});

  return (hubs as any[]).map((hub) => {
    const caseInfo = caseMap[hub.case_id] ?? { title: null, reference_no: null };
    const counts = membersByHub[hub.id] ?? { collaborator: 0, viewer: 0, ready: 0, lastReadAt: null };
    const readiness = calculateHubReadiness({
      primaryClientId: hub.primary_case_client_id ?? hub.primary_client_id ?? null,
      visibilityScope: hub.visibility_scope ?? null,
      memberCount: counts.collaborator + counts.viewer,
      collaboratorCount: counts.collaborator,
      collaboratorLimit: hub.collaborator_limit,
      lifecycleStatus: hub.lifecycle_status
    });
    return {
      id: hub.id,
      organizationId: hub.organization_id,
      caseId: hub.case_id,
      caseTitle: caseInfo.title ?? null,
      caseReferenceNo: caseInfo.reference_no ?? null,
      primaryClientId: hub.primary_case_client_id ?? hub.primary_client_id ?? null,
      primaryClientName: hub.primary_case_client_id ? (clientNameMap[hub.primary_case_client_id] ?? null) : null,
      title: hub.title ?? null,
      status: hub.status as CaseHubStatus,
      collaboratorLimit: hub.collaborator_limit,
      viewerLimit: hub.viewer_limit,
      collaboratorCount: counts.collaborator,
      viewerCount: counts.viewer,
      readyMemberCount: counts.ready,
      unreadCount: unreadCountByHub[hub.id] ?? 0,
      visibilityScope: hub.visibility_scope ?? null,
      accessPinEnabled: Boolean(hub.access_pin_enabled),
      readinessPercent: readiness.percent,
      lifecycleStatus: hub.lifecycle_status,
      lastActivityAt: lastActivityByHub[hub.id] ?? null,
      createdAt: hub.created_at,
      updatedAt: hub.updated_at
    } satisfies CaseHubSummary;
  });
}

// ────────────────────────────────────────────────────────────────────
// getCaseHubDetail: 로비 페이지용 – 멤버 + 활동 피드 포함
// ────────────────────────────────────────────────────────────────────
export async function getCaseHubDetail(
  hubId: string,
  organizationId?: string | null
): Promise<CaseHubDetail | null> {
  const auth = await getCurrentAuth();
  if (!auth) return null;
  const currentProfileId = auth.profile.id;

  const admin = createSupabaseAdminClient();
  const { data: hub, error: hubError } = await admin
    .from('case_hubs')
    .select('*')
    .eq('id', hubId)
    .eq('lifecycle_status', 'active')
    .maybeSingle();

  if (hubError) { console.error('[getCaseHubDetail] hub error:', hubError.message); return null; }
  if (!hub) return null;

  const isPrimaryClientViewer = Boolean(
    auth.profile.is_client_account
    && auth.profile.client_account_status === 'active'
    && hub.primary_client_id
    && hub.primary_client_id === auth.profile.id
  );

  if (!isPrimaryClientViewer) {
    if (!organizationId) return null;
    if (!auth.memberships.some((m) => m.organization_id === organizationId && m.status === 'active')) return null;
    const accessibleHubIds = await listAccessibleCaseHubIds(admin, organizationId);
    if (!accessibleHubIds.includes(hubId)) return null;
  }

  const [caseResult, membersResult, activityResult, clientResult] = await Promise.all([
    admin.from('cases').select('id, title, reference_no').eq('id', hub.case_id).maybeSingle(),
    admin
      .from('case_hub_members')
      .select('id, hub_id, profile_id, membership_role, access_level, seat_kind, is_ready, joined_at, last_seen_at, last_read_at')
      .eq('hub_id', hubId)
      .order('joined_at', { ascending: true }),
    admin
      .from('case_hub_activity')
      .select('id, hub_id, actor_profile_id, action, payload, created_at')
      .eq('hub_id', hubId)
      .order('created_at', { ascending: false })
      .limit(20),
    hub.primary_case_client_id
      ? admin.from('case_clients').select('id, client_name, link_status, orphan_reason, review_deadline').eq('id', hub.primary_case_client_id).maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);

  if (caseResult.error) { console.error('[getCaseHubDetail] case error:', caseResult.error.message); return null; }
  if (membersResult.error) { console.error('[getCaseHubDetail] members error:', membersResult.error.message); return null; }
  if (activityResult.error) { console.error('[getCaseHubDetail] activity error:', activityResult.error.message); return null; }

  // Resolve member profile names
  const memberProfileIds = ((membersResult.data ?? []) as any[]).map((m) => m.profile_id).filter(Boolean) as string[];
  const activityActorIds = [...new Set(
    ((activityResult.data ?? []) as any[]).map((a) => a.actor_profile_id).filter(Boolean) as string[]
  )];
  const allProfileIds = [...new Set([...memberProfileIds, ...activityActorIds])];

  const profilesResult = allProfileIds.length
    ? await admin.from('profiles').select('id, full_name, email').in('id', allProfileIds)
    : { data: [], error: null };

  if (profilesResult.error) { console.error('[getCaseHubDetail] profiles error:', profilesResult.error.message); return null; }

  const profileMap = ((profilesResult.data ?? []) as any[]).reduce<Record<string, { full_name: string | null; email: string | null }>>((acc, p) => {
    acc[p.id] = { full_name: p.full_name, email: p.email };
    return acc;
  }, {});

  const members: CaseHubMember[] = ((membersResult.data ?? []) as any[]).map((m) => ({
    id: m.id,
    hubId: m.hub_id,
    profileId: m.profile_id,
    profileName: profileMap[m.profile_id]?.full_name ?? null,
    profileEmail: profileMap[m.profile_id]?.email ?? null,
    membershipRole: m.membership_role as HubMemberRole,
    accessLevel: m.access_level as HubAccessLevel,
    seatKind: m.seat_kind as HubSeatKind,
    isReady: Boolean(m.is_ready),
    joinedAt: m.joined_at,
    lastSeenAt: m.last_seen_at ?? null,
    lastReadAt: m.last_read_at ?? null
  }));

  const recentActivity: CaseHubActivityItem[] = ((activityResult.data ?? []) as any[]).map((a) => ({
    id: a.id,
    hubId: a.hub_id,
    actorProfileId: a.actor_profile_id ?? null,
    actorName: a.actor_profile_id ? (profileMap[a.actor_profile_id]?.full_name ?? null) : null,
    action: a.action,
    payload: a.payload ?? null,
    createdAt: a.created_at
  }));

  const caseInfo = caseResult.data;
  const collaboratorCount = members.filter((m) => m.seatKind === 'collaborator').length;
  const viewerCount = members.filter((m) => m.seatKind === 'viewer').length;
  const readyMemberCount = members.filter((m) => m.isReady).length;
  const lastActivityAt = recentActivity[0]?.createdAt ?? null;
  const currentMember = members.find((member) => member.profileId === currentProfileId) ?? null;
  const unreadCount = recentActivity.filter((activity) => {
    if (!currentMember?.lastReadAt) return true;
    return new Date(activity.createdAt).getTime() > new Date(currentMember.lastReadAt).getTime();
  }).length;
  const readiness = calculateHubReadiness({
    primaryClientId: hub.primary_case_client_id ?? hub.primary_client_id ?? null,
    visibilityScope: hub.visibility_scope ?? null,
    memberCount: members.length,
    collaboratorCount,
    collaboratorLimit: hub.collaborator_limit,
    lifecycleStatus: hub.lifecycle_status
  });

  return {
    id: hub.id,
    organizationId: hub.organization_id,
    caseId: hub.case_id,
    caseTitle: caseInfo?.title ?? null,
    caseReferenceNo: caseInfo?.reference_no ?? null,
    primaryClientId: hub.primary_case_client_id ?? hub.primary_client_id ?? null,
    primaryClientName: (clientResult.data as any)?.client_name ?? null,
    primaryClientLinkStatus: (clientResult.data as any)?.link_status ?? null,
    primaryClientOrphanReason: (clientResult.data as any)?.orphan_reason ?? null,
    primaryClientReviewDeadline: (clientResult.data as any)?.review_deadline ?? null,
    title: hub.title ?? null,
    status: hub.status as CaseHubStatus,
    collaboratorLimit: hub.collaborator_limit,
    viewerLimit: hub.viewer_limit,
    collaboratorCount,
    viewerCount,
    readyMemberCount,
    unreadCount,
    visibilityScope: hub.visibility_scope ?? null,
    accessPinEnabled: Boolean(hub.access_pin_enabled),
    readinessPercent: readiness.percent,
    createdBy: hub.created_by ?? null,
    lifecycleStatus: hub.lifecycle_status,
    lastActivityAt,
    createdAt: hub.created_at,
    updatedAt: hub.updated_at,
    members,
    recentActivity
  } satisfies CaseHubDetail;
}

// ────────────────────────────────────────────────────────────────────
// getCaseClientsForHub: 허브 생성 시 대표 의뢰인 선택용
// ────────────────────────────────────────────────────────────────────
export async function getCaseClientsForHub(
  caseId: string
): Promise<Array<{ id: string; name: string; profileId: string | null }>> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('case_clients')
    .select('id, client_name, profile_id, link_status')
    .eq('case_id', caseId)
    .in('link_status', ['linked', 'pending_unlink'])
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[case-hubs] getCaseClientsForHub failed', error);
    return [];
  }
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    name: row.client_name ?? '이름 없음',
    profileId: row.profile_id ?? null
  }));
}
