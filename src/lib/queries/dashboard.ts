import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentAuth, hasActivePlatformAdminView, isManagementRole } from '@/lib/auth';

export async function getDashboardSnapshot(organizationId?: string | null) {
  const auth = await getCurrentAuth();
  const canViewPartnerContacts = Boolean(
    auth
    && (await hasActivePlatformAdminView(auth)
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
    .eq('approval_status', 'pending_review');

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
    .in('status', ['draft', 'issued', 'partial']);

  let upcomingBillingQuery = supabase
    .from('billing_entries')
    .select('id, title, amount, status, due_on, case_id, cases(title)')
    .in('status', ['draft', 'issued', 'partial'])
    .order('due_on', { ascending: true, nullsFirst: false })
    .limit(5);

  let unreadNotificationsQuery = supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null);

  let unreadNotificationItemsQuery = supabase
    .from('notifications')
    .select('id, title, body, created_at')
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(5);

  let clientAccessQueueQuery = supabase
    .from('client_access_requests')
    .select('id, requester_name, requester_email, status, request_note, created_at, target_organization_id, organization:organizations(name, slug)')
    .in('status', ['pending', 'approved'])
    .order('created_at', { ascending: false })
    .limit(6);

  let actionableNotificationsQuery = supabase
    .from('notifications')
    .select('id, title, body, created_at, action_label, action_href, action_entity_type, requires_action, resolved_at, organization_id')
    .eq('requires_action', true)
    .is('resolved_at', null)
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
    unreadNotificationItemsQuery = unreadNotificationItemsQuery.eq('organization_id', organizationId);
    clientAccessQueueQuery = clientAccessQueueQuery.eq('target_organization_id', organizationId);
    actionableNotificationsQuery = actionableNotificationsQuery.eq('organization_id', organizationId);
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
    { data: unreadNotificationItems },
    { data: clientAccessQueue },
    { data: actionableNotifications }
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
    unreadNotificationsQuery
    , unreadNotificationItemsQuery,
    clientAccessQueueQuery,
    actionableNotificationsQuery
  ]);

  const availableCaseIds = (caseOptions ?? []).map((item: any) => item.id).filter(Boolean);

  let clientContacts: any[] = [];
  let partnerContacts: any[] = [];

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

      const partnerOrgIds = [...new Set((caseOrganizations ?? []).map((item: any) => item.organization_id).filter(Boolean))];

      if (partnerOrgIds.length) {
        partnerContacts = (caseOrganizations ?? []).map((caseOrganization: any) => ({
          case_organization_id: caseOrganization.id,
          case_id: caseOrganization.case_id,
          organization_id: caseOrganization.organization_id,
          organization_name: Array.isArray(caseOrganization.organization)
            ? caseOrganization.organization[0]?.name ?? '협업사'
            : caseOrganization.organization?.name ?? '협업사',
          role: caseOrganization.role,
          membership_id: caseOrganization.id,
          member_role: caseOrganization.role,
          profile: null
        }));
      }
    }
  }

  return {
    activeCases: activeCases ?? 0,
    pendingDocuments: pendingDocuments ?? 0,
    pendingRequests: pendingRequests ?? 0,
    recentMessages: recentMessages ?? 0,
    immutableDeadlines: immutableDeadlines ?? [],
    urgentSchedules: immutableDeadlines ?? [],
    recentCases: recentCases ?? [],
    caseOptions: caseOptions ?? [],
    recentRequests: recentRequests ?? [],
    recentMessageItems: messageItems ?? [],
    monthlyHighlights: monthlyHighlights ?? [],
    teamMembers: teamMembers ?? [],
    pendingBillingCount: pendingBillingCount ?? 0,
    upcomingBilling: upcomingBilling ?? [],
    unreadNotifications: unreadNotifications ?? 0,
    unreadNotificationItems: unreadNotificationItems ?? [],
    clientAccessQueue: clientAccessQueue ?? [],
    actionableNotifications: actionableNotifications ?? [],
    clientContacts,
    partnerContacts,
    organizationConversations: []
  };
}
