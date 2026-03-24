import { cache } from 'react';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentAuth, hasActivePlatformAdminView, isManagementRole } from '@/lib/auth';
import { getCaseScopeAccess } from '@/lib/case-scope';
import { getDashboardRecentNotifications } from '@/lib/queries/notifications';

export type DashboardSummary = {
  activeCases: number;
  pendingDocuments: number;
  pendingRequests: number;
  recentMessages: number;
  pendingBillingCount: number;
  unreadNotifications: number;
};

// ─── Dashboard DTO 타입 ────────────────────────────────────────────────────────

export type DashboardScheduleItem = {
  id: string;
  title: string | null;
  schedule_kind: string | null;
  scheduled_start: string | null;
  location: string | null;
  notes?: string | null;
  is_important?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  case_id: string | null;
  cases?: { title: string | null } | { title: string | null }[] | null;
};

export type DashboardCaseItem = {
  id: string;
  title: string | null;
  reference_no: string | null;
  case_status: string | null;
  case_type?: string | null;
  stage_key?: string | null;
  updated_at?: string | null;
  principal_amount?: number | null;
};

export type DashboardRequestItem = {
  id: string;
  title: string | null;
  body: string | null;
  status: string | null;
  request_kind: string | null;
  due_at: string | null;
  case_id: string | null;
  cases: { title: string | null } | { title: string | null }[] | null;
};

export type DashboardMessageItem = {
  id: string;
  body: string | null;
  is_internal: boolean | null;
  created_at: string | null;
  sender_role: string | null;
  sender_profile_id: string | null;
  case_id: string | null;
  cases: { title: string | null } | { title: string | null }[] | null;
  sender: { full_name: string | null } | { full_name: string | null }[] | null;
};

export type DashboardBillingItem = {
  id: string;
  title: string | null;
  amount: number | null;
  status: string | null;
  due_on: string | null;
  case_id: string | null;
  cases: { title: string | null } | { title: string | null }[] | null;
};

export type DashboardNotificationItem = {
  id: string;
  title: string | null;
  destination_url: string | null;
  priority: string | null;
  status: string | null;
  entity_type: string | null;
  entity_id: string | null;
  organization_id: string | null;
  action_label: string;
  created_at: string | null;
};

export type DashboardActionableNotificationItem = {
  id: string;
  title: string | null;
  body: string;
  action_label: string;
  action_href: string | null;
  destination_url: string | null;
  action_entity_type: string | null;
  requires_action: boolean;
  resolved_at: null;
  organization_id: string | null;
  created_at: string | null;
};

