import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  requirePlatformAdmin: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

vi.mock('@/lib/auth', () => ({
  requirePlatformAdmin: mocks.requirePlatformAdmin,
}));

describe('organization signup request query contract', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.requirePlatformAdmin.mockResolvedValue(undefined);
  });

  it('returns an empty array only when the query succeeds with no rows', async () => {
    mocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    });

    const { listOrganizationSignupRequests } = await import('@/lib/queries/organization-requests');

    await expect(listOrganizationSignupRequests()).resolves.toEqual([]);
  });

  it('throws the Supabase error instead of hiding it as an empty array', async () => {
    const error = {
      code: 'PGRST201',
      message: 'Could not embed because more than one relationship was found for organization_signup_requests and profiles',
    };

    mocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(async () => ({ data: null, error })),
        })),
      })),
    });

    const { listOrganizationSignupRequests } = await import('@/lib/queries/organization-requests');

    await expect(listOrganizationSignupRequests()).rejects.toMatchObject(error);
  });
});