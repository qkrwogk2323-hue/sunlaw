'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { buildTaskPlan } from '@/lib/ai/task-planner';
import { requireOrganizationActionAccess } from '@/lib/auth';
import { getClientDetailSummary } from '@/lib/queries/clients';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

async function notifyOrgManagers(
  organizationId: string,
  actorId: string,
  title: string,
  body: string,
  href: string,
  payload: Record<string, unknown>
) {
  const supabase = await createSupabaseServerClient();
  const { data: memberships } = await supabase
    .from('organization_memberships')
    .select('profile_id, role')
    .eq('organization_id', organizationId)
    .eq('status', 'active');

  const recipientIds = [...new Set(
    (memberships ?? [])
      .filter((m: any) => m.role === 'org_owner' || m.role === 'org_manager')
      .map((m: any) => m.profile_id)
      .concat(actorId)
  )].filter(Boolean);

  if (!recipientIds.length) return;

  const admin = createSupabaseAdminClient();
  await admin.from('notifications').insert(
    recipientIds.map((recipientProfileId) => ({
      organization_id: organizationId,
      recipient_profile_id: recipientProfileId,
      kind: 'generic',
      title,
      body,
      action_label: '의뢰인 보기',
      action_href: href,
      destination_type: 'internal_route',
      destination_url: href,
      payload
    }))
  );
}

// 의뢰인 상세 화면에 특이사항 메모를 등록한다.
export async function createClientSpecialNoteAction(formData: FormData) {
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  const clientKey = `${formData.get('clientKey') ?? ''}`.trim();
  const noteType = `${formData.get('noteType') ?? 'special'}`.trim();
  const noteBody = `${formData.get('noteBody') ?? ''}`.trim();
  const returnPath = `${formData.get('returnPath') ?? ''}`.trim();

  if (!organizationId || !clientKey || !noteBody) {
    throw new Error('필수 입력값이 누락되었습니다.');
  }

  const { auth } = await requireOrganizationActionAccess(organizationId, {
    permission: 'user_manage',
    errorMessage: '의뢰인 특이사항을 등록할 권한이 없습니다.'
  });

  const detail = await getClientDetailSummary(organizationId, clientKey);
  if (!detail) {
    throw new Error('의뢰인 정보를 찾을 수 없습니다.');
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('client_special_notes').insert({
    organization_id: organizationId,
    case_id: detail.caseId,
    case_client_id: detail.caseClientId,
    profile_id: detail.profileId,
    note_type: noteType,
    note_body: noteBody,
    created_by: auth.user.id
  });
  if (error) throw error;

  await notifyOrgManagers(
    organizationId,
    auth.user.id,
    `[의뢰인] 특이사항 등록: ${detail.name}`,
    `${detail.name} 의뢰인에게 특이사항이 등록되었습니다: ${noteBody.slice(0, 80)}${noteBody.length > 80 ? '...' : ''}`,
    returnPath || `/clients/${clientKey}`,
    { source: 'client_special_note_created', note_type: noteType, client_key: clientKey }
  );

  revalidatePath('/clients');
  if (returnPath) {
    revalidatePath(returnPath);
    redirect(returnPath as Route);
  }
}

// 의뢰인 최근 활동을 바탕으로 AI 코멘트 초안을 생성한다.
export async function generateClientAiCommentAction(formData: FormData) {
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  const clientKey = `${formData.get('clientKey') ?? ''}`.trim();
  const returnPath = `${formData.get('returnPath') ?? ''}`.trim();

  if (!organizationId || !clientKey || !returnPath) {
    throw new Error('필수 입력값이 누락되었습니다.');
  }

  await requireOrganizationActionAccess(organizationId, {
    permission: 'user_manage',
    errorMessage: 'AI 코멘트를 생성할 권한이 없습니다.'
  });

  const detail = await getClientDetailSummary(organizationId, clientKey);
  if (!detail) {
    throw new Error('의뢰인 정보를 찾을 수 없습니다.');
  }

  const latestActivities = detail.activities.slice(0, 8).map((item, index) => `${index + 1}. [${item.type}] ${item.title}\n${item.body}`).join('\n\n');
  const prompt = [
    `의뢰인 이름: ${detail.name}`,
    `연락처/이메일: ${detail.contactPhone ?? '-'} / ${detail.email ?? '-'}`,
    `연결 사건: ${detail.caseTitle ?? '미연결'}`,
    '최근 누적 이력:',
    latestActivities || '없음',
    '요청: 의뢰인의 성향/비용/사건 대응 전략을 4줄 이내로 한국어로 요약'
  ].join('\n');

  const plan = await buildTaskPlan(prompt, detail.caseId ? [{ id: detail.caseId, title: detail.caseTitle ?? '사건' }] : []);
  const aiComment = `${plan.summary}\n${plan.reason}`.trim().slice(0, 500);

  const separator = returnPath.includes('?') ? '&' : '?';
  redirect(`${returnPath}${separator}aiComment=${encodeURIComponent(aiComment)}` as Route);
}

// 두 의뢰인을 관련인 관계로 연결한다.
export async function linkRelatedClientAction(formData: FormData) {
  const organizationId = `${formData.get('organizationId') ?? ''}`.trim();
  const clientKey = `${formData.get('clientKey') ?? ''}`.trim();
  const targetClientKey = `${formData.get('targetClientKey') ?? ''}`.trim();
  const relation = `${formData.get('relation') ?? ''}`.trim();
  const returnPath = `${formData.get('returnPath') ?? ''}`.trim();

  if (!organizationId || !clientKey || !targetClientKey || !relation) {
    throw new Error('필수 입력값이 누락되었습니다.');
  }

  const { auth } = await requireOrganizationActionAccess(organizationId, {
    permission: 'user_manage',
    errorMessage: '관련인 연동 권한이 없습니다.'
  });

  const [sourceDetail, targetDetail] = await Promise.all([
    getClientDetailSummary(organizationId, clientKey),
    getClientDetailSummary(organizationId, targetClientKey)
  ]);
  if (!sourceDetail || !targetDetail) throw new Error('연동 대상 의뢰인을 찾지 못했습니다.');

  const supabase = await createSupabaseServerClient();
  const noteBody = `[관련인연동] 대상:${targetDetail.name}(${targetClientKey}) 관계:${relation}`;
  const { error } = await supabase.from('client_special_notes').insert({
    organization_id: organizationId,
    case_id: sourceDetail.caseId,
    case_client_id: sourceDetail.caseClientId,
    profile_id: sourceDetail.profileId,
    note_type: 'special',
    note_body: noteBody,
    created_by: auth.user.id
  });
  if (error) throw error;

  await notifyOrgManagers(
    organizationId,
    auth.user.id,
    `[의뢰인] 관련인 연동: ${sourceDetail.name} ↔ ${targetDetail.name}`,
    `${sourceDetail.name} 의뢰인에게 관련인이 등록되었습니다. 대상: ${targetDetail.name} · 관계: ${relation}`,
    returnPath || `/clients/${clientKey}`,
    { source: 'client_relation_linked', client_key: clientKey, target_client_key: targetClientKey, relation }
  );

  revalidatePath('/clients');
  if (returnPath) {
    revalidatePath(returnPath);
    redirect(returnPath as Route);
  }
}
