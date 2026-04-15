export const NOTIFICATION_NAV_KEYS = {
  OPEN: 'notifications.open',
  SUMMARY_IMMEDIATE: 'notifications.summary.immediate',
  SUMMARY_CONFIRM: 'notifications.summary.confirm',
  SUMMARY_MEETING: 'notifications.summary.meeting',
  SUMMARY_OTHER: 'notifications.summary.other',
  ARCHIVE_LIST: 'notifications.archive.list'
} as const;

export const NOTIFICATION_ACTION_KEYS = {
  MARK_READ: 'notifications.markRead',
  RESOLVE: 'notifications.resolve',
  ARCHIVE: 'notifications.archive'
} as const;

export const NOTIFICATION_STATE_KEYS = {
  ACTIVE: 'notifications.state.active',
  ARCHIVED: 'notifications.state.archived',
  SECTION_IMMEDIATE: 'notifications.section.immediate',
  SECTION_CONFIRM: 'notifications.section.confirm',
  SECTION_MEETING: 'notifications.section.meeting',
  SECTION_OTHER: 'notifications.section.other'
} as const;

export const NOTIFICATION_GROUP_KEYS = {
  SUMMARY_CARDS: 'notification-summary-cards',
  ROW_CTA: 'notification-row-cta',
  ROW_MUTATE: 'notification-row-mutate',
  ARCHIVE_LIST_NAV: 'notification-archive-list-nav'
} as const;
