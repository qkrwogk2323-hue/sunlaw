import type { Route } from 'next';
import { ROUTES } from '@/lib/routes/registry';
import {
  NOTIFICATION_GROUP_KEYS,
  NOTIFICATION_NAV_KEYS,
  NOTIFICATION_STATE_KEYS
} from '@/lib/interactions/notifications-keys';

export const INTERACTION_KEYS = {
  LOGIN_KAKAO: 'login.kakao',
  NOTIFICATIONS_OPEN: 'notifications.open',
  NOTIFICATIONS_SUMMARY_IMMEDIATE: 'notifications.summary.immediate',
  NOTIFICATIONS_SUMMARY_CONFIRM: 'notifications.summary.confirm',
  NOTIFICATIONS_SUMMARY_MEETING: 'notifications.summary.meeting',
  NOTIFICATIONS_SUMMARY_OTHER: 'notifications.summary.other',
  NOTIFICATIONS_MARK_READ: 'notifications.markRead',
  NOTIFICATIONS_RESOLVE: 'notifications.resolve',
  NOTIFICATIONS_ARCHIVE: 'notifications.archive',
  CASES_LIST: 'cases.list',
  CALENDAR_OPEN: 'calendar.open',
  ORGANIZATIONS_LIST: 'organizations.list'
} as const;

export type InteractionKey = (typeof INTERACTION_KEYS)[keyof typeof INTERACTION_KEYS];
export const INTERACTION_ACTION_KEYS = {
  AUTH_LOGIN_KAKAO: 'auth.login.kakao',
  NOTIFICATIONS_MARK_READ: 'notifications.markRead',
  NOTIFICATIONS_RESOLVE: 'notifications.resolve',
  NOTIFICATIONS_ARCHIVE: 'notifications.archive'
} as const;

export type InteractionActionKey = (typeof INTERACTION_ACTION_KEYS)[keyof typeof INTERACTION_ACTION_KEYS];
export const INTERACTION_TYPES = {
  NAVIGATE: 'navigate',
  SCROLL: 'scroll',
  MUTATE: 'mutate',
  MIXED: 'mixed'
} as const;

export type InteractionType = (typeof INTERACTION_TYPES)[keyof typeof INTERACTION_TYPES];
export type InteractionState = {
  section?: string;
  state?: string;
};

export type InteractionDefinition = {
  type: InteractionType;
  route: Route;
  state?: InteractionState;
  group: string;
  actionKey?: InteractionActionKey;
};

