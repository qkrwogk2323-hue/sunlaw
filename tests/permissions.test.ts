import { describe, expect, it } from 'vitest';
import { getDefaultTemplatePermissions, PERMISSION_GROUPS, PERMISSION_KEYS } from '@/lib/permissions';

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