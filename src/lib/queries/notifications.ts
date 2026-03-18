import { getCurrentAuth, getEffectiveOrganizationId } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getPortalCases } from '@/lib/queries/portal';

const TRASH_RETENTION_DAYS = 30;
const legacyNotificationSelect = 'id, title, body, kind, created_at, read_at, organization_id, case_id, payload, organization:organizations(id, name, slug)';
const upgradedNotificationSelect = 'id, title, body, kind, created_at, read_at, requires_action, resolved_at, action_label, action_href, action_entity_type, action_target_id, organization_id, case_id, trashed_at, payload, status, priority, destination_type, destination_url, destination_params, entity_type, entity_id, notification_type, organization:organizations(id, name, slug)';

type NotificationRecord = {
  id: string;
  title: string;
  body: string | null;
  kind: string;
  created_at: string;
  read_at: string | null;
  requires_action: boolean;
  resolved_at: string | null;
  action_label: string | null;
  action_href: string | null;
  action_entity_type: string | null;
  action_target_id: string | null;
  organization_id: string | null;
  case_id: string | null;
  trashed_at: string | null;
  status: string | null;
  priority: string | null;
  destination_type: string | null;
  destination_url: string | null;
  destination_params: Record<string, unknown> | null;
  entity_type: string | null;
  entity_id: string | null;
  notification_type: string | null;
  payload: Record<string, unknown> | null;
  organization:
    | {
        id: string;
        name: string;
        slug: string | null;
      }
    | Array<{
        id: string;
        name: string;
        slug: string | null;
      }>
    | null;
};

type NotificationItem = NotificationRecord & {
  organization: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
};

type NotificationCapabilities = {
  supportsTrash: boolean;
  supportsActionFields: boolean;
};

export type NavUnreadCounts = {
  unreadCount: number;
  actionRequiredCount: number;
  unreadConversationCount: number;
};

export type NotificationChannelPreferences = {
  kakao_enabled: boolean;
  kakao_important_only: boolean;
  allow_case: boolean;
  allow_schedule: boolean;
  allow_client: boolean;
  allow_collaboration: boolean;
};

function isMissingColumnError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === '42703'
  );
}

function withLegacyDefaults(record: Record<string, unknown>) {
  return {
    requires_action: false,
    resolved_at: null,
    action_label: null,
    action_href: null,
    action_entity_type: null,
    action_target_id: null,
    trashed_at: null,
    status: null,
    destination_url: null,
    destination_type: null,
    priority: null,
    entity_type: null,
    entity_id: null,
    notification_type: null,
    ...record
  } as NotificationRecord;
}

function normalizeNotification(record: NotificationRecord): NotificationItem {
  return {
    ...record,
    organization: Array.isArray(record.organization) ? (record.organization[0] ?? null) : record.organization ?? null
  };
}

async function purgeExpiredNotificationTrash(userId: string) {
  const supabase = await createSupabaseServerClient();
  const expiresAt = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('recipient_profile_id', userId)
    .lt('trashed_at', expiresAt);

  if (error && !isMissingColumnError(error)) {
    throw error;
  }
}

async function ensureKakaoSignupNotice(userId: string, organizationId: string | null) {
  const supabase = await createSupabaseServerClient();

  const { data: identityRows } = await supabase
    .schema('auth')
    .from('identities')
    .select('provider')
    .eq('user_id', userId)
    .eq('provider', 'kakao')
    .limit(1);

  if (!identityRows?.length) return;

  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('recipient_profile_id', userId)
    .eq('notification_type', 'kakao_channel_notice')
    .limit(1)
    .maybeSingle();

  if (existing?.id) return;

  await supabase.from('notifications').insert({
    organization_id: organizationId,
    recipient_profile_id: userId,
    kind: 'generic',
    notification_type: 'kakao_channel_notice',
    entity_type: 'collaboration',
    priority: 'normal',
    status: 'active',
    title: '카카오톡 중요 알림 안내',
    body: '카카오톡 가입자는 알림센터에서 알림 유형을 선택해 중요 알림을 카카오톡으로 받을 수 있습니다.',
    destination_type: 'internal_route',
    destination_url: '/notifications'
  });
}