export const INTERACTION_REGISTRY: Record<InteractionKey, InteractionDefinition> = {
  [INTERACTION_KEYS.LOGIN_KAKAO]: {
    route: ROUTES.LOGIN,
    type: INTERACTION_TYPES.MUTATE,
    group: 'auth-login',
    actionKey: INTERACTION_ACTION_KEYS.AUTH_LOGIN_KAKAO
  },
  [INTERACTION_KEYS.NOTIFICATIONS_OPEN]: {
    route: ROUTES.NOTIFICATIONS,
    type: INTERACTION_TYPES.MIXED,
    group: NOTIFICATION_GROUP_KEYS.ROW_CTA
  },
  [INTERACTION_KEYS.NOTIFICATIONS_SUMMARY_IMMEDIATE]: {
    route: ROUTES.NOTIFICATIONS,
    type: INTERACTION_TYPES.NAVIGATE,
    state: {
      state: NOTIFICATION_STATE_KEYS.ACTIVE.split('.').at(-1),
      section: NOTIFICATION_STATE_KEYS.SECTION_IMMEDIATE.split('.').at(-1)
    },
    group: NOTIFICATION_GROUP_KEYS.SUMMARY_CARDS
  },
  [INTERACTION_KEYS.NOTIFICATIONS_SUMMARY_CONFIRM]: {
    route: ROUTES.NOTIFICATIONS,
    type: INTERACTION_TYPES.NAVIGATE,
    state: {
      state: NOTIFICATION_STATE_KEYS.ACTIVE.split('.').at(-1),
      section: NOTIFICATION_STATE_KEYS.SECTION_CONFIRM.split('.').at(-1)
    },
    group: NOTIFICATION_GROUP_KEYS.SUMMARY_CARDS
  },
  [INTERACTION_KEYS.NOTIFICATIONS_SUMMARY_MEETING]: {
    route: ROUTES.NOTIFICATIONS,
    type: INTERACTION_TYPES.NAVIGATE,
    state: {
      state: NOTIFICATION_STATE_KEYS.ACTIVE.split('.').at(-1),
      section: NOTIFICATION_STATE_KEYS.SECTION_MEETING.split('.').at(-1)
    },
    group: NOTIFICATION_GROUP_KEYS.SUMMARY_CARDS
  },
  [INTERACTION_KEYS.NOTIFICATIONS_SUMMARY_OTHER]: {
    route: ROUTES.NOTIFICATIONS,
    type: INTERACTION_TYPES.NAVIGATE,
    state: {
      state: NOTIFICATION_STATE_KEYS.ACTIVE.split('.').at(-1),
      section: NOTIFICATION_STATE_KEYS.SECTION_OTHER.split('.').at(-1)
    },
    group: NOTIFICATION_GROUP_KEYS.SUMMARY_CARDS
  },
  [INTERACTION_KEYS.NOTIFICATIONS_MARK_READ]: {
    route: ROUTES.NOTIFICATIONS,
    type: INTERACTION_TYPES.MUTATE,
    group: NOTIFICATION_GROUP_KEYS.ROW_MUTATE,
    actionKey: INTERACTION_ACTION_KEYS.NOTIFICATIONS_MARK_READ
  },
  [INTERACTION_KEYS.NOTIFICATIONS_RESOLVE]: {
    route: ROUTES.NOTIFICATIONS,
    type: INTERACTION_TYPES.MUTATE,
    group: NOTIFICATION_GROUP_KEYS.ROW_MUTATE,
    actionKey: INTERACTION_ACTION_KEYS.NOTIFICATIONS_RESOLVE
  },
  [INTERACTION_KEYS.NOTIFICATIONS_ARCHIVE]: {
    route: ROUTES.NOTIFICATIONS,
    type: INTERACTION_TYPES.MUTATE,
    group: NOTIFICATION_GROUP_KEYS.ROW_MUTATE,
    actionKey: INTERACTION_ACTION_KEYS.NOTIFICATIONS_ARCHIVE
  },
  [INTERACTION_KEYS.CASES_LIST]: {
    route: ROUTES.CASES,
    type: INTERACTION_TYPES.NAVIGATE,
    group: 'cases-navigation'
  },
  [INTERACTION_KEYS.CALENDAR_OPEN]: {
    route: ROUTES.CALENDAR,
    type: INTERACTION_TYPES.NAVIGATE,
    group: 'calendar-navigation'
  },
  [INTERACTION_KEYS.ORGANIZATIONS_LIST]: {
    route: ROUTES.ORGANIZATIONS,
    type: INTERACTION_TYPES.NAVIGATE,
    group: 'organizations-navigation'
  }
};

export function getInteractionDefinition(key: InteractionKey): InteractionDefinition {
  return INTERACTION_REGISTRY[key];
}

export function resolveInteractionHref(
  key: InteractionKey,
  fallback: Route = ROUTES.NOTIFICATIONS
): string {
  const definition = getInteractionDefinition(key);
  const base = definition.route ?? fallback;
  const href = new URL(base, 'http://localhost');
  if (definition.state) {
    for (const [stateKey, value] of Object.entries(definition.state)) {
      if (!value) continue;
      if (stateKey === 'section') {
        href.hash = value;
        continue;
      }
      href.searchParams.set(stateKey, value);
    }
  }
  return `${href.pathname}${href.search}${href.hash}`;
}

export const NOTIFICATION_INTERACTION_KEYS = {
  OPEN: NOTIFICATION_NAV_KEYS.OPEN,
  SUMMARY_IMMEDIATE: NOTIFICATION_NAV_KEYS.SUMMARY_IMMEDIATE,
  SUMMARY_CONFIRM: NOTIFICATION_NAV_KEYS.SUMMARY_CONFIRM,
  SUMMARY_MEETING: NOTIFICATION_NAV_KEYS.SUMMARY_MEETING,
  SUMMARY_OTHER: NOTIFICATION_NAV_KEYS.SUMMARY_OTHER,
  MARK_READ: INTERACTION_KEYS.NOTIFICATIONS_MARK_READ,
  RESOLVE: INTERACTION_KEYS.NOTIFICATIONS_RESOLVE,
  ARCHIVE: INTERACTION_KEYS.NOTIFICATIONS_ARCHIVE
} as const;
