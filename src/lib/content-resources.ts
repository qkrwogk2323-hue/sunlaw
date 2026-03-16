import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getContent(namespace: string, resourceKey: string, locale = 'ko-KR', organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();
  if (organizationId) {
    const { data: orgPublished } = await supabase
      .from('content_resources')
      .select('value_text, value_json')
      .eq('namespace', namespace)
      .eq('resource_key', resourceKey)
      .eq('locale', locale)
      .eq('organization_id', organizationId)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (orgPublished?.value_text || orgPublished?.value_json) return orgPublished;
  }

  const { data: globalPublished } = await supabase
    .from('content_resources')
    .select('value_text, value_json')
    .eq('namespace', namespace)
    .eq('resource_key', resourceKey)
    .eq('locale', locale)
    .is('organization_id', null)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return globalPublished ?? null;
}