export async function getUnreadNotificationCount() {
  const auth = await getCurrentAuth();

  if (!auth) return 0;

  const supabase = await createSupabaseServerClient();

  const upgraded = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_profile_id', auth.user.id)
    .is('trashed_at', null)
    .or('read_at.is.null,and(requires_action.eq.true,resolved_at.is.null)');

  if (!upgraded.error) {
    return upgraded.count ?? 0;
  }

  if (!isMissingColumnError(upgraded.error)) {
    throw upgraded.error;
  }

  const legacy = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_profile_id', auth.user.id)
    .is('read_at', null);

  if (legacy.error) {
    throw legacy.error;
  }

  return legacy.count ?? 0;
}

export async function getNavUnreadCounts(): Promise<NavUnreadCounts> {
  const auth = await getCurrentAuth();

  if (!auth) {
    return { unreadCount: 0, actionRequiredCount: 0, unreadConversationCount: 0 };
  }

  const supabase = await createSupabaseServerClient();

  const [unread, actionRequired] = await Promise.all([
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_profile_id', auth.user.id)
      .is('trashed_at', null)
      .is('read_at', null),
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_profile_id', auth.user.id)
      .is('trashed_at', null)
      .eq('requires_action', true)
      .is('resolved_at', null)
  ]);

  if (unread.error) {
    throw unread.error;
  }

  if (actionRequired.error && !isMissingColumnError(actionRequired.error)) {
    throw actionRequired.error;
  }

  return {
    unreadCount: unread.count ?? 0,
    actionRequiredCount: actionRequired.error ? 0 : actionRequired.count ?? 0,
    unreadConversationCount: 0
  };
}

