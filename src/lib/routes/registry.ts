import type { Route } from 'next';

/**
 * 앱 전역 URL 단일 진실 원천(SSOT).
 * 하드코딩 문자열 대신 이 상수를 사용해 경로 오타와 중복 표기를 줄인다.
 */
export const ROUTES = {
  HOME: '/' as Route,
  AUTH_CALLBACK: '/auth/callback' as Route,

  START: '/start' as Route,
  START_SIGNUP: '/start/signup' as Route,
  START_PENDING: '/start/pending' as Route,
  START_PASSWORD_RESET: '/start/password-reset' as Route,
  START_MEMBER_PROFILE: '/start/member-profile' as Route,
  START_PROFILE_NAME: '/start/profile-name' as Route,

  LOGIN: '/login' as Route,
  SUPPORT: '/support' as Route,
  DEMO: '/demo' as Route,
  ORGANIZATION_REQUEST: '/organization-request' as Route,

  DASHBOARD: '/dashboard' as Route,
  PORTAL: '/portal' as Route,
  PORTAL_CASES: '/portal/cases' as Route,
  PORTAL_MESSAGES: '/portal/messages' as Route,
  PORTAL_NOTIFICATIONS: '/portal/notifications' as Route,

  INBOX: '/inbox' as Route,
  CASE_HUBS: '/case-hubs' as Route,
  CASES: '/cases' as Route,
  CLIENTS: '/clients' as Route,
  ORGANIZATIONS: '/organizations' as Route,
  COLLECTIONS: '/collections' as Route,
  DOCUMENTS: '/documents' as Route,
  NOTIFICATIONS: '/notifications' as Route,
  CALENDAR: '/calendar' as Route,
  BILLING: '/billing' as Route,
  CONTRACTS: '/contracts' as Route,
  REPORTS: '/reports' as Route,

  SETTINGS: '/settings' as Route,
  SETTINGS_TEAM: '/settings/team' as Route,
  SETTINGS_TEAM_SELF: '/settings/team/self' as Route,
  SETTINGS_ORGANIZATION: '/settings/organization' as Route,
  SETTINGS_CONTENT: '/settings/content' as Route,
  SETTINGS_SUBSCRIPTION: '/settings/subscription' as Route,
  SETTINGS_FEATURES: '/settings/features' as Route,

  ADMIN_AUDIT: '/admin/audit' as Route,
  ADMIN_ORGANIZATION_REQUESTS: '/admin/organization-requests' as Route,
  ADMIN_ORGANIZATIONS: '/admin/organizations' as Route,
  ADMIN_SUPPORT: '/admin/support' as Route
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
