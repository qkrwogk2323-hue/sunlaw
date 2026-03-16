import { unstable_cache } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SettingValue = string | number | boolean | string[] | Record<string, unknown> | null;

function safeCoerce(value: any, valueType: string): SettingValue {
  try {
    if (valueType === 'integer') return Number.parseInt(String(value), 10);
    if (valueType === 'decimal') return Number(value);
    if (valueType === 'boolean') return Boolean(value);
    if (valueType === 'string_array') return Array.isArray(value) ? value.map(String) : [];
    if (valueType === 'json') return value as Record<string, unknown>;
    return value == null ? null : String(value);
  } catch {
    return null;
  }
}

const _getPlatformSetting = unstable_cache(async (key: string) => {
  const supabase = await createSupabaseServerClient();
  const [{ data: platform }, { data: catalog }] = await Promise.all([
    supabase.from('platform_settings').select('value_json').eq('key', key).maybeSingle(),
    supabase.from('setting_catalog').select('value_type, default_value_json').eq('key', key).maybeSingle()
  ]);
  if (!catalog) return null;
  return safeCoerce(platform?.value_json ?? catalog.default_value_json, catalog.value_type);
}, ['platform-settings'], { tags: ['settings:platform'] });

export async function getSetting(key: string, organizationId?: string | null): Promise<SettingValue> {
  const supabase = await createSupabaseServerClient();
  if (organizationId) {
    const [{ data: org }, { data: catalog }] = await Promise.all([
      supabase.from('organization_settings').select('value_json').eq('organization_id', organizationId).eq('key', key).maybeSingle(),
      supabase.from('setting_catalog').select('value_type, default_value_json').eq('key', key).maybeSingle()
    ]);
    if (catalog) return safeCoerce(org?.value_json ?? (await _getPlatformSetting(key)) ?? catalog.default_value_json, catalog.value_type);
  }
  return _getPlatformSetting(key);
}