export async function getNotificationCenter(limit = 20) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return {
      currentOrganizationId: null,
      currentOrganizationName: null,
      activeNotifications: [],
      currentOrganizationNotifications: [],
      otherOrganizationGroups: [],
      trashedNotifications: [],
      summary: {
        unreadCount: 0,
        actionRequiredCount: 0,
        trashCount: 0,
        activeCount: 0
      }
    };
  }

  let capabilities: NotificationCapabilities = {
    supportsTrash: true,
    supportsActionFields: true
  };

  await purgeExpiredNotificationTrash(auth.user.id);
  await ensureKakaoSignupNotice(auth.user.id, getEffectiveOrganizationId(auth));

  const supabase = await createSupabaseServerClient();
  const upgradedActive = await supabase
    .from('notifications')
    .select(upgradedNotificationSelect)
    .eq('recipient_profile_id', auth.user.id)
    .is('trashed_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  let activeNotifications: NotificationItem[] = [];
  let trashedNotifications: NotificationItem[] = [];

  if (!upgradedActive.error) {
    const upgradedTrash = await supabase
      .from('notifications')
      .select(upgradedNotificationSelect)
      .eq('recipient_profile_id', auth.user.id)
      .not('trashed_at', 'is', null)
      .order('trashed_at', { ascending: false })
      .limit(limit);

    if (upgradedTrash.error) {
      throw upgradedTrash.error;
    }

    activeNotifications = ((upgradedActive.data ?? []) as NotificationRecord[]).map(normalizeNotification);
    trashedNotifications = ((upgradedTrash.data ?? []) as NotificationRecord[]).map(normalizeNotification);
  } else {
    if (!isMissingColumnError(upgradedActive.error)) {
      throw upgradedActive.error;
    }

    capabilities = {
      supportsTrash: false,
      supportsActionFields: false
    };

    const legacyActive = await supabase
      .from('notifications')
      .select(legacyNotificationSelect)
      .eq('recipient_profile_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (legacyActive.error) {
      throw legacyActive.error;
    }

    activeNotifications = ((legacyActive.data ?? []) as Record<string, unknown>[])
      .map(withLegacyDefaults)
      .map(normalizeNotification);
  }

  const currentOrganizationId = getEffectiveOrganizationId(auth);
  const currentOrganizationMembership = auth.memberships.find((membership) => membership.organization_id === currentOrganizationId) ?? auth.memberships[0] ?? null;
  const currentOrganizationName = currentOrganizationMembership?.organization?.name ?? null;

  const currentOrganizationNotifications = activeNotifications.filter((notification) => notification.organization_id === currentOrganizationId || notification.organization_id === null);

  const otherOrganizationGroups = Object.values(
    activeNotifications
      .filter((notification) => notification.organization_id && notification.organization_id !== currentOrganizationId)
      .reduce<Record<string, { organizationId: string; organizationName: string; organizationSlug: string | null; items: NotificationItem[]; latestCreatedAt: string }>>((groups, notification) => {
        const organizationId = notification.organization_id ?? 'unknown';
        const currentGroup = groups[organizationId];
        const createdAt = notification.created_at;

        if (!currentGroup) {
          groups[organizationId] = {
            organizationId,
            organizationName: notification.organization?.name ?? '다른 조직',
            organizationSlug: notification.organization?.slug ?? null,
            items: [notification],
            latestCreatedAt: createdAt
          };
          return groups;
        }

        currentGroup.items.push(notification);
        if (new Date(createdAt).getTime() > new Date(currentGroup.latestCreatedAt).getTime()) {
          currentGroup.latestCreatedAt = createdAt;
        }

        return groups;
      }, {})
  ).sort((left, right) => new Date(right.latestCreatedAt).getTime() - new Date(left.latestCreatedAt).getTime());

  const unreadCount = activeNotifications.filter((notification) => !notification.read_at).length;
  const actionRequiredCount = activeNotifications.filter((notification) => notification.requires_action && !notification.resolved_at).length;

  return {
    currentOrganizationId,
    currentOrganizationName,
    activeNotifications,
    currentOrganizationNotifications,
    otherOrganizationGroups,
    trashedNotifications,
    capabilities,
    summary: {
      unreadCount,
      actionRequiredCount,
      trashCount: trashedNotifications.length,
      activeCount: activeNotifications.length
    }
  };
}

