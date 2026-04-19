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

  it('routes DOCUMENT_CREATED to the internal documents tab for the case', () => {
    const url = buildNotificationDestinationUrl(NOTIFICATION_TYPES.DOCUMENT_CREATED, {
      caseId: 'case-123'
    });
    expect(url).toBe('/cases/case-123?tab=documents');
  });

  it('routes DOCUMENT_SHARED_WITH_CLIENT to the portal case page', () => {
    const url = buildNotificationDestinationUrl(NOTIFICATION_TYPES.DOCUMENT_SHARED_WITH_CLIENT, {
      caseId: 'case-123'
    });
    expect(url).toBe('/portal/cases/case-123');
  });

  it('classifies DOCUMENT_CREATED as staff (internal) notification', () => {
    expect(isClientPortalNotification(NOTIFICATION_TYPES.DOCUMENT_CREATED)).toBe(false);
    expect(isPlatformOnlyNotification(NOTIFICATION_TYPES.DOCUMENT_CREATED)).toBe(false);
  });

  it('classifies DOCUMENT_SHARED_WITH_CLIENT as portal notification', () => {
    expect(isClientPortalNotification(NOTIFICATION_TYPES.DOCUMENT_SHARED_WITH_CLIENT)).toBe(true);
    expect(isPlatformOnlyNotification(NOTIFICATION_TYPES.DOCUMENT_SHARED_WITH_CLIENT)).toBe(false);
  });

  // BACKLOG §2 수렴: billing 정책 템플릿을 사건 비용 탭으로 고정.
  it('routes BILLING_ENTRY_CREATED to the case billing tab', () => {
    const url = buildNotificationDestinationUrl(NOTIFICATION_TYPES.BILLING_ENTRY_CREATED, {
      caseId: 'case-b1'
    });
    expect(url).toBe('/cases/case-b1?tab=billing');
  });

  it('routes BILLING_NOTICE to the case billing tab', () => {
    const url = buildNotificationDestinationUrl(NOTIFICATION_TYPES.BILLING_NOTICE, {
      caseId: 'case-b2'
    });
    expect(url).toBe('/cases/case-b2?tab=billing');
  });

  it('routes FEE_AGREEMENT_CREATED to the case billing tab', () => {
    const url = buildNotificationDestinationUrl(NOTIFICATION_TYPES.FEE_AGREEMENT_CREATED, {
      caseId: 'case-b3'
    });
    expect(url).toBe('/cases/case-b3?tab=billing');
  });

  it('routes PAYMENT_RECORDED to the case billing tab', () => {
    const url = buildNotificationDestinationUrl(NOTIFICATION_TYPES.PAYMENT_RECORDED, {
      caseId: 'case-b4'
    });
    expect(url).toBe('/cases/case-b4?tab=billing');
  });

  it('routes DOCUMENT_REVIEW_REQUESTED to the case documents tab', () => {
    const url = buildNotificationDestinationUrl(NOTIFICATION_TYPES.DOCUMENT_REVIEW_REQUESTED, {
      caseId: 'case-d1'
    });
    expect(url).toBe('/cases/case-d1?tab=documents');
  });

  it('routes DOCUMENT_REVIEWED to the case documents tab', () => {
    const url = buildNotificationDestinationUrl(NOTIFICATION_TYPES.DOCUMENT_REVIEWED, {
      caseId: 'case-d2'
    });
    expect(url).toBe('/cases/case-d2?tab=documents');
  });

  it('routes BILLING_SHARED_WITH_CLIENT to the portal case page', () => {
    const url = buildNotificationDestinationUrl(NOTIFICATION_TYPES.BILLING_SHARED_WITH_CLIENT, {
      caseId: 'case-bill-1'
    });
    expect(url).toBe('/portal/cases/case-bill-1');
  });

  it('classifies BILLING_SHARED_WITH_CLIENT as portal notification', () => {
    expect(isClientPortalNotification(NOTIFICATION_TYPES.BILLING_SHARED_WITH_CLIENT)).toBe(true);
  });

  it('routes CONTRACT_SIGNED_BY_CLIENT to the case billing tab', () => {
    const url = buildNotificationDestinationUrl(NOTIFICATION_TYPES.CONTRACT_SIGNED_BY_CLIENT, {
      caseId: 'case-sign-1'
    });
    expect(url).toBe('/cases/case-sign-1?tab=billing');
  });

  it('classifies CONTRACT_SIGNED_BY_CLIENT as internal notification', () => {
    expect(isClientPortalNotification(NOTIFICATION_TYPES.CONTRACT_SIGNED_BY_CLIENT)).toBe(false);
    expect(isPlatformOnlyNotification(NOTIFICATION_TYPES.CONTRACT_SIGNED_BY_CLIENT)).toBe(false);
  });
});
