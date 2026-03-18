import { getCurrentAuth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type OrganizationLite = {
  id: string;
  name: string;
  slug: string;
};

type CollaborationRequestStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export type CollaborationRequestSummary = {
  id: string;
  sourceOrganizationId: string;
  targetOrganizationId: string;
  title: string;
  proposalNote: string | null;
  responseNote: string | null;
  status: CollaborationRequestStatus;
  approvedHubId: string | null;
  createdAt: string;
  reviewedAt: string | null;
  approvedAt: string | null;
  sourceOrganization: OrganizationLite | null;
  targetOrganization: OrganizationLite | null;
};

export type CollaborationHubSummary = {
  id: string;
  title: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  currentOrganizationId: string;
  partnerOrganization: OrganizationLite | null;
  lastMessageAt: string | null;
  lastMessageBody: string | null;
  lastMessageCaseId: string | null;
  lastMessageCaseTitle: string | null;
  recentMessageCount: number;
};

export type CollaborationOverview = {
  currentOrganizationId: string | null;
  inboundRequests: CollaborationRequestSummary[];
  outboundRequests: CollaborationRequestSummary[];
  activeHubs: CollaborationHubSummary[];
};

export type CollaborationHubMessage = {
  id: string;
  body: string;
  createdAt: string;
  organizationId: string;
  organizationName: string;
  senderProfileId: string;
  senderName: string;
  caseId: string | null;
  caseTitle: string | null;
};

export type CollaborationHubCase = {
  id: string;
  title: string;
  referenceNo: string | null;
  caseStatus: string | null;
  updatedAt: string | null;
};

export type CollaborationHubDetail = {
  id: string;
  title: string;
  summary: string | null;
  currentOrganizationId: string;
  currentOrganization: OrganizationLite | null;
  partnerOrganization: OrganizationLite | null;
  messages: CollaborationHubMessage[];
  relatedCases: CollaborationHubCase[];
};

function emptyOverview(currentOrganizationId: string | null): CollaborationOverview {
  return {
    currentOrganizationId,
    inboundRequests: [],
    outboundRequests: [],
    activeHubs: []
  };
}

function buildOrganizationMap(rows: any[]) {
  return Object.fromEntries(
    rows
      .filter((row) => row?.id)
      .map((row) => [row.id, { id: row.id, name: row.name ?? '조직', slug: row.slug ?? '' } satisfies OrganizationLite])
  ) as Record<string, OrganizationLite>;
}

export async function getCollaborationOverview(organizationId?: string | null): Promise<CollaborationOverview> {
  const auth = await getCurrentAuth();
  const currentOrganizationId = organizationId ?? null;
  if (!auth || !currentOrganizationId) {
    return emptyOverview(currentOrganizationId);
  }

  if (!auth.memberships.some((membership) => membership.organization_id === currentOrganizationId)) {
    return emptyOverview(currentOrganizationId);
  }

  const admin = createSupabaseAdminClient();
  const [{ data: requestRows, error: requestError }, { data: hubRows, error: hubError }] = await Promise.all([
    admin
      .from('organization_collaboration_requests')
      .select('id, source_organization_id, target_organization_id, title, proposal_note, response_note, status, approved_hub_id, created_at, reviewed_at, approved_at')
      .or(`source_organization_id.eq.${currentOrganizationId},target_organization_id.eq.${currentOrganizationId}`)
      .order('created_at', { ascending: false })
      .limit(40),
    admin
      .from('organization_collaboration_hubs')
      .select('id, primary_organization_id, partner_organization_id, title, summary, status, created_at, updated_at')
      .eq('status', 'active')
      .or(`primary_organization_id.eq.${currentOrganizationId},partner_organization_id.eq.${currentOrganizationId}`)
      .order('updated_at', { ascending: false })
      .limit(20)
  ]);

  if (requestError) throw requestError;
  if (hubError) throw hubError;

  const orgIds = [...new Set([
    ...(requestRows ?? []).flatMap((row: any) => [row.source_organization_id, row.target_organization_id]),
    ...(hubRows ?? []).flatMap((row: any) => [row.primary_organization_id, row.partner_organization_id])
  ].filter(Boolean))];
  const hubIds = (hubRows ?? []).map((row: any) => row.id).filter(Boolean);

  const [{ data: orgRows, error: orgError }, { data: messageRows, error: messageError }] = await Promise.all([
    orgIds.length
      ? admin.from('organizations').select('id, name, slug').in('id', orgIds)
      : Promise.resolve({ data: [], error: null }),
    hubIds.length
      ? admin
          .from('organization_collaboration_messages')
          .select('id, hub_id, body, case_id, created_at')
          .in('hub_id', hubIds)
          .order('created_at', { ascending: false })
          .limit(120)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (orgError) throw orgError;
  if (messageError) throw messageError;

  const caseIds = [...new Set((messageRows ?? []).map((row: any) => row.case_id).filter(Boolean))];
  const { data: caseRows, error: caseError } = caseIds.length
    ? await admin.from('cases').select('id, title').in('id', caseIds)
    : { data: [], error: null };

  if (caseError) throw caseError;

  const organizations = buildOrganizationMap(orgRows ?? []);
  const caseTitleById = Object.fromEntries((caseRows ?? []).map((row: any) => [row.id, row.title ?? '사건'])) as Record<string, string>;
  const messagesByHub = (messageRows ?? []).reduce<Record<string, any[]>>((accumulator, row: any) => {
    const next = accumulator[row.hub_id] ?? [];
    next.push(row);
    accumulator[row.hub_id] = next;
    return accumulator;
  }, {});

  const requests = (requestRows ?? []).map((row: any) => ({
    id: row.id,
    sourceOrganizationId: row.source_organization_id,
    targetOrganizationId: row.target_organization_id,
    title: row.title,
    proposalNote: row.proposal_note ?? null,
    responseNote: row.response_note ?? null,
    status: row.status,
    approvedHubId: row.approved_hub_id ?? null,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at ?? null,
    approvedAt: row.approved_at ?? null,
    sourceOrganization: organizations[row.source_organization_id] ?? null,
    targetOrganization: organizations[row.target_organization_id] ?? null
  })) as CollaborationRequestSummary[];

  const activeHubs = (hubRows ?? []).map((row: any) => {
    const partnerOrganizationId = row.primary_organization_id === currentOrganizationId
      ? row.partner_organization_id
      : row.primary_organization_id;
    const recentMessages = messagesByHub[row.id] ?? [];
    const latestMessage = recentMessages[0] ?? null;

    return {
      id: row.id,
      title: row.title,
      summary: row.summary ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      currentOrganizationId,
      partnerOrganization: organizations[partnerOrganizationId] ?? null,
      lastMessageAt: latestMessage?.created_at ?? null,
      lastMessageBody: latestMessage?.body ?? null,
      lastMessageCaseId: latestMessage?.case_id ?? null,
      lastMessageCaseTitle: latestMessage?.case_id ? caseTitleById[latestMessage.case_id] ?? null : null,
      recentMessageCount: recentMessages.length
    } satisfies CollaborationHubSummary;
  });

  return {
    currentOrganizationId,
    inboundRequests: requests.filter((item) => item.targetOrganizationId === currentOrganizationId),
    outboundRequests: requests.filter((item) => item.sourceOrganizationId === currentOrganizationId),
    activeHubs
  };
}

export async function getCollaborationHubDetail(hubId: string, organizationId?: string | null, searchQuery?: string) {
  const auth = await getCurrentAuth();
  const currentOrganizationId = organizationId ?? null;
  if (!auth || !currentOrganizationId) {
    return null;
  }

  if (!auth.memberships.some((membership) => membership.organization_id === currentOrganizationId)) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const { data: hubRow, error: hubError } = await admin
    .from('organization_collaboration_hubs')
    .select('id, primary_organization_id, partner_organization_id, title, summary, status')
    .eq('id', hubId)
    .eq('status', 'active')
    .maybeSingle();

  if (hubError) throw hubError;
  if (!hubRow) return null;

  if (![hubRow.primary_organization_id, hubRow.partner_organization_id].includes(currentOrganizationId)) {
    return null;
  }

  const partnerOrganizationId = hubRow.primary_organization_id === currentOrganizationId
    ? hubRow.partner_organization_id
    : hubRow.primary_organization_id;
  const normalizedQuery = `${searchQuery ?? ''}`.trim().toLowerCase();

  const [{ data: orgRows, error: orgError }, { data: messageRows, error: messageError }, { data: caseOrgRows, error: caseOrgError }, { data: fallbackCaseRows, error: fallbackCaseError }] = await Promise.all([
    admin.from('organizations').select('id, name, slug').in('id', [currentOrganizationId, partnerOrganizationId]),
    admin
      .from('organization_collaboration_messages')
      .select('id, organization_id, sender_profile_id, body, case_id, created_at')
      .eq('hub_id', hubId)
      .order('created_at', { ascending: false })
      .limit(80),
    admin
      .from('case_organizations')
      .select('case_id, organization_id, case:cases(id, title, reference_no, case_status, updated_at)')
      .in('organization_id', [currentOrganizationId, partnerOrganizationId])
      .eq('status', 'active')
      .limit(200),
    admin
      .from('cases')
      .select('id, title, reference_no, case_status, updated_at')
      .eq('organization_id', currentOrganizationId)
      .neq('lifecycle_status', 'soft_deleted')
      .order('updated_at', { ascending: false })
      .limit(20)
  ]);

  if (orgError) throw orgError;
  if (messageError) throw messageError;
  if (caseOrgError) throw caseOrgError;
  if (fallbackCaseError) throw fallbackCaseError;

  const senderIds = [...new Set((messageRows ?? []).map((row: any) => row.sender_profile_id).filter(Boolean))];
  const messageCaseIds = [...new Set((messageRows ?? []).map((row: any) => row.case_id).filter(Boolean))];

  const [{ data: senderRows, error: senderError }, { data: messageCaseRows, error: messageCaseError }] = await Promise.all([
    senderIds.length
      ? admin.from('profiles').select('id, full_name').in('id', senderIds)
      : Promise.resolve({ data: [], error: null }),
    messageCaseIds.length
      ? admin.from('cases').select('id, title').in('id', messageCaseIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (senderError) throw senderError;
  if (messageCaseError) throw messageCaseError;

  const organizations = buildOrganizationMap(orgRows ?? []);
  const senderNameById = Object.fromEntries((senderRows ?? []).map((row: any) => [row.id, row.full_name ?? '구성원'])) as Record<string, string>;
  const messageCaseTitleById = Object.fromEntries((messageCaseRows ?? []).map((row: any) => [row.id, row.title ?? '사건'])) as Record<string, string>;

  const casesById = new Map<string, { organizationIds: Set<string>; record: any }>();
  for (const row of caseOrgRows ?? []) {
    if (!row.case_id) continue;
    const current = casesById.get(row.case_id) ?? { organizationIds: new Set<string>(), record: Array.isArray(row.case) ? row.case[0] : row.case };
    current.organizationIds.add(row.organization_id);
    if (!current.record) {
      current.record = Array.isArray(row.case) ? row.case[0] : row.case;
    }
    casesById.set(row.case_id, current);
  }

  const sharedCases = [...casesById.entries()]
    .filter(([, value]) => value.organizationIds.has(currentOrganizationId) && value.organizationIds.has(partnerOrganizationId))
    .map(([caseId, value]) => ({
      id: caseId,
      title: value.record?.title ?? '사건',
      referenceNo: value.record?.reference_no ?? null,
      caseStatus: value.record?.case_status ?? null,
      updatedAt: value.record?.updated_at ?? null
    })) as CollaborationHubCase[];

  const baseCases = sharedCases.length
    ? sharedCases
    : (fallbackCaseRows ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        referenceNo: row.reference_no ?? null,
        caseStatus: row.case_status ?? null,
        updatedAt: row.updated_at ?? null
      })) as CollaborationHubCase[];

  return {
    id: hubRow.id,
    title: hubRow.title,
    summary: hubRow.summary ?? null,
    currentOrganizationId,
    currentOrganization: organizations[currentOrganizationId] ?? null,
    partnerOrganization: organizations[partnerOrganizationId] ?? null,
    messages: (messageRows ?? []).map((row: any) => ({
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      organizationId: row.organization_id,
      organizationName: organizations[row.organization_id]?.name ?? '협업 조직',
      senderProfileId: row.sender_profile_id,
      senderName: senderNameById[row.sender_profile_id] ?? '구성원',
      caseId: row.case_id ?? null,
      caseTitle: row.case_id ? messageCaseTitleById[row.case_id] ?? null : null
    })),
    relatedCases: baseCases.filter((item) => {
      if (!normalizedQuery) return true;
      return `${item.title} ${item.referenceNo ?? ''} ${item.caseStatus ?? ''}`.toLowerCase().includes(normalizedQuery);
    })
  } satisfies CollaborationHubDetail;
}