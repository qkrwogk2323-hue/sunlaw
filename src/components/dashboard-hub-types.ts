/**
 * DashboardHubClient + DashboardCommunicationPanel 공유 타입.
 *
 * dashboard-hub-client.tsx에서 분리 (2026-04-18).
 * 두 파일 모두 이 타입들을 import해 쓴다.
 */

export type PlatformScenarioMode = 'law_admin' | 'collection_admin' | 'other_admin';

export type CaseOption = {
  id: string;
  title: string | null;
  reference_no?: string | null;
  case_status?: string | null;
  stage_key?: string | null;
  updated_at?: string | null;
};

export type TeamMember = {
  id: string;
  role?: string | null;
  title?: string | null;
  profile?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
  } | Array<{
    id: string;
    full_name?: string | null;
    email?: string | null;
  }> | null;
};

export type MessageItem = {
  id: string;
  body: string | null;
  is_internal: boolean | null;
  created_at: string | null;
  sender_role?: string | null;
  sender_profile_id?: string | null;
  recipient_profile_id?: string | null;
  case_id?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
  sender?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
};

export type ScheduleItem = {
  id: string;
  title: string | null;
  schedule_kind: string | null;
  scheduled_start: string | null;
  location?: string | null;
  notes?: string | null;
  is_important?: boolean | null;
  case_id?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
};

export type RequestItem = {
  id: string;
  title: string | null;
  status: string | null;
  request_kind?: string | null;
  due_at?: string | null;
  case_id?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
};

export type BillingItem = {
  id: string;
  title: string | null;
  amount: number | null;
  status: string | null;
  due_on?: string | null;
  case_id?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
};

export type NotificationItem = {
  id: string;
  title: string | null;
  body?: string;
  created_at: string | null;
  action_label?: string | null;
  action_href?: string | null;
  destination_url?: string | null;
  destination_type?: string | null;
  priority?: 'urgent' | 'normal' | 'low' | string | null;
  status?: 'active' | 'read' | 'resolved' | 'archived' | 'deleted' | string | null;
  entity_type?: 'case' | 'schedule' | 'client' | 'collaboration' | string | null;
  entity_id?: string | null;
  action_entity_type?: string | null;
  requires_action?: boolean | null;
  resolved_at?: string | null;
  organization_id?: string | null;
  category?: 'immediate' | 'confirm' | 'meeting' | 'other';
};

export type ClientAccessQueueItem = {
  id: string;
  requester_name: string | null;
  requester_email?: string | null;
  status: string | null;
  request_note?: string | null;
  created_at: string | null;
  target_organization_id?: string | null;
  organization?: {
    name?: string | null;
    slug?: string | null;
  } | Array<{
    name?: string | null;
    slug?: string | null;
  }> | null;
};

export type ClientContact = {
  id: string;
  case_id: string | null;
  profile_id?: string | null;
  client_name: string | null;
  relation_label?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
};

export type PartnerContact = {
  case_organization_id: string;
  case_id: string | null;
  organization_id: string | null;
  organization_name: string;
  role?: string | null;
  membership_id: string;
  member_role?: string | null;
  profile?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
  } | null;
};

export type OrganizationConversationMessage = {
  id: string;
  body: string;
  created_at: string;
  sender_name: string;
  sender_organization_name: string;
  recipient_organization_name: string;
  case_id?: string | null;
  case_title?: string | null;
};

export type OrganizationConversationRoom = {
  id: string;
  partner_organization_id: string;
  partner_organization_name: string;
  topic: string;
  last_message_at: string;
  case_id?: string | null;
  case_title?: string | null;
  unread_count: number;
  messages: OrganizationConversationMessage[];
};

export type PlannerTask = {
  title: string;
  summary: string;
  dueAt: string | null;
  scheduleKind: 'deadline' | 'meeting' | 'hearing' | 'reminder' | 'other';
  isImportant: boolean;
  reason: string;
  provider: 'openai' | 'gemini' | 'rules';
  setupHint: string | null;
};

export type AiSourceMeta = {
  dataType: string;
  generatedAt: string;
  scope: Record<string, unknown>;
  filters: Record<string, unknown>;
};

export type CoordinationChecklistItem = {
  id: string;
  label: string;
  detail: string;
  dueAt: string | null;
  priority: 'high' | 'medium' | 'low';
  notifyTarget: 'self' | 'manager' | 'assignee' | 'team';
};

export type CoordinationPlan = {
  summary: string;
  reason: string;
  provider: 'openai' | 'gemini' | 'rules';
  setupHint: string | null;
  recommendedRecipientMode: 'self' | 'managers' | 'all' | 'one';
  checklist: CoordinationChecklistItem[];
};

export type WorkItemLink = {
  id: string;
  link_type: string;
  target_id: string;
  display_label: string | null;
};

export type WorkItem = {
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
  links: WorkItemLink[];
};

export type DashboardSnapshot = {
  activeCases: number;
  pendingDocuments: number;
  pendingRequests: number;
  recentMessages: number;
  urgentSchedules: ScheduleItem[];
  recentCases: CaseOption[];
  caseOptions: CaseOption[];
  recentRequests: RequestItem[];
  recentMessageItems: MessageItem[];
  monthlyHighlights: ScheduleItem[];
  teamMembers: TeamMember[];
  pendingBillingCount: number;
  upcomingBilling: BillingItem[];
  unreadNotifications: number;
  unreadNotificationItems: NotificationItem[];
  clientAccessQueue: ClientAccessQueueItem[];
  actionableNotifications: NotificationItem[];
  clientContacts: ClientContact[];
  partnerContacts: PartnerContact[];
  organizationConversations: OrganizationConversationRoom[];
  recentWorkItems: WorkItem[];
};

export type DashboardSecondarySnapshot = Pick<
  DashboardSnapshot,
  'teamMembers' | 'clientContacts' | 'partnerContacts' | 'organizationConversations' | 'recentWorkItems'
>;

export const PLATFORM_SCENARIO_MEMBER_STORAGE_KEY = 'vs_platform_scenario_member';
