'use server';

import { revalidatePath } from 'next/cache';
import { requirePlatformAdminAction } from '@/lib/auth';
import { createConditionFailedFeedback, createValidationFailedFeedback, throwGuardFeedback } from '@/lib/guard-feedback';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SubscriptionState } from '@/lib/subscription-lock';

const ALLOWED_STATES: SubscriptionState[] = ['trialing', 'active', 'past_due', 'locked_soft', 'locked_hard', 'cancelled'];

function nullableString(value: FormDataEntryValue | null) {
  const normalized = `${value ?? ''}`.trim();
  return normalized || null;
}

function nullableTimestamp(value: FormDataEntryValue | null) {
  const normalized = `${value ?? ''}`.trim();
  return normalized ? new Date(normalized).toISOString() : null;
}

// 플랫폼 관리자가 조직 구독 상태를 변경하고 관련 화면을 갱신한다.
export async function updateOrganizationSubscriptionStateAction(formData: FormData) {
  const auth = await requirePlatformAdminAction('플랫폼 관리자만 구독 상태를 조정할 수 있습니다.');
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  const state = `${formData.get('state') ?? ''}`.trim() as SubscriptionState;

  if (!organizationId) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'SUBSCRIPTION_MISSING_ORG_ID',
      blocked: '구독 상태 변경이 차단되었습니다.',
      cause: '조직 식별자가 누락되었습니다.',
      resolution: '조직을 선택한 뒤 다시 시도해 주세요.'
    }));
  }

  if (!ALLOWED_STATES.includes(state)) {
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'SUBSCRIPTION_INVALID_STATE',
      blocked: '구독 상태 변경이 차단되었습니다.',
      cause: `허용되지 않는 구독 상태입니다. 허용값: ${ALLOWED_STATES.join(', ')}`,
      resolution: '올바른 구독 상태를 선택해 주세요.'
    }));
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from('organization_subscription_states')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  const payload = {
    organization_id: organizationId,
    state,
    plan_code: nullableString(formData.get('planCode')),
    trial_start_at: nullableTimestamp(formData.get('trialStartAt')),
    trial_end_at: nullableTimestamp(formData.get('trialEndAt')),
    renewal_due_at: nullableTimestamp(formData.get('renewalDueAt')),
    past_due_started_at: nullableTimestamp(formData.get('pastDueStartedAt')),
    locked_soft_at: nullableTimestamp(formData.get('lockedSoftAt')),
    locked_hard_at: nullableTimestamp(formData.get('lockedHardAt')),
    cancelled_at: nullableTimestamp(formData.get('cancelledAt')),
    export_allowed_when_cancelled: `${formData.get('exportAllowedWhenCancelled') ?? ''}` === 'on',
    lock_reason: nullableString(formData.get('lockReason')),
    updated_by: auth.user.id
  };

  const { error } = await supabase
    .from('organization_subscription_states')
    .upsert(payload, { onConflict: 'organization_id' });

  if (error) {
    throw error;
  }

  await supabase.from('setting_change_logs').insert({
    target_type: 'organization_subscription_state',
    organization_id: organizationId,
    target_key: 'organization_subscription_states',
    old_value_json: existing ?? null,
    new_value_json: payload,
    changed_by: auth.user.id,
    reason: `subscription state -> ${state}`
  });

  await supabase.from('audit_logs').insert({
    actor_id: auth.user.id,
    action: 'organization_subscription_state_updated',
    resource_type: 'organization',
    resource_id: organizationId,
    organization_id: organizationId,
    meta: {
      previous_state: existing?.state ?? null,
      next_state: state,
      plan_code: payload.plan_code
    }
  });

  revalidatePath('/billing');
  revalidatePath('/settings/subscription');
  revalidatePath('/dashboard');
  revalidatePath('/admin/audit');
}
