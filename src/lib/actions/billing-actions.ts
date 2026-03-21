'use server';

import { revalidatePath } from 'next/cache';
import { requirePlatformAdminAction } from '@/lib/auth';
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

export async function updateOrganizationSubscriptionStateAction(formData: FormData) {
  const auth = await requirePlatformAdminAction('플랫폼 관리자만 구독 상태를 조정할 수 있습니다.');
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  const state = `${formData.get('state') ?? ''}`.trim() as SubscriptionState;

  if (!organizationId) {
    throw new Error('조직 식별자가 누락되었습니다.');
  }

  if (!ALLOWED_STATES.includes(state)) {
    throw new Error('허용되지 않는 구독 상태입니다.');
  }

  const supabase = await createSupabaseServerClient();
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

  revalidatePath('/billing');
  revalidatePath('/dashboard');
}
