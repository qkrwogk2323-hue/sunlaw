import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getSettingsAdminData(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();

  const [{ data: catalog }, { data: platformSettings }, { data: organizationSettings }, { data: contentResources }, { data: featureFlags }, { data: changeLogs }] = await Promise.all([
    supabase.from('setting_catalog').select('*').order('domain', { ascending: true }).order('key', { ascending: true }),
    supabase.from('platform_settings').select('*').order('key', { ascending: true }),
    organizationId
      ? supabase.from('organization_settings').select('*').eq('organization_id', organizationId).order('key', { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
    supabase.from('content_resources').select('*').or(organizationId ? `organization_id.is.null,organization_id.eq.${organizationId}` : 'organization_id.is.null').order('namespace', { ascending: true }).order('resource_key', { ascending: true }),
    supabase.from('feature_flags').select('*').or(organizationId ? `organization_id.is.null,organization_id.eq.${organizationId}` : 'organization_id.is.null').order('flag_key', { ascending: true }),
    supabase.from('setting_change_logs').select('*, changed_by_profile:profiles(full_name,email)').or(organizationId ? `organization_id.is.null,organization_id.eq.${organizationId}` : 'organization_id.is.null').order('created_at', { ascending: false }).limit(50)
  ]);

  return {
    catalog: catalog ?? [],
    platformSettings: platformSettings ?? [],
    organizationSettings: organizationSettings ?? [],
    contentResources: contentResources ?? [],
    featureFlags: featureFlags ?? [],
    changeLogs: changeLogs ?? []
  };
}