export async function getPortalNotifications(limit = 20) {
  const auth = await getCurrentAuth();
  if (!auth) return [];

  const caseIds = (await getPortalCases())
    .map((item: any) => item.case_id)
    .filter(Boolean);
  if (!caseIds.length) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body, kind, created_at, read_at, requires_action, resolved_at, action_label, action_href, action_entity_type, action_target_id, case_id')
    .eq('recipient_profile_id', auth.user.id)
    .in('case_id', caseIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listNotifications(limit = 50) {
  const center = await getNotificationCenter(limit);
  return [
    ...center.currentOrganizationNotifications,
    ...center.otherOrganizationGroups.flatMap((group) => group.items)
  ];
}

const queueSummarySelect = [
  'id',
  'title',
  'kind',
  'created_at',
  'organization_id',
  'read_at',
  'resolved_at',
  'trashed_at',
  'requires_action',
  'action_label',
  'action_href',
  'action_entity_type',
  'action_target_id',
  'case_id',
  'notification_type',
  'entity_type',
  'entity_id',
  'priority',
  'status',
  'destination_type',
  'destination_url',
  'destination_params',
  'organization:organizations(id, name, slug)'
].join(', ');

type QueueStatus = 'active' | 'read' | 'resolved' | 'archived' | 'deleted';
type QueuePriority = 'urgent' | 'normal' | 'low';
type QueueEntityType = 'case' | 'schedule' | 'client' | 'collaboration';

export type NotificationQueueItem = {
  notificationId: string;
  type: string;
  entityType: QueueEntityType;
  entityId: string | null;
  priority: QueuePriority;
  status: QueueStatus;
  destinationType: string;
  destinationUrl: string;
  createdAt: string;
  title: string;
  actionLabel: string;
  organizationId: string | null;
  organizationName: string | null;
};

type QueueGroup = {
  groupKey: string;
  entityType: QueueEntityType;
  entityId: string | null;
  title: string;
  count: number;
  items: NotificationQueueItem[];
};

function priorityWeight(priority: QueuePriority) {
  if (priority === 'urgent') return 3;
  if (priority === 'normal') return 2;
  return 1;
}

function fallbackEntityType(record: any): QueueEntityType {
  const value = `${record.entity_type ?? record.action_entity_type ?? ''}`;
  if (value === 'case' || value === 'schedule' || value === 'client' || value === 'collaboration') {
    return value;
  }
  if (record.case_id) return 'case';
  return 'collaboration';
}

function fallbackStatus(record: any): QueueStatus {
  const raw = `${record.status ?? ''}`;
  if (raw === 'active' || raw === 'read' || raw === 'resolved' || raw === 'archived' || raw === 'deleted') return raw;
  if (record.trashed_at) return 'archived';
  if (record.resolved_at) return 'resolved';
  if (record.read_at) return 'read';
  return 'active';
}

function fallbackPriority(record: any): QueuePriority {
  const raw = `${record.priority ?? ''}`;
  if (raw === 'urgent' || raw === 'normal' || raw === 'low') return raw;
  return record.requires_action ? 'urgent' : 'normal';
}

function fallbackDestination(record: any, entityType: QueueEntityType, entityId: string | null) {
  const actionHref = `${record.destination_url ?? record.action_href ?? ''}`.trim();
  if (actionHref.startsWith('/')) return actionHref;
  if (entityType === 'case' && entityId) return `/cases/${entityId}`;
  if (entityType === 'schedule') return '/calendar';
  if (entityType === 'client') return entityId ? `/clients?clientId=${entityId}&highlight=1` : '/clients';
  return '/dashboard';
}

function normalizeQueueItem(record: any): NotificationQueueItem {
  const entityType = fallbackEntityType(record);
  const entityId = `${record.entity_id ?? record.action_target_id ?? record.case_id ?? ''}`.trim() || null;
  const status = fallbackStatus(record);
  const priority = fallbackPriority(record);
  const destinationUrl = fallbackDestination(record, entityType, entityId);
  const organization = Array.isArray(record.organization) ? record.organization[0] ?? null : record.organization ?? null;

  return {
    notificationId: record.id,
    type: `${record.notification_type ?? record.kind ?? 'generic'}`,
    entityType,
    entityId,
    priority,
    status,
    destinationType: `${record.destination_type ?? 'internal_route'}`,
    destinationUrl,
    createdAt: record.created_at,
    title: `${record.title ?? ''}`,
    actionLabel: `${record.action_label ?? '열기'}`,
    organizationId: record.organization_id ?? null,
    organizationName: organization?.name ?? null
  };
}

function buildQueueGroups(items: NotificationQueueItem[]) {
  const byGroup = new Map<string, QueueGroup>();
  for (const item of items) {
    const key = `${item.entityType}:${item.entityId ?? 'none'}`;
    const existing = byGroup.get(key);
    if (existing) {
      existing.items.push(item);
      existing.count += 1;
      continue;
    }
    byGroup.set(key, {
      groupKey: key,
      entityType: item.entityType,
      entityId: item.entityId,
      title: item.title || (item.entityId ? `${item.entityType} #${item.entityId}` : `${item.entityType} 그룹`),
      count: 1,
      items: [item]
    });
  }
  return [...byGroup.values()].map((group) => ({
    ...group,
    items: group.items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }));
}

export async function getDashboardRecentNotifications(organizationId?: string | null, limit = 5): Promise<NotificationQueueItem[]> {
  const auth = await getCurrentAuth();
  if (!auth) return [];
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('notifications')
    .select(queueSummarySelect)
    .eq('recipient_profile_id', auth.user.id)
    .neq('status', 'deleted')
    .in('status', ['active', 'read'])
    .order('created_at', { ascending: false })
    .limit(Math.max(20, limit * 4));

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;
  if (error && !isMissingColumnError(error)) throw error;

  const normalized = ((data ?? []) as any[]).map(normalizeQueueItem);
  return normalized
    .sort((a, b) => {
      const p = priorityWeight(b.priority) - priorityWeight(a.priority);
      if (p !== 0) return p;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, limit);
}

export async function getNotificationQueueView({
  limit = 30,
  cursor,
  q,
  entityType,
  section,
  priority,
  state
}: {
  limit?: number;
  cursor?: string | null;
  q?: string | null;
  entityType?: QueueEntityType | 'all' | null;
  section?: 'all' | 'immediate' | 'confirm' | 'reference' | null;
  priority?: QueuePriority | 'all' | null;
  state?: QueueStatus | 'all' | null;
}) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return {
      currentOrganizationId: null,
      items: [] as NotificationQueueItem[],
      sections: {
        immediate: [] as QueueGroup[],
        confirm: [] as QueueGroup[],
        reference: [] as QueueGroup[]
      },
      nextCursor: null as string | null
    };
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('notifications')
    .select(queueSummarySelect)
    .eq('recipient_profile_id', auth.user.id)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error && !isMissingColumnError(error)) {
    throw error;
  }

  const keyword = `${q ?? ''}`.trim().toLowerCase();
  const normalizedEntityType = entityType && entityType !== 'all' ? entityType : null;
  const normalizedSection = section && section !== 'all' ? section : null;
  const normalizedPriority = priority && priority !== 'all' ? priority : null;
  const normalizedState = state && state !== 'all' ? state : null;
  const rows = ((data ?? []) as any[]).map(normalizeQueueItem).filter((item) => {
    if (normalizedEntityType && item.entityType !== normalizedEntityType) return false;
    if (normalizedPriority && item.priority !== normalizedPriority) return false;
    if (keyword && !`${item.title}`.toLowerCase().includes(keyword)) return false;
    if (normalizedState && item.status !== normalizedState) return false;
    return true;
  });
  const pageItems = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? pageItems[pageItems.length - 1]?.createdAt ?? null : null;
  const currentOrganizationId = getEffectiveOrganizationId(auth);

  const immediate = pageItems.filter((item) => item.status === 'active' && item.priority === 'urgent');
  const confirm = pageItems.filter((item) => item.status === 'active' && item.priority !== 'urgent');
  const reference = pageItems.filter((item) => item.status === 'read' || item.status === 'resolved' || item.status === 'archived');

  const sections = {
    immediate: normalizedSection && normalizedSection !== 'immediate' ? [] : buildQueueGroups(immediate),
    confirm: normalizedSection && normalizedSection !== 'confirm' ? [] : buildQueueGroups(confirm),
    reference: normalizedSection && normalizedSection !== 'reference' ? [] : buildQueueGroups(reference)
  };

  return {
    currentOrganizationId,
    items: pageItems,
    sections,
    nextCursor
  };
}

export async function getNotificationChannelPreferences(): Promise<NotificationChannelPreferences | null> {
  const auth = await getCurrentAuth();
  if (!auth) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('notification_channel_preferences')
    .select('kakao_enabled, kakao_important_only, allow_case, allow_schedule, allow_client, allow_collaboration')
    .eq('profile_id', auth.user.id)
    .maybeSingle();

  if (data) return data as NotificationChannelPreferences;

  return {
    kakao_enabled: true,
    kakao_important_only: true,
    allow_case: true,
    allow_schedule: true,
    allow_client: true,
    allow_collaboration: true
  };
}
