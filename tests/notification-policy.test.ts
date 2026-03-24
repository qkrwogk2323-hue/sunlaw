import { describe, expect, it } from 'vitest';
import {
  NOTIFICATION_TYPES,
  isPlatformOnlyNotification,
  isClientPortalNotification,
  buildNotificationDestinationUrl,
} from '@/lib/notification-policy';

describe('isPlatformOnlyNotification', () => {
  it('returns true for platform_bug_alert', () => {
    expect(isPlatformOnlyNotification(NOTIFICATION_TYPES.PLATFORM_BUG_ALERT)).toBe(true);
  });

  it('returns true for platform_org_review', () => {
    expect(isPlatformOnlyNotification(NOTIFICATION_TYPES.PLATFORM_ORG_REVIEW)).toBe(true);
  });

  it('returns false for billing_notice (internal org notification)', () => {
    expect(isPlatformOnlyNotification(NOTIFICATION_TYPES.BILLING_NOTICE)).toBe(false);
  });

  it('returns false for case_created (internal org notification)', () => {
    expect(isPlatformOnlyNotification(NOTIFICATION_TYPES.CASE_CREATED)).toBe(false);
  });

  it('returns false for unknown type string', () => {
    expect(isPlatformOnlyNotification('completely_unknown_type')).toBe(false);
  });
});

describe('isClientPortalNotification', () => {
  it('returns true for client_profile_incomplete (portal destination)', () => {
    expect(isClientPortalNotification(NOTIFICATION_TYPES.CLIENT_PROFILE_INCOMPLETE)).toBe(true);
  });

  it('returns false for billing_notice (internal destination)', () => {
    expect(isClientPortalNotification(NOTIFICATION_TYPES.BILLING_NOTICE)).toBe(false);
  });

  it('returns false for platform_bug_alert (platform destination)', () => {
    expect(isClientPortalNotification(NOTIFICATION_TYPES.PLATFORM_BUG_ALERT)).toBe(false);
  });
});

describe('buildNotificationDestinationUrl', () => {
  it('substitutes caseId in case_created template', () => {
    const url = buildNotificationDestinationUrl(NOTIFICATION_TYPES.CASE_CREATED, { caseId: 'case-abc' });
    expect(url).toBe('/cases/case-abc');
  });

  it('returns /inbox for hub_invited (no param substitution needed)', () => {
    const url = buildNotificationDestinationUrl(NOTIFICATION_TYPES.HUB_INVITED, { hubId: 'hub-xyz' });
    expect(url).toBe('/inbox');
  });

  it('uses portal template for client_profile_incomplete', () => {
    const url = buildNotificationDestinationUrl(NOTIFICATION_TYPES.CLIENT_PROFILE_INCOMPLETE, {});
    expect(url).toMatch(/^\/portal/);
  });

  it('uses platform internal template for platform_bug_alert', () => {
    const url = buildNotificationDestinationUrl(NOTIFICATION_TYPES.PLATFORM_BUG_ALERT, {});
    expect(url).toMatch(/^\/admin/);
  });

  it('replaces missing params with bracketed placeholder', () => {
    const url = buildNotificationDestinationUrl(NOTIFICATION_TYPES.CASE_CREATED, {});
    expect(url).toBe('/cases/[caseId]');
  });
});
