'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { getEffectiveOrganizationId, getPlatformOrganizationContextId, hasActivePlatformAdminView, requireAuthenticatedUser, requireOrganizationActionAccess, requirePlatformAdminAction } from '@/lib/auth';
import { isPlatformManagementOrganization } from '@/lib/platform-governance';
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

const organizationExitRequestSchema = z.object({
  organizationId: z.string().uuid(),
  reason: z.string().trim().min(5).max(2000)
});

const reviewOrganizationExitRequestSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  reviewNote: z.string().trim().max(1000).optional().or(z.literal(''))
});

const organizationIntroUpdateSchema = z.object({
  organizationId: z.string().uuid(),
  intro: z.string().trim().max(4000).optional().or(z.literal(''))
});

const organizationProfileUpdateSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2, { message: '회사명은 2자 이상 입력해 주세요.' }).max(120, { message: '회사명은 120자 이하로 입력해 주세요.' }),
  kind: z.enum(['platform_management', 'law_firm', 'collection_company', 'mixed_practice', 'corporate_legal_team', 'other']),
  isDirectoryPublic: z.boolean().default(true),
  representativeName: z.string().trim().max(80).optional().or(z.literal('')),
  representativeTitle: z.string().trim().max(80).optional().or(z.literal('')),
  email: z.string().trim().email({ message: '올바른 이메일 형식으로 입력해 주세요.' }).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  websiteUrl: z.string().trim().url({ message: '올바른 URL 형식으로 입력해 주세요. (예: https://example.com)' }).optional().or(z.literal(''))
});

const organizationLifecycleMutationSchema = z.object({
  organizationId: z.string().uuid(),
  confirmText: z.string().trim().min(1)
});

function parseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error('설정 값은 유효한 JSON 형식이어야 합니다.');
  }
}

function normalizeSettingValueByType(value: unknown, valueType: string, key: string) {
  if (valueType === 'string') {
    if (typeof value !== 'string') throw new Error(`설정 키(${key})의 롤백 값 타입이 string이 아닙니다.`);
    return value;
  }

  if (valueType === 'integer') {
    if (typeof value !== 'number' || !Number.isInteger(value)) throw new Error(`설정 키(${key})의 롤백 값 타입이 integer가 아닙니다.`);
    return value;
  }

  if (valueType === 'decimal') {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`설정 키(${key})의 롤백 값 타입이 decimal이 아닙니다.`);
    return value;
  }

  if (valueType === 'boolean') {
    if (typeof value !== 'boolean') throw new Error(`설정 키(${key})의 롤백 값 타입이 boolean이 아닙니다.`);
    return value;
  }

  if (valueType === 'string_array') {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
      throw new Error(`설정 키(${key})의 롤백 값 타입이 string_array가 아닙니다.`);
    }
    return value;
  }

  if (valueType === 'json') {
    if (value == null || typeof value !== 'object') throw new Error(`설정 키(${key})의 롤백 값 타입이 json이 아닙니다.`);
    return value;
  }

  throw new Error(`설정 키(${key})의 타입(${valueType})을 확인할 수 없습니다.`);
}

async function getSettingCatalogValueType(admin: ReturnType<typeof createSupabaseAdminClient>, key: string) {
  const { data: catalogRow, error: catalogError } = await admin
    .from('setting_catalog')
    .select('value_type')
    .eq('key', key)
    .maybeSingle();
  if (catalogError) throw catalogError;
  if (!catalogRow?.value_type) {
    throw new Error(`설정 카탈로그에서 키(${key})를 찾을 수 없습니다.`);
  }
  return catalogRow.value_type as string;
}

async function assertOrgAdmin(organizationId: string) {
  const { auth } = await requireOrganizationActionAccess(organizationId, {
    requireManager: true,
    permission: 'organization_settings_manage',
    errorMessage: '조직 설정 수정 권한이 없습니다.'
  });
  return auth;
}

async function assertOrganizationLifecycleAccess(organizationId: string) {
  const auth = await requireAuthenticatedUser();
  const platformContextId = getPlatformOrganizationContextId(auth);
  const isPlatformAdmin = await hasActivePlatformAdminView(auth, platformContextId);

  if (isPlatformAdmin) {
    return auth;
  }

  const { auth: orgAuth } = await requireOrganizationActionAccess(organizationId, {
    requireManager: true,
    permission: 'organization_settings_manage',
    errorMessage: '조직 관리자만 조직 비활성화 또는 삭제를 실행할 수 있습니다.'
  });
  return orgAuth;
}

