import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  requirePlatformAdmin: vi.fn(),
  reviewOrganizationSignupRequestAction: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

vi.mock('@/lib/auth', () => ({
  requirePlatformAdmin: mocks.requirePlatformAdmin,
}));

vi.mock('@/lib/actions/organization-actions', () => ({
  reviewOrganizationSignupRequestAction: mocks.reviewOrganizationSignupRequestAction,
}));

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

loadEnvFile(resolve('.env.local'));
loadEnvFile(resolve('.env'));

const hasLiveSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const describeIfLive = hasLiveSupabaseConfig ? describe : describe.skip;

const currentSelect = `
  *,
  requester:profiles!organization_signup_requests_requester_profile_id_fkey(id, full_name, email),
  reviewer:profiles!organization_signup_requests_reviewed_by_fkey(id, full_name, email),
  approvedOrganization:organizations!organization_signup_requests_approved_organization_id_fkey(id, name, slug)
`;

const ambiguousSelect = `
  *,
  requester:profiles(id, full_name, email),
  reviewer:profiles(id, full_name, email),
  approvedOrganization:organizations(id, name, slug)
`;

describeIfLive('organization signup request live regression', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.requirePlatformAdmin.mockResolvedValue(undefined);
  });

  it('keeps the disambiguated query working and the admin page row count aligned', async () => {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    mocks.createSupabaseAdminClient.mockReturnValue(admin);

    const ambiguous = await admin
      .from('organization_signup_requests')
      .select(ambiguousSelect)
      .order('created_at', { ascending: false });

    expect(ambiguous.error?.code).toBe('PGRST201');

    const current = await admin
      .from('organization_signup_requests')
      .select(currentSelect)
      .order('created_at', { ascending: false });

    expect(current.error).toBeNull();

    const { listOrganizationSignupRequests } = await import('@/lib/queries/organization-requests');
    const rows = await listOrganizationSignupRequests();

    expect(rows.length).toBe(current.data?.length ?? 0);

    const pageModule = await import('@/app/(app)/admin/organization-requests/page');
    const markup = renderToStaticMarkup(await pageModule.default());
    const pageRowsCount = (markup.match(/신청자:/g) ?? []).length;

    expect(pageRowsCount).toBe(rows.length);
  });
});