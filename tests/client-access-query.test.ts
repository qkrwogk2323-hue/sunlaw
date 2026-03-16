import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn()
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient
}));

describe('client access queries', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('applies the organization search term in SQL before limiting results', async () => {
    const limit = vi.fn(async () => ({
      data: [{ id: 'org-25', name: '찾는 조직', slug: 'target-org', kind: 'law_firm', lifecycle_status: 'active', is_directory_public: true }],
      error: null
    }));
    const order = vi.fn(() => ({ limit }));
    const or = vi.fn(() => ({ order }));
    const eq = vi.fn(() => ({ or }));
    const neq = vi.fn(() => ({ eq }));
    const select = vi.fn(() => ({ neq }));

    mocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn(() => ({ select }))
    });

    const { searchPublicOrganizations } = await import('@/lib/queries/client-access');
    const results = await searchPublicOrganizations('target-org');

    expect(or).toHaveBeenCalledWith('name.ilike.%target-org%,slug.ilike.%target-org%');
    expect(limit).toHaveBeenCalledWith(24);
    expect(results).toEqual([
      { id: 'org-25', name: '찾는 조직', slug: 'target-org', kind: 'law_firm', lifecycle_status: 'active', is_directory_public: true }
    ]);
  });
});