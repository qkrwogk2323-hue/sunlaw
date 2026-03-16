'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { getEffectiveOrganizationId, hasActivePlatformAdminView, requireAuthenticatedUser, requireOrganizationActionAccess } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const settingMutationSchema = z.object({
  key: z.string().min(1),
  valueJson: z.string().min(1),
  reason: z.string().trim().max(500).optional().or(z.literal('')),
  organizationId: z.string().uuid().optional().or(z.literal(''))
});

const contentMutationSchema = z.object({
  namespace: z.string().min(1),
  resourceKey: z.string().min(1),
  locale: z.string().min(2),
  valueText: z.string().trim().max(5000).optional().or(z.literal('')),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  organizationId: z.string().uuid().optional().or(z.literal('')),
  reason: z.string().trim().max(500).optional().or(z.literal(''))
});

const featureFlagMutationSchema = z.object({
  flagKey: z.string().min(1),
  enabled: z.boolean(),
  rolloutPercentage: z.coerce.number().int().min(0).max(100).default(100),
  organizationId: z.string().uuid().optional().or(z.literal('')),
  reason: z.string().trim().max(500).optional().or(z.literal(''))
});

function parseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error('설정 값은 유효한 JSON 형식이어야 합니다.');
  }
}

async function assertOrgAdmin(organizationId: string) {
  const { auth } = await requireOrganizationActionAccess(organizationId, {
    requireManager: true,
    permission: 'organization_settings_manage',
    errorMessage: '조직 설정 수정 권한이 없습니다.'
  });
  return auth;
}

export async function upsertPlatformSettingAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  if (!(await hasActivePlatformAdminView(auth))) {
    throw new Error('플랫폼 관리자만 수정할 수 있습니다.');
  }

  const parsed = settingMutationSchema.parse({
    key: formData.get('key'),
    valueJson: formData.get('valueJson'),
    reason: formData.get('reason'),
    organizationId: ''
  });

  const valueJson = parseJson(parsed.valueJson);
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin.from('platform_settings').select('value_json').eq('key', parsed.key).maybeSingle();

  const { error } = await admin.from('platform_settings').upsert({
    key: parsed.key,
    value_json: valueJson,
    updated_by: auth.user.id,
    updated_at: new Date().toISOString()
  });
  if (error) throw error;

  await admin.from('setting_change_logs').insert({
    target_type: 'platform_setting',
    target_key: parsed.key,
    old_value_json: existing?.value_json ?? null,
    new_value_json: valueJson,
    changed_by: auth.user.id,
    reason: parsed.reason || 'platform setting update'
  });

  revalidateTag('settings:platform', 'max');
  revalidatePath('/settings/platform');
}

export async function upsertOrganizationSettingAction(formData: FormData) {
  const parsed = settingMutationSchema.parse({
    key: formData.get('key'),
    valueJson: formData.get('valueJson'),
    reason: formData.get('reason'),
    organizationId: formData.get('organizationId')
  });
  const organizationId = parsed.organizationId || '';
  const auth = await assertOrgAdmin(organizationId);
  const valueJson = parseJson(parsed.valueJson);
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from('organization_settings')
    .select('value_json')
    .eq('organization_id', organizationId)
    .eq('key', parsed.key)
    .maybeSingle();

  const { error } = await admin.from('organization_settings').upsert({
    organization_id: organizationId,
    key: parsed.key,
    value_json: valueJson,
    updated_by: auth.user.id,
    updated_at: new Date().toISOString()
  }, { onConflict: 'organization_id,key' });
  if (error) throw error;

  await admin.from('setting_change_logs').insert({
    target_type: 'organization_setting',
    organization_id: organizationId,
    target_key: parsed.key,
    old_value_json: existing?.value_json ?? null,
    new_value_json: valueJson,
    changed_by: auth.user.id,
    reason: parsed.reason || 'organization setting update'
  });

  revalidateTag(`settings:org:${organizationId}`, 'max');
  revalidatePath('/settings/organization');
}

