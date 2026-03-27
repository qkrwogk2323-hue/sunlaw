import type { Route } from 'next';
import { ROUTES } from '@/lib/routes/registry';

/**
 * 클릭 가능한 UI 요소 -> 목적지 경로 매핑의 단일 기준.
 * 컴포넌트에서 식별자 기반으로 참조하면 링크 책임 분산을 줄일 수 있다.
 */
export const NAVIGATION_MAP = {
  brandLogo: ROUTES.HOME,
  marketingStartCta: ROUTES.START,
  marketingDemo: ROUTES.DEMO,
  marketingPlatformDashboard: ROUTES.DASHBOARD,
  marketingOrganizationRequests: ROUTES.ADMIN_ORGANIZATION_REQUESTS,
  marketingNotifications: ROUTES.NOTIFICATIONS,
  marketingCases: ROUTES.CASES,

  loginGoDashboard: ROUTES.DASHBOARD,
  loginSignup: ROUTES.START_SIGNUP,
  loginOrganizationRequest: ROUTES.ORGANIZATION_REQUEST,
  loginSupport: ROUTES.SUPPORT,

  settingsOverview: ROUTES.SETTINGS,
  settingsTeam: ROUTES.SETTINGS_TEAM,
  settingsOrganization: ROUTES.SETTINGS_ORGANIZATION,
  settingsContent: ROUTES.SETTINGS_CONTENT,
  settingsSubscription: ROUTES.SETTINGS_SUBSCRIPTION,
  settingsFeatures: ROUTES.SETTINGS_FEATURES
} as const satisfies Record<string, Route>;

export type NavigationKey = keyof typeof NAVIGATION_MAP;
