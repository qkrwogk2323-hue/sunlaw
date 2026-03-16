import { getCurrentAuth, getEffectiveOrganizationId } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const TRASH_RETENTION_DAYS = 30;
const legacyNotificationSelect = 'id, title, body, kind, created_at, read_at, organization_id, case_id, payload, organization:organizations(id, name, slug)';
const upgradedNotificationSelect = 'id, title, body, kind, created_at, read_at, requires_action, resolved_at, action_label, action_href, action_entity_type, action_target_id, organization_id, case_id, trashed_at, payload, organization:organizations(id, name, slug)';

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

export async function listNotifications(limit = 50) {
  const center = await getNotificationCenter(limit);
  return [
    ...center.currentOrganizationNotifications,
    ...center.otherOrganizationGroups.flatMap((group) => group.items)
  ];
}