export async function upsertContentResourceAction(formData: FormData) {
  const parsed = contentMutationSchema.parse({
    namespace: formData.get('namespace'),
    resourceKey: formData.get('resourceKey'),
    locale: formData.get('locale') || 'ko-KR',
    valueText: formData.get('valueText'),
    status: formData.get('status') || 'draft',
    organizationId: formData.get('organizationId'),
    reason: formData.get('reason')
  });
  const auth = await requireAuthenticatedUser();
  const organizationId = parsed.organizationId || null;
  if (organizationId) {
    await assertOrgAdmin(organizationId);
  } else if (!(await hasActivePlatformAdminView(auth))) {
    throw new Error('플랫폼 문구는 플랫폼 관리자만 수정할 수 있습니다.');
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from('content_resources').insert({
    namespace: parsed.namespace,
    resource_key: parsed.resourceKey,
    locale: parsed.locale,
    organization_id: organizationId,
    status: parsed.status,
    value_text: parsed.valueText || null,
    updated_by: auth.user.id,
    published_at: parsed.status === 'published' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  });
  if (error) throw error;

  await admin.from('setting_change_logs').insert({
    target_type: 'content_resource',
    organization_id: organizationId,
    target_key: `${parsed.namespace}.${parsed.resourceKey}.${parsed.locale}`,
    old_value_json: null,
    new_value_json: { status: parsed.status, value_text: parsed.valueText || null },
    changed_by: auth.user.id,
    reason: parsed.reason || 'content resource update'
  });

  revalidateTag(organizationId ? `content:org:${organizationId}:${parsed.locale}` : `content:platform:${parsed.locale}`, 'max');
  revalidatePath('/settings/content');
  revalidatePath('/');
}

export async function upsertFeatureFlagAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  if (!(await hasActivePlatformAdminView(auth))) {
    throw new Error('플랫폼 관리자만 기능 플래그를 수정할 수 있습니다.');
  }

  const parsed = featureFlagMutationSchema.parse({
    flagKey: formData.get('flagKey'),
    enabled: formData.get('enabled') === 'on',
    rolloutPercentage: formData.get('rolloutPercentage') || 100,
    organizationId: formData.get('organizationId'),
    reason: formData.get('reason')
  });

  const organizationId = parsed.organizationId || null;
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from('feature_flags')
    .select('id, enabled, rollout_percentage, conditions_json')
    .eq('flag_key', parsed.flagKey)
    .is('organization_id', organizationId)
    .maybeSingle();

  let featureFlagError = null as any;
  if (existing?.id) {
    const { error } = await admin.from('feature_flags').update({
      enabled: parsed.enabled,
      rollout_percentage: parsed.rolloutPercentage,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString()
    }).eq('id', existing.id);
    featureFlagError = error;
  } else {
    const { error } = await admin.from('feature_flags').insert({
      flag_key: parsed.flagKey,
      organization_id: organizationId,
      enabled: parsed.enabled,
      rollout_percentage: parsed.rolloutPercentage,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString()
    });
    featureFlagError = error;
  }
  if (featureFlagError) throw featureFlagError;

  await admin.from('setting_change_logs').insert({
    target_type: 'feature_flag',
    organization_id: organizationId,
    target_key: parsed.flagKey,
    old_value_json: existing ?? null,
    new_value_json: { enabled: parsed.enabled, rollout_percentage: parsed.rolloutPercentage },
    changed_by: auth.user.id,
    reason: parsed.reason || 'feature flag update'
  });

  revalidateTag(organizationId ? `flags:org:${organizationId}` : 'flags:platform', 'max');
  revalidatePath('/settings/features');
}

export async function rollbackLatestSettingChangeAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  if (!(await hasActivePlatformAdminView(auth))) {
    throw new Error('플랫폼 관리자만 롤백할 수 있습니다.');
  }

  const logId = `${formData.get('logId') ?? ''}`;
  if (!logId) throw new Error('롤백할 변경 로그 ID가 필요합니다.');

  const admin = createSupabaseAdminClient();
  const { data: logRow, error: logError } = await admin
    .from('setting_change_logs')
    .select('*')
    .eq('id', logId)
    .single();
  if (logError || !logRow) throw logError ?? new Error('변경 로그를 찾을 수 없습니다.');

  if (logRow.target_type === 'platform_setting') {
    if (logRow.old_value_json == null) {
      await admin.from('platform_settings').delete().eq('key', logRow.target_key);
    } else {
      await admin.from('platform_settings').upsert({
        key: logRow.target_key,
        value_json: logRow.old_value_json,
        updated_by: auth.user.id,
        updated_at: new Date().toISOString()
      });
    }
    revalidateTag('settings:platform', 'max');
  } else if (logRow.target_type === 'organization_setting' && logRow.organization_id) {
    if (logRow.old_value_json == null) {
      await admin.from('organization_settings')
        .delete()
        .eq('organization_id', logRow.organization_id)
        .eq('key', logRow.target_key);
    } else {
      await admin.from('organization_settings').upsert({
        organization_id: logRow.organization_id,
        key: logRow.target_key,
        value_json: logRow.old_value_json,
        updated_by: auth.user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'organization_id,key' });
    }
    revalidateTag(`settings:org:${logRow.organization_id}`, 'max');
  } else if (logRow.target_type === 'feature_flag') {
    const oldValue = (logRow.old_value_json ?? {}) as any;
    const targetOrganizationId = logRow.organization_id ?? null;
    const { data: existingFlag } = await admin.from('feature_flags').select('id').eq('flag_key', logRow.target_key).is('organization_id', targetOrganizationId).maybeSingle();
    if (existingFlag?.id) {
      await admin.from('feature_flags').update({
        enabled: Boolean(oldValue.enabled ?? false),
        rollout_percentage: Number(oldValue.rollout_percentage ?? 100),
        updated_by: auth.user.id,
        updated_at: new Date().toISOString()
      }).eq('id', existingFlag.id);
    } else {
      await admin.from('feature_flags').insert({
        flag_key: logRow.target_key,
        organization_id: targetOrganizationId,
        enabled: Boolean(oldValue.enabled ?? false),
        rollout_percentage: Number(oldValue.rollout_percentage ?? 100),
        updated_by: auth.user.id,
        updated_at: new Date().toISOString()
      });
    }
    revalidateTag(logRow.organization_id ? `flags:org:${logRow.organization_id}` : 'flags:platform', 'max');
  } else {
    throw new Error('현재는 이 대상 유형의 롤백을 지원하지 않습니다.');
  }

  await admin.from('setting_change_logs').insert({
    target_type: logRow.target_type,
    organization_id: logRow.organization_id,
    target_key: logRow.target_key,
    old_value_json: logRow.new_value_json,
    new_value_json: logRow.old_value_json,
    changed_by: auth.user.id,
    reason: 'rollback',
    rolled_back_from_log_id: logRow.id
  });

  revalidatePath('/settings/platform');
  revalidatePath('/settings/organization');
  revalidatePath('/settings/features');
}

export async function getCurrentOrganizationIdForSettings() {
  const auth = await requireAuthenticatedUser();
  return getEffectiveOrganizationId(auth);
}
