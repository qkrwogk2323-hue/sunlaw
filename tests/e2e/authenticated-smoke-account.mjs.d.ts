import type { SupabaseClient } from '@supabase/supabase-js';

export function createAuthenticatedSmokeAdminClient(): SupabaseClient;
export function maskEmail(email: string): string;
export function resolveAuthenticatedSmokeAccount(): Promise<{
  email: string;
  source: 'env' | 'auto-discovered';
}>;
export function resolveAuthenticatedSmokeRecipient(): Promise<{
  profileId: string;
  organizationId: string | null;
  email: string;
}>;