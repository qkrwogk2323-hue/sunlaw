import { describe, expect, it } from 'vitest';
import { getDefaultTemplatePermissions, PERMISSION_GROUPS, PERMISSION_KEYS, resolveMembershipPermissions } from '@/lib/permissions';
import type { Membership } from '@/lib/types';

describe('permission groups', () => {
  it('includes manage-level billing, schedule, and collection permissions in the selectable keys', () => {
    expect(PERMISSION_GROUPS.schedules).toContain('schedule_manage');
    expect(PERMISSION_GROUPS.billing).toContain('billing_manage');
    expect(PERMISSION_GROUPS.collection).toContain('collection_manage');

    expect(PERMISSION_KEYS).toContain('schedule_manage');
    expect(PERMISSION_KEYS).toContain('billing_manage');
    expect(PERMISSION_KEYS).toContain('collection_manage');
  });
});

describe('default permission templates', () => {
  it('grants office managers the billing_manage permission required by billing writes', () => {
    const officeManager = getDefaultTemplatePermissions('office_manager');

    expect(officeManager.billing_manage).toBe(true);
    expect(officeManager.schedule_manage).toBe(true);
  });
});

describe('resolveMembershipPermissions', () => {
  function makeMembership(overrides: Partial<Membership>): Membership {
    return {
      id: 'mem-1',
      organization_id: 'org-1',
      profile_id: 'user-1',
      role: 'org_staff',
      actor_category: 'staff',
      status: 'active',
      permission_template_key: null,
      permission_overrides: null,
      permissions: null,
      organization: null,
      profile: null,
      title: null,
      ...overrides
    } as unknown as Membership;
  }

  it('grants org_owner full permissions when no template key is set', () => {
    const membership = makeMembership({ role: 'org_owner', permission_template_key: null });
    const perms = resolveMembershipPermissions(membership);
    // org_owner should have case_create (was the failing permission in production)
    expect(perms.case_create).toBe(true);
    expect(perms.billing_manage).toBe(true);
    expect(perms.organization_settings_manage).toBe(true);
    expect(perms.user_manage).toBe(true);
  });

  it('grants org_manager full permissions when no template key is set', () => {
    const membership = makeMembership({ role: 'org_manager', permission_template_key: null });
    const perms = resolveMembershipPermissions(membership);
    expect(perms.case_create).toBe(true);
    expect(perms.billing_manage).toBe(true);
  });

  it('respects explicit permission_template_key over role fallback', () => {
    // org_owner with org_staff template key should get restricted permissions
    const membership = makeMembership({ role: 'org_owner', permission_template_key: 'org_staff' });
    const perms = resolveMembershipPermissions(membership);
    expect(perms.case_create).toBe(true); // org_staff can create cases
    expect(perms.billing_manage).toBeFalsy(); // org_staff cannot manage billing
  });

  it('returns empty permissions for null membership', () => {
    const perms = resolveMembershipPermissions(null);
    expect(perms.case_create).toBeFalsy();
  });
});