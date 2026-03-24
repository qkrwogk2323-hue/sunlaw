import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { findMembership, getCurrentAuth, hasActivePlatformAdminView } from '@/lib/auth';
import {
  guardAccessDeniedResponse,
  guardConditionFailedResponse,
  guardServerErrorResponse,
  guardValidationFailedResponse,
} from '@/lib/api-guard-response';

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/dashboard/work-items
// 조직 업무 항목(task/request/instruction) 생성
// ──────────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return guardAccessDeniedResponse(401, {
      code: 'AUTH_REQUIRED',
      blocked: '업무 항목 생성이 차단되었습니다.',
      cause: '로그인 세션이 없거나 만료되었습니다.',
      resolution: '다시 로그인한 뒤 요청을 재시도해 주세요.',
    });
  }

  const body = await request.json().catch(() => ({}));
  const organizationId = String(body.organizationId || '');
  const itemType = String(body.itemType || '');
  const content = String(body.content || '').trim();
  const priority = ['urgent', 'normal', 'low'].includes(String(body.priority)) ? String(body.priority) : 'normal';
  const dueAt: string | null = body.dueAt ? String(body.dueAt) : null;
  const assignedProfileId: string | null = body.assignedProfileId ? String(body.assignedProfileId) : null;

  // links: [{ linkType: 'case'|'client'|'hub', targetId: string, displayLabel: string }]
  const links: Array<{ linkType: string; targetId: string; displayLabel?: string }> =
    Array.isArray(body.links) ? body.links : [];

  if (!organizationId || !content) {
    return guardValidationFailedResponse(400, {
      blocked: '업무 항목 생성이 차단되었습니다.',
      cause: 'organizationId 또는 content가 누락되었습니다.',
      resolution: '조직 정보와 내용을 확인한 뒤 다시 시도해 주세요.',
    });
  }

  if (!['task', 'request', 'instruction', 'message'].includes(itemType)) {
    return guardValidationFailedResponse(400, {
      blocked: '업무 항목 생성이 차단되었습니다.',
      cause: `허용되지 않는 item_type: ${itemType}`,
      resolution: 'itemType은 task / request / instruction / message 중 하나여야 합니다.',
    });
  }

  const membership = findMembership(auth, organizationId);
  const isPlatformAdmin = await hasActivePlatformAdminView(auth, organizationId);
  if (!membership && !isPlatformAdmin) {
    return guardAccessDeniedResponse(403, {
      blocked: '업무 항목 생성이 차단되었습니다.',
      cause: '조직 멤버십 또는 플랫폼 관리자 권한이 확인되지 않았습니다.',
      resolution: '조직을 다시 선택하거나 권한 승인을 요청해 주세요.',
    });
  }

  const supabase = await createSupabaseServerClient();

  // 연결 링크 존재 여부 검증 (case 타입만 DB 체크, client/hub는 UI에서 이미 선택됨)
  for (const link of links) {
    if (link.linkType === 'case') {
      const { data, error } = await supabase
        .from('cases')
        .select('id')
        .eq('id', link.targetId)
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (error || !data) {
        return guardConditionFailedResponse(404, {
          blocked: '업무 항목 생성이 차단되었습니다.',
          cause: `연결하려는 사건(${link.targetId})을 찾을 수 없습니다.`,
          resolution: '유효한 사건을 선택한 뒤 다시 시도해 주세요.',
        });
      }
    }
  }

  // 1. work item 생성
  const { data: workItem, error: insertError } = await supabase
    .from('organization_work_items')
    .insert({
      organization_id: organizationId,
      item_type: itemType,
      body: content,
      status: 'open',
      priority,
      due_at: dueAt,
      assigned_profile_id: assignedProfileId,
      created_by: auth.user.id,
    })
    .select('id')
    .single();

  if (insertError || !workItem) {
    return guardServerErrorResponse(500, '업무 항목 저장에 실패했습니다.');
  }

  // 2. 링크 생성
  if (links.length > 0) {
    const linkRows = links.map((l) => ({
      work_item_id: workItem.id,
      link_type: l.linkType,
      target_id: l.targetId,
      display_label: l.displayLabel ?? null,
    }));
    const { error: linkError } = await supabase
      .from('organization_work_item_links')
      .insert(linkRows);
    if (linkError) {
      return guardServerErrorResponse(500, '업무 항목 태그 저장에 실패했습니다.');
    }
  }

  // 3. 생성 이벤트 기록
  const { error: eventError } = await supabase
    .from('organization_work_item_events')
    .insert({
      work_item_id: workItem.id,
      event_type: 'created',
      actor_id: auth.user.id,
      summary: `${itemType === 'task' ? '할 일' : itemType === 'request' ? '요청사항' : '지시'} 생성: ${content.slice(0, 80)}`,
    });
  if (eventError) {
    // 이벤트 실패는 치명적이지 않으므로 로그만
    console.error('[work-items] event insert failed', eventError);
  }

  // 4. audit_logs에도 기록
  const admin = createSupabaseAdminClient();
  await admin.from('audit_logs').insert({
    action: 'work_item.created',
    resource_type: 'organization_work_items',
    resource_id: workItem.id,
    organization_id: organizationId,
    actor_id: auth.user.id,
    meta: {
      item_type: itemType,
      priority,
      has_links: links.length > 0,
      summary: content.slice(0, 160),
    },
  });

  // 5. task/request 생성 시 알림 발송
  if (['task', 'request', 'instruction'].includes(itemType)) {
    const notificationKind = itemType === 'task' ? 'org_task_created'
      : itemType === 'request' ? 'org_request_created'
      : 'org_task_created';

    const destinationUrl = '/dashboard';

    // 담당자가 있으면 담당자에게, 없으면 관리자(org_owner, org_manager)에게
    const recipientIds: string[] = [];
    if (assignedProfileId && assignedProfileId !== auth.user.id) {
      recipientIds.push(assignedProfileId);
    } else {
      const { data: managers } = await supabase
        .from('organization_memberships')
        .select('profile_id')
        .eq('organization_id', organizationId)
        .in('role', ['org_owner', 'org_manager'])
        .eq('status', 'active');
      if (managers) {
        for (const m of managers) {
          if (m.profile_id && m.profile_id !== auth.user.id) {
            recipientIds.push(m.profile_id);
          }
        }
      }
    }

    if (recipientIds.length > 0) {
      const notificationRows = recipientIds.map((profileId) => ({
        organization_id: organizationId,
        recipient_profile_id: profileId,
        kind: notificationKind,
        title: itemType === 'task' ? '새 할 일이 등록되었습니다' : '새 요청사항이 등록되었습니다',
        body: content.slice(0, 160),
        action_label: '대시보드에서 확인',
        action_href: destinationUrl,
        destination_type: 'internal_route',
        destination_url: destinationUrl,
        payload: {
          work_item_id: workItem.id,
          item_type: itemType,
          created_by: auth.user.id,
          creator_name: auth.profile.full_name,
        },
      }));
      const { error: notifError } = await admin.from('notifications').insert(notificationRows);
      if (notifError) {
        console.error('[work-items] notification insert failed', notifError);
      }
    }
  }

  revalidatePath('/dashboard');

  return NextResponse.json({ ok: true, workItemId: workItem.id });
}

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/dashboard/work-items
// 업무 항목 상태 변경 (체크 / 해제 / 취소)
// ──────────────────────────────────────────────────────────────────────────────
export async function PATCH(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return guardAccessDeniedResponse(401, {
      code: 'AUTH_REQUIRED',
      blocked: '상태 변경이 차단되었습니다.',
      cause: '로그인 세션이 없거나 만료되었습니다.',
      resolution: '다시 로그인한 뒤 요청을 재시도해 주세요.',
    });
  }

  const body = await request.json().catch(() => ({}));
  const workItemId = String(body.workItemId || '');
  const newStatus = String(body.status || '');
  const organizationId = String(body.organizationId || '');

  if (!workItemId || !newStatus || !organizationId) {
    return guardValidationFailedResponse(400, {
      blocked: '상태 변경이 차단되었습니다.',
      cause: 'workItemId, status, organizationId가 필요합니다.',
      resolution: '요청 데이터를 확인한 뒤 다시 시도해 주세요.',
    });
  }

  if (!['open', 'in_progress', 'done', 'canceled'].includes(newStatus)) {
    return guardValidationFailedResponse(400, {
      blocked: '상태 변경이 차단되었습니다.',
      cause: `허용되지 않는 status: ${newStatus}`,
      resolution: 'status는 open / in_progress / done / canceled 중 하나여야 합니다.',
    });
  }

  const supabase = await createSupabaseServerClient();

  // 권한 확인: 같은 조직 멤버인지
  const { data: item, error: fetchError } = await supabase
    .from('organization_work_items')
    .select('id, status, organization_id')
    .eq('id', workItemId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (fetchError || !item) {
    return guardConditionFailedResponse(404, {
      blocked: '상태 변경이 차단되었습니다.',
      cause: '해당 업무 항목을 찾을 수 없습니다.',
      resolution: '목록을 새로고침한 뒤 다시 시도해 주세요.',
    });
  }

  const updateFields: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'done') {
    updateFields.completed_by = auth.user.id;
    updateFields.completed_at = new Date().toISOString();
  } else if (item.status === 'done' && newStatus === 'open') {
    updateFields.completed_by = null;
    updateFields.completed_at = null;
  }

  const { error: updateError } = await supabase
    .from('organization_work_items')
    .update(updateFields)
    .eq('id', workItemId);

  if (updateError) {
    return guardServerErrorResponse(500, '업무 항목 상태 업데이트에 실패했습니다.');
  }

  // 이벤트 기록
  const eventType = newStatus === 'done' ? 'checked'
    : (item.status === 'done' && newStatus === 'open') ? 'unchecked'
    : newStatus === 'canceled' ? 'canceled'
    : 'reopened';

  await supabase.from('organization_work_item_events').insert({
    work_item_id: workItemId,
    event_type: eventType,
    actor_id: auth.user.id,
    summary: `상태 변경: ${item.status} → ${newStatus}`,
  });

  // audit log
  const admin = createSupabaseAdminClient();
  await admin.from('audit_logs').insert({
    action: newStatus === 'done' ? 'work_item.checked' : 'work_item.unchecked',
    resource_type: 'organization_work_items',
    resource_id: workItemId,
    organization_id: organizationId,
    actor_id: auth.user.id,
    meta: { previous_status: item.status, new_status: newStatus },
  });

  revalidatePath('/dashboard');
  return NextResponse.json({ ok: true });
}