async function insertOrganizationLifecycleAuditLog(params: {
  actorId: string;
  organizationId: string;
  action: 'organization_deactivated' | 'organization_deleted';
  confirmText: string;
}) {
  const admin = createSupabaseAdminClient();
  await admin.from('audit_logs').insert({
    actor_id: params.actorId,
    action: params.action,
    resource_type: 'organization',
    resource_id: params.organizationId,
    organization_id: params.organizationId,
    meta: {
      confirm_text: params.confirmText
    }
  });
}

// 플랫폼 전역 설정 값을 생성하거나 갱신한다.
export async function upsertPlatformSettingAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  const platformOrganizationId = getPlatformOrganizationContextId(auth);
  if (!(await hasActivePlatformAdminView(auth, platformOrganizationId))) {
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

// 조직별 설정 값을 생성하거나 갱신한다.
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

// 서비스 문구 리소스를 생성하거나 갱신한다.
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
  } else if (!(await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth)))) {
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

// 플랫폼 기능 설정 값을 생성하거나 갱신한다.
export async function upsertFeatureFlagAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  if (!(await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth)))) {
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

// 가장 최근 설정 변경을 이전 상태로 되돌린다.
export async function rollbackLatestSettingChangeAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  if (!(await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth)))) {
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
      // Compensating delete: setting rows use row absence as the canonical rollback state.
      await admin.from('platform_settings').delete().eq('key', logRow.target_key);
    } else {
      const valueType = await getSettingCatalogValueType(admin, logRow.target_key);
      const normalizedValueJson = normalizeSettingValueByType(logRow.old_value_json, valueType, logRow.target_key);
      await admin.from('platform_settings').upsert({
        key: logRow.target_key,
        value_json: normalizedValueJson,
        updated_by: auth.user.id,
        updated_at: new Date().toISOString()
      });
    }
    revalidateTag('settings:platform', 'max');
  } else if (logRow.target_type === 'organization_setting' && logRow.organization_id) {
    if (logRow.old_value_json == null) {
      // Compensating delete: organization setting rollback restores the original "row does not exist" state.
      await admin.from('organization_settings')
        .delete()
        .eq('organization_id', logRow.organization_id)
        .eq('key', logRow.target_key);
    } else {
      const valueType = await getSettingCatalogValueType(admin, logRow.target_key);
      const normalizedValueJson = normalizeSettingValueByType(logRow.old_value_json, valueType, logRow.target_key);
      await admin.from('organization_settings').upsert({
        organization_id: logRow.organization_id,
        key: logRow.target_key,
        value_json: normalizedValueJson,
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

// 설정 화면에서 사용할 현재 조직 컨텍스트를 반환한다.
export async function getCurrentOrganizationIdForSettings() {
  const auth = await requireAuthenticatedUser();
  return getEffectiveOrganizationId(auth);
}

// 조직 탈퇴 요청을 생성한다.
export async function createOrganizationExitRequestAction(formData: FormData) {
  const parsed = organizationExitRequestSchema.parse({
    organizationId: formData.get('organizationId'),
    reason: formData.get('reason')
  });

  const { auth } = await requireOrganizationActionAccess(parsed.organizationId, {
    requireManager: true,
    permission: 'organization_settings_manage',
    errorMessage: '조직관리자만 탈퇴 신청을 생성할 수 있습니다.'
  });
  const admin = createSupabaseAdminClient();

  const { data: pending } = await admin
    .from('organization_exit_requests')
    .select('id')
    .eq('organization_id', parsed.organizationId)
    .eq('status', 'pending')
    .maybeSingle();

  if (pending?.id) {
    throw new Error('이미 검토 중인 조직 탈퇴 신청이 있습니다.');
  }

  const { error } = await admin.from('organization_exit_requests').insert({
    organization_id: parsed.organizationId,
    requested_by_profile_id: auth.user.id,
    reason: parsed.reason,
    status: 'pending'
  });
  if (error) throw error;

  revalidatePath('/settings/organization');
  revalidatePath('/admin/organization-requests');
}

// 조직 탈퇴 요청을 승인 또는 반려한다.
export async function reviewOrganizationExitRequestAction(formData: FormData) {
  const parsed = reviewOrganizationExitRequestSchema.parse({
    requestId: formData.get('requestId'),
    decision: formData.get('decision'),
    reviewNote: formData.get('reviewNote')
  });
  const auth = await requirePlatformAdminAction('플랫폼 관리자만 조직 탈퇴 신청을 검토할 수 있습니다.');
  const admin = createSupabaseAdminClient();

  const { data: requestRow, error: requestError } = await admin
    .from('organization_exit_requests')
    .select('id, organization_id, status')
    .eq('id', parsed.requestId)
    .maybeSingle();

  if (requestError || !requestRow) {
    throw requestError ?? new Error('탈퇴 신청을 찾을 수 없습니다.');
  }
  if (requestRow.status !== 'pending') {
    throw new Error('이미 처리된 탈퇴 신청입니다.');
  }

  const nextStatus = parsed.decision === 'approved' ? 'approved' : 'rejected';
  const now = new Date().toISOString();
  const { error } = await admin
    .from('organization_exit_requests')
    .update({
      status: nextStatus,
      reviewed_by_profile_id: auth.user.id,
      reviewed_note: parsed.reviewNote || null,
      reviewed_at: now
    })
    .eq('id', parsed.requestId);
  if (error) throw error;

  if (nextStatus === 'approved') {
    await admin
      .from('organizations')
      .update({
        lifecycle_status: 'pending_shutdown',
        updated_at: now
      })
      .eq('id', requestRow.organization_id);
  }

  revalidatePath('/settings/organization');
  revalidatePath('/admin/organization-requests');
}

// 조직 소개 문구를 저장한다.
export async function updateOrganizationIntroAction(formData: FormData) {
  const parsed = organizationIntroUpdateSchema.parse({
    organizationId: formData.get('organizationId'),
    intro: formData.get('intro')
  });
  const auth = await assertOrgAdmin(parsed.organizationId);
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const introValue = parsed.intro?.trim() || '';

  const { error } = await admin.from('organization_settings').upsert({
    organization_id: parsed.organizationId,
    key: 'organization_intro',
    value_json: { text: introValue },
    updated_by: auth.user.id,
    updated_at: now
  }, { onConflict: 'organization_id,key' });
  if (error) throw error;

  revalidateTag(`settings:org:${parsed.organizationId}`, 'max');
  revalidatePath('/settings/organization');
}

// 조직 기본 프로필 정보를 저장한다.
export async function updateOrganizationProfileAction(formData: FormData) {
  const raw = {
    organizationId: formData.get('organizationId'),
    name: formData.get('name'),
    kind: formData.get('kind'),
    isDirectoryPublic: formData.get('isDirectoryPublic') === 'on',
    representativeName: formData.get('representativeName'),
    representativeTitle: formData.get('representativeTitle'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    websiteUrl: formData.get('websiteUrl')
  };
  const result = organizationProfileUpdateSchema.safeParse(raw);
  if (!result.success) {
    const firstError = result.error.errors[0];
    const fieldNames: Record<string, string> = {
      name: '회사명',
      email: '이메일',
      websiteUrl: '웹사이트 URL',
      phone: '연락처',
      representativeName: '대표자명'
    };
    const fieldLabel = fieldNames[firstError.path[0] as string] ?? String(firstError.path[0] ?? '입력값');
    throw new Error(`[${fieldLabel}] ${firstError.message}`);
  }
  const parsed = result.data;
  const auth = await assertOrgAdmin(parsed.organizationId);
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data: existingOrganization, error: existingOrganizationError } = await admin
    .from('organizations')
    .select('id, slug, kind, is_platform_root')
    .eq('id', parsed.organizationId)
    .maybeSingle();
  if (existingOrganizationError || !existingOrganization) {
    throw existingOrganizationError ?? new Error('조직 정보를 찾을 수 없습니다.');
  }

  const isPlatformAdmin = await hasActivePlatformAdminView(auth, parsed.organizationId);
  const isPlatformRootOrganization = existingOrganization.is_platform_root === true;

  if (parsed.kind === 'platform_management' && !isPlatformRootOrganization) {
    throw new Error('플랫폼 관리조직 유형은 control plane registry가 지정한 플랫폼 조직에만 허용됩니다.');
  }

  if ((isPlatformRootOrganization || isPlatformManagementOrganization(existingOrganization)) && parsed.kind !== 'platform_management') {
    throw new Error('플랫폼 관리조직의 유형은 platform_management로 고정됩니다.');
  }

  if (!isPlatformAdmin && existingOrganization.kind !== parsed.kind) {
    throw new Error('조직유형 변경은 플랫폼 관리자만 가능합니다.');
  }

  const { error } = await admin
    .from('organizations')
    .update({
      name: parsed.name,
      kind: isPlatformRootOrganization
        ? 'platform_management'
        : (isPlatformAdmin ? parsed.kind : existingOrganization.kind),
      is_directory_public: parsed.isDirectoryPublic,
      representative_name: parsed.representativeName?.trim() || null,
      representative_title: parsed.representativeTitle?.trim() || null,
      email: parsed.email?.trim() || null,
      phone: parsed.phone?.trim() || null,
      website_url: parsed.websiteUrl?.trim() || null,
      updated_at: now
    })
    .eq('id', parsed.organizationId);
  if (error) throw error;

  revalidatePath('/settings/organization');
  revalidatePath('/organizations');
}

// 조직을 비활성 상태로 전환한다.
export async function deactivateOrganizationAction(formData: FormData) {
  const parsed = organizationLifecycleMutationSchema.parse({
    organizationId: formData.get('organizationId'),
    confirmText: formData.get('confirmText')
  });
  if (parsed.confirmText !== '비활성화') {
    throw new Error('확인 문구로 "비활성화"를 정확히 입력해 주세요.');
  }

  const auth = await assertOrganizationLifecycleAccess(parsed.organizationId);

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from('organizations')
    .update({
      lifecycle_status: 'archived',
      updated_at: now
    })
    .eq('id', parsed.organizationId)
    .neq('lifecycle_status', 'soft_deleted');
  if (error) throw error;

  await insertOrganizationLifecycleAuditLog({
    actorId: auth.user.id,
    organizationId: parsed.organizationId,
    action: 'organization_deactivated',
    confirmText: parsed.confirmText
  });

  revalidatePath('/settings/organization');
  revalidatePath('/dashboard');
  revalidatePath('/organizations');
  revalidatePath('/admin/organizations');
  revalidatePath('/admin/audit');
}

// 조직을 영구 삭제 상태로 전환한다.
export async function deleteOrganizationAction(formData: FormData) {
  const parsed = organizationLifecycleMutationSchema.parse({
    organizationId: formData.get('organizationId'),
    confirmText: formData.get('confirmText')
  });
  if (parsed.confirmText !== '삭제') {
    throw new Error('확인 문구로 "삭제"를 정확히 입력해 주세요.');
  }

  const auth = await assertOrganizationLifecycleAccess(parsed.organizationId);

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: memberships, error: membershipError } = await admin
    .from('organization_memberships')
    .select('profile_id')
    .eq('organization_id', parsed.organizationId)
    .eq('status', 'active');
  if (membershipError) throw membershipError;

  const profileIds = Array.from(new Set((memberships ?? []).map((row: any) => row.profile_id).filter(Boolean)));

  const { error: orgError } = await admin
    .from('organizations')
    .update({
      lifecycle_status: 'soft_deleted',
      updated_at: now
    })
    .eq('id', parsed.organizationId);
  if (orgError) throw orgError;

  const { error: inactiveMembershipError } = await admin
    .from('organization_memberships')
    .update({
      status: 'inactive',
      updated_at: now
    })
    .eq('organization_id', parsed.organizationId)
    .eq('status', 'active');
  if (inactiveMembershipError) throw inactiveMembershipError;

  if (profileIds.length > 0) {
    const { error: profileError } = await admin
      .from('profiles')
      .update({
        default_organization_id: null,
        updated_at: now
      })
      .in('id', profileIds)
      .eq('default_organization_id', parsed.organizationId);
    if (profileError) throw profileError;
  }

  await insertOrganizationLifecycleAuditLog({
    actorId: auth.user.id,
    organizationId: parsed.organizationId,
    action: 'organization_deleted',
    confirmText: parsed.confirmText
  });

  revalidatePath('/settings/organization');
  revalidatePath('/dashboard');
  revalidatePath('/organizations');
  revalidatePath('/admin/organizations');
  revalidatePath('/admin/audit');
  redirect('/organizations');
}
