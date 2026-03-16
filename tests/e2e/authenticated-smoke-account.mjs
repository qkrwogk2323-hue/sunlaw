import { createClient } from '@supabase/supabase-js';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function createAuthenticatedSmokeAdminClient() {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });
}

async function listCandidateProfiles(admin) {
  const { data, error } = await admin
    .from('profiles')
    .select('id, email, default_organization_id, platform_role, is_active')
    .eq('platform_role', 'platform_support')
    .eq('is_active', true)
    .order('email', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function firstActiveMembershipOrg(admin, profileId) {
  const { data, error } = await admin
    .from('organization_memberships')
    .select('organization_id')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.organization_id ?? null;
}

export async function resolveAuthenticatedSmokeAccount() {
  const configuredEmail = process.env.E2E_AUTH_SMOKE_EMAIL?.trim().toLowerCase() || null;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (configuredEmail) {
    return {
      email: configuredEmail,
      source: 'env'
    };
  }

  if (!serviceRoleKey) {
    throw new Error('Authenticated smoke requires E2E_AUTH_SMOKE_EMAIL when SUPABASE_SERVICE_ROLE_KEY is not available.');
  }

  const admin = createAuthenticatedSmokeAdminClient();
  const candidates = await listCandidateProfiles(admin);

  for (const candidate of candidates) {
    const organizationId = candidate.default_organization_id ?? await firstActiveMembershipOrg(admin, candidate.id);
    if (organizationId && candidate.email) {
      return {
        email: String(candidate.email).toLowerCase(),
        source: 'auto-discovered'
      };
    }
  }

  throw new Error('No active platform_support smoke account with organization context was found. Set E2E_AUTH_SMOKE_EMAIL explicitly or seed a platform_support user.');
}

export function maskEmail(email) {
  const [localPart, domain] = String(email).split('@');
  if (!domain) return 'unknown';
  if (localPart.length <= 2) return `${localPart[0] ?? '*'}*@${domain}`;
  return `${localPart.slice(0, 2)}***@${domain}`;
}

export async function resolveAuthenticatedSmokeRecipient() {
  const admin = createAuthenticatedSmokeAdminClient();
  const { email } = await resolveAuthenticatedSmokeAccount();

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, email, default_organization_id')
    .eq('email', email)
    .single();

  if (profileError || !profile) {
    throw profileError ?? new Error(`Smoke profile not found for ${email}.`);
  }

  const organizationId = profile.default_organization_id ?? await firstActiveMembershipOrg(admin, profile.id);

  return {
    profileId: profile.id,
    organizationId,
    email
  };
}