export type DashboardClientAccessItem = {
  id: string;
  requester_name: string | null;
  requester_email: string | null;
  status: string | null;
  request_note: string | null;
  created_at: string | null;
  target_organization_id: string | null;
  organization: { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null;
};

export type DashboardTeamMemberItem = {
  id: string;
  role: string | null;
  actor_category: string | null;
  title: string | null;
  profile: { id: string; full_name: string | null; email: string | null } | { id: string; full_name: string | null; email: string | null }[] | null;
};

export type DashboardClientContactItem = {
  id: string;
  case_id: string | null;
  profile_id: string | null;
  client_name: string | null;
  relation_label: string | null;
  cases: { title: string | null } | { title: string | null }[] | null;
};

export type DashboardPartnerContactItem = {
  case_organization_id: string;
  case_id: string | null;
  organization_id: string | null;
  organization_name: string;
  role: string | null;
  membership_id: string;
  member_role: string | null;
  profile: null;
};

// ─── Dashboard 섹션 타입 ──────────────────────────────────────────────────────

export type DashboardQueues = {
  urgentSchedules: DashboardScheduleItem[];
  recentCases: DashboardCaseItem[];
  caseOptions: DashboardCaseItem[];
  recentRequests: DashboardRequestItem[];
  recentMessageItems: DashboardMessageItem[];
  monthlyHighlights: DashboardScheduleItem[];
  upcomingBilling: DashboardBillingItem[];
  unreadNotificationItems: DashboardNotificationItem[];
  clientAccessQueue: DashboardClientAccessItem[];
  actionableNotifications: DashboardActionableNotificationItem[];
};

export type DashboardSecondaryPanels = {
  teamMembers: DashboardTeamMemberItem[];
  clientContacts: DashboardClientContactItem[];
  partnerContacts: DashboardPartnerContactItem[];
  organizationConversations: never[];
  recentWorkItems: DashboardWorkItem[];
};

export type DashboardWorkItem = {
  id: string;
  item_type: 'message' | 'task' | 'request' | 'instruction';
  title: string | null;
  body: string;
  status: 'open' | 'in_progress' | 'done' | 'canceled';
  priority: 'urgent' | 'normal' | 'low';
  assigned_profile_id: string | null;
  created_by: string;
  completed_by: string | null;
  completed_at: string | null;
  due_at: string | null;
  created_at: string;
  links: Array<{
    id: string;
    link_type: string;
    target_id: string;
    display_label: string | null;
  }>;
};

const getDashboardSections = cache(async (organizationId?: string | null) => {
  const auth = await getCurrentAuth();
  if (!auth) {
    return {
      summary: {
        activeCases: 0,
        pendingDocuments: 0,
        pendingRequests: 0,
        recentMessages: 0,
        pendingBillingCount: 0,
        unreadNotifications: 0
      },
      queues: {
        urgentSchedules: [],
        recentCases: [],
        caseOptions: [],
        recentRequests: [],
        recentMessageItems: [],
        monthlyHighlights: [],
        upcomingBilling: [],
        unreadNotificationItems: [],
        clientAccessQueue: [],
        actionableNotifications: []
      },
      secondary: {
        teamMembers: [],
        clientContacts: [],
        partnerContacts: [],
        organizationConversations: [],
        recentWorkItems: []
      }
    };
  }
  const caseScope = await getCaseScopeAccess(auth, organizationId);
  const hasRestrictedScope = caseScope.restrictedOrganizationIds.length > 0;
  const allowedCaseIds = caseScope.assignedCaseIds;
  if (hasRestrictedScope && !allowedCaseIds.length) {
    return {
      summary: {
        activeCases: 0,
        pendingDocuments: 0,
        pendingRequests: 0,
        recentMessages: 0,
        pendingBillingCount: 0,
        unreadNotifications: 0
      },
      queues: {
        urgentSchedules: [],
        recentCases: [],
        caseOptions: [],
        recentRequests: [],
        recentMessageItems: [],
        monthlyHighlights: [],
        upcomingBilling: [],
        unreadNotificationItems: [],
        clientAccessQueue: [],
        actionableNotifications: []
      },
      secondary: {
        teamMembers: [],
        clientContacts: [],
        partnerContacts: [],
        organizationConversations: [],
        recentWorkItems: []
      }
    };
  }
  const canViewPartnerContacts = Boolean(
    auth
    && (await hasActivePlatformAdminView(auth, organizationId)
      || auth.memberships.some((membership) => membership.organization_id === organizationId && isManagementRole(membership.role)))
  );
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const inThirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  let casesCountQuery = supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .not('case_status', 'in', '(closed,archived)')
    .neq('lifecycle_status', 'soft_deleted');

  let pendingDocumentsQuery = supabase
    .from('case_documents')
    .select('*', { count: 'exact', head: true })
    .eq('approval_status', 'pending_review')
    .is('deleted_at', null);

  let requestCountQuery = supabase
    .from('case_requests')
    .select('*', { count: 'exact', head: true })
    .in('status', ['open', 'in_review', 'waiting_client']);

  let messageCountQuery = supabase
    .from('case_messages')
    .select('*', { count: 'exact', head: true });

  let immutableDeadlinesQuery = supabase
    .from('case_schedules')
    .select('id, title, schedule_kind, scheduled_start, location, case_id')
    .gte('scheduled_start', now.toISOString())
    .lte('scheduled_start', inSevenDays)
    .or('is_important.eq.true,schedule_kind.eq.deadline')
    .order('scheduled_start', { ascending: true })
    .limit(5);

  let recentCasesQuery = supabase
    .from('cases')
    .select('id, title, reference_no, case_status, case_type, stage_key, updated_at, principal_amount')
    .neq('lifecycle_status', 'soft_deleted')
    .order('updated_at', { ascending: false })
    .limit(6);

  let caseOptionsQuery = supabase
    .from('cases')
    .select('id, title, reference_no, case_status')
    .neq('lifecycle_status', 'soft_deleted')
    .order('updated_at', { ascending: false })
    .limit(20);

  let recentRequestsQuery = supabase
    .from('case_requests')
    .select('id, title, body, status, request_kind, due_at, case_id, cases(title)')
    .in('status', ['open', 'in_review', 'waiting_client'])
    .order('created_at', { ascending: false })
    .limit(6);

  let recentMessagesQuery = supabase
    .from('case_messages')
    .select('id, body, is_internal, created_at, sender_role, sender_profile_id, case_id, cases(title), sender:profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(50);

  let monthlyHighlightsQuery = supabase
    .from('case_schedules')
    .select('id, title, schedule_kind, scheduled_start, location, notes, is_important, created_at, updated_at, case_id, cases(title)')
    .gte('scheduled_start', now.toISOString())
    .lte('scheduled_start', inThirtyDays)
    .order('scheduled_start', { ascending: true })
    .limit(8);

  let teamMembersQuery = supabase
    .from('organization_memberships')
    .select('id, role, actor_category, title, profile:profiles(id, full_name, email)')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(20);

  let pendingBillingCountQuery = supabase
    .from('billing_entries')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .in('status', ['draft', 'issued', 'partial']);

  let upcomingBillingQuery = supabase
    .from('billing_entries')
    .select('id, title, amount, status, due_on, case_id, cases(title)')
    .is('deleted_at', null)
    .in('status', ['draft', 'issued', 'partial'])
    .order('due_on', { ascending: true, nullsFirst: false })
    .limit(5);

  let unreadNotificationsQuery = supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null);

  const unreadNotificationItemsPromise = getDashboardRecentNotifications(organizationId, 5);

  let clientAccessQueueQuery = supabase
    .from('client_access_requests')
    .select('id, requester_name, requester_email, status, request_note, created_at, target_organization_id, organization:organizations(name, slug)')
    .in('status', ['pending', 'approved'])
    .order('created_at', { ascending: false })
    .limit(6);

  if (organizationId) {
    casesCountQuery = casesCountQuery.eq('organization_id', organizationId);
    pendingDocumentsQuery = pendingDocumentsQuery.eq('organization_id', organizationId);
    requestCountQuery = requestCountQuery.eq('organization_id', organizationId);
    messageCountQuery = messageCountQuery.eq('organization_id', organizationId);
    immutableDeadlinesQuery = immutableDeadlinesQuery.eq('organization_id', organizationId);
    recentCasesQuery = recentCasesQuery.eq('organization_id', organizationId);
    caseOptionsQuery = caseOptionsQuery.eq('organization_id', organizationId);
    recentRequestsQuery = recentRequestsQuery.eq('organization_id', organizationId);
    recentMessagesQuery = recentMessagesQuery.eq('organization_id', organizationId);
    monthlyHighlightsQuery = monthlyHighlightsQuery.eq('organization_id', organizationId);
    teamMembersQuery = teamMembersQuery.eq('organization_id', organizationId);
    pendingBillingCountQuery = pendingBillingCountQuery.eq('organization_id', organizationId);
    upcomingBillingQuery = upcomingBillingQuery.eq('organization_id', organizationId);
    unreadNotificationsQuery = unreadNotificationsQuery.eq('organization_id', organizationId);
    clientAccessQueueQuery = clientAccessQueueQuery.eq('target_organization_id', organizationId);
  }
  if (hasRestrictedScope) {
    casesCountQuery = casesCountQuery.in('id', allowedCaseIds);
    pendingDocumentsQuery = pendingDocumentsQuery.in('case_id', allowedCaseIds);
    requestCountQuery = requestCountQuery.in('case_id', allowedCaseIds);
    messageCountQuery = messageCountQuery.in('case_id', allowedCaseIds);
    immutableDeadlinesQuery = immutableDeadlinesQuery.in('case_id', allowedCaseIds);
    recentCasesQuery = recentCasesQuery.in('id', allowedCaseIds);
    caseOptionsQuery = caseOptionsQuery.in('id', allowedCaseIds);
    recentRequestsQuery = recentRequestsQuery.in('case_id', allowedCaseIds);
    recentMessagesQuery = recentMessagesQuery.in('case_id', allowedCaseIds);
    monthlyHighlightsQuery = monthlyHighlightsQuery.in('case_id', allowedCaseIds);
    pendingBillingCountQuery = pendingBillingCountQuery.in('case_id', allowedCaseIds);
    upcomingBillingQuery = upcomingBillingQuery.in('case_id', allowedCaseIds);
  }

  const [
    { count: activeCases },
    { count: pendingDocuments },
    { count: pendingRequests },
    { count: recentMessages },
    { data: immutableDeadlines },
    { data: recentCases },
    { data: caseOptions },
    { data: recentRequests },
    { data: messageItems },
    { data: monthlyHighlights },
    { data: teamMembers },
    { count: pendingBillingCount },
    { data: upcomingBilling },
    { count: unreadNotifications },
    unreadNotificationItems,
    { data: clientAccessQueue }
  ] = await Promise.all([
    casesCountQuery,
    pendingDocumentsQuery,
    requestCountQuery,
    messageCountQuery,
    immutableDeadlinesQuery,
    recentCasesQuery,
    caseOptionsQuery,
    recentRequestsQuery,
    recentMessagesQuery,
    monthlyHighlightsQuery,
    teamMembersQuery,
    pendingBillingCountQuery,
    upcomingBillingQuery,
    unreadNotificationsQuery,
    unreadNotificationItemsPromise,
    clientAccessQueueQuery
  ]);

  const availableCaseIds = (caseOptions ?? []).map((item) => item.id).filter(Boolean);

  let clientContacts: DashboardClientContactItem[] = [];
  let partnerContacts: DashboardPartnerContactItem[] = [];

  if (organizationId && availableCaseIds.length) {
    const { data: caseClients } = await supabase
        .from('case_clients')
        .select('id, case_id, profile_id, client_name, relation_label, cases(title)')
        .eq('organization_id', organizationId)
        .in('case_id', availableCaseIds)
        .order('created_at', { ascending: false });

    clientContacts = caseClients ?? [];

    if (canViewPartnerContacts) {
      const admin = createSupabaseAdminClient();
      const { data: caseOrganizations } = await admin
        .from('case_organizations')
        .select('id, case_id, organization_id, role, organization:organizations(id, name)')
        .in('case_id', availableCaseIds)
        .neq('organization_id', organizationId)
        .eq('status', 'active');

      // Supabase admin client may infer the organization field as never for nested select.
      // Use explicit cast to work around type inference limitation.
      type CaseOrgRow = {
        id: string;
        case_id: string | null;
        organization_id: string | null;
        role: string | null;
        organization: { id: string; name: string } | { id: string; name: string }[] | null;
      };
      const typedRows = (caseOrganizations ?? []) as unknown as CaseOrgRow[];

      const partnerOrgIds = [...new Set(typedRows.map((item) => item.organization_id).filter((id): id is string => Boolean(id)))];

      if (partnerOrgIds.length) {
        partnerContacts = typedRows.map((caseOrganization) => ({
          case_organization_id: caseOrganization.id,
          case_id: caseOrganization.case_id,
          organization_id: caseOrganization.organization_id,
          organization_name: Array.isArray(caseOrganization.organization)
            ? caseOrganization.organization[0]?.name ?? '협업사'
            : (caseOrganization.organization as { name: string } | null)?.name ?? '협업사',
          role: caseOrganization.role,
          membership_id: caseOrganization.id,
          member_role: caseOrganization.role,
          profile: null
        }));
      }
    }
  }

  const summary: DashboardSummary = {
    activeCases: activeCases ?? 0,
    pendingDocuments: pendingDocuments ?? 0,
    pendingRequests: pendingRequests ?? 0,
    recentMessages: recentMessages ?? 0,
    pendingBillingCount: pendingBillingCount ?? 0,
    unreadNotifications: unreadNotifications ?? 0
  };

  const queues: DashboardQueues = {
    urgentSchedules: immutableDeadlines ?? [],
    recentCases: recentCases ?? [],
    caseOptions: caseOptions ?? [],
    recentRequests: recentRequests ?? [],
    recentMessageItems: messageItems ?? [],
    monthlyHighlights: monthlyHighlights ?? [],
    upcomingBilling: upcomingBilling ?? [],
    unreadNotificationItems: (unreadNotificationItems ?? []).map((item) => ({
      id: item.notificationId,
      title: item.title,
      destination_url: item.destinationUrl,
      priority: item.priority,
      status: item.status,
      entity_type: item.entityType,
      entity_id: item.entityId,
      organization_id: item.organizationId,
      action_label: '열기',
      created_at: item.createdAt
    })),
    clientAccessQueue: clientAccessQueue ?? [],
    actionableNotifications: (unreadNotificationItems ?? [])
      .filter((item) => item.status === 'active' && item.priority === 'urgent')
      .slice(0, 6)
      .map((item) => ({
        id: item.notificationId,
        title: item.title,
        body: '',
        action_label: '열기',
        action_href: item.destinationUrl,
        destination_url: item.destinationUrl,
        action_entity_type: item.entityType,
        requires_action: item.priority === 'urgent',
        resolved_at: null,
        organization_id: item.organizationId ?? null,
        created_at: item.createdAt ?? null
      }))
  };

  const secondary: DashboardSecondaryPanels = {
    teamMembers: teamMembers ?? [],
    clientContacts,
    partnerContacts,
    organizationConversations: [],
    recentWorkItems: []
  };

  // 조직 업무 항목 최근 20개 조회 (open/in_progress 우선)
  if (organizationId) {
    const { data: workItemRows } = await supabase
      .from('organization_work_items')
      .select(`
        id, item_type, title, body, status, priority,
        assigned_profile_id, created_by, completed_by, completed_at, due_at, created_at,
        organization_work_item_links(id, link_type, target_id, display_label)
      `)
      .eq('organization_id', organizationId)
      .in('status', ['open', 'in_progress', 'done'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (workItemRows) {
      secondary.recentWorkItems = workItemRows.map((row) => ({
        id: row.id,
        item_type: row.item_type as DashboardWorkItem['item_type'],
        title: row.title ?? null,
        body: row.body,
        status: row.status as DashboardWorkItem['status'],
        priority: row.priority as DashboardWorkItem['priority'],
        assigned_profile_id: row.assigned_profile_id ?? null,
        created_by: row.created_by,
        completed_by: row.completed_by ?? null,
        completed_at: row.completed_at ?? null,
        due_at: row.due_at ?? null,
        created_at: row.created_at,
        links: (Array.isArray(row.organization_work_item_links) ? row.organization_work_item_links : []).map((l: { id: string; link_type: string; target_id: string; display_label: string | null }) => ({
          id: l.id,
          link_type: l.link_type,
          target_id: l.target_id,
          display_label: l.display_label,
        })),
      }));
    }
  }

  return {
    summary,
    queues,
    secondary
  };
});

export async function getDashboardSummary(organizationId?: string | null) {
  return (await getDashboardSections(organizationId)).summary;
}

export async function getDashboardQueues(organizationId?: string | null) {
  return (await getDashboardSections(organizationId)).queues;
}

export async function getDashboardSecondaryPanels(organizationId?: string | null) {
  return (await getDashboardSections(organizationId)).secondary;
}

export async function getDashboardSnapshot(organizationId?: string | null) {
  const sections = await getDashboardSections(organizationId);
  return {
    ...sections.summary,
    ...sections.queues,
    ...sections.secondary
  };
}

/**
 * 캘린더 페이지 전용 — 사건 선택 드롭다운에 필요한 cases 목록만 반환.
 * getDashboardSnapshot() 전체(~16 queries)를 실행하지 않고 단일 쿼리로 처리.
 */
export async function getCaseOptionsForCalendar(organizationId?: string | null): Promise<Array<{ id: string; title: string; reference_no: string | null; case_status: string | null }>> {
  if (!organizationId) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('cases')
    .select('id, title, reference_no, case_status')
    .eq('organization_id', organizationId)
    .neq('lifecycle_status', 'soft_deleted')
    .order('updated_at', { ascending: false })
    .limit(20);
  return data ?? [];
}

/** 리포트 페이지용 경량 통계: 4개 count 쿼리만 실행 (getDashboardSnapshot 전체 16 쿼리 대체) */
export async function getDashboardStats(organizationId?: string | null): Promise<{
  activeCases: number;
  pendingDocuments: number;
  pendingRequests: number;
  pendingBillingCount: number;
}> {
  const supabase = await createSupabaseServerClient();
  const [casesResult, documentsResult, requestsResult, billingResult] = await Promise.all([
    supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .neq('lifecycle_status', 'soft_deleted')
      .in('case_status', ['active', 'pending']),
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .neq('lifecycle_status', 'soft_deleted')
      .in('approval_status', ['pending', 'draft']),
    supabase
      .from('requests')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .neq('lifecycle_status', 'soft_deleted')
      .in('status', ['pending', 'open']),
    supabase
      .from('billing_entries')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .in('status', ['pending', 'overdue']),
  ]);
  return {
    activeCases: casesResult.count ?? 0,
    pendingDocuments: documentsResult.count ?? 0,
    pendingRequests: requestsResult.count ?? 0,
    pendingBillingCount: billingResult.count ?? 0,
  };
}
