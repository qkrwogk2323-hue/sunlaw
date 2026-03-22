/**
 * [ACTION TEMPLATE] — 새 server action을 만들 때 이 파일을 복사해서 시작하세요.
 * 사용법: cp src/templates/action.template.ts src/lib/actions/your-actions.ts
 *
 * RULE META (필수 — CI check:rule-meta가 검사합니다)
 * @rule-meta-start
 * actionScope: tenant
 * orgTypes: law_firm,credit_company
 * requiresAuthGuard: true
 * requiresAuditLog: false
 * affectedEntities: case
 * requiredTests: happy,error,auth
 * revalidateTargets: /cases
 * @rule-meta-end
 */

'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireOrganizationActionAccess } from '@/lib/auth';
// import { createAuditLog } from '@/lib/audit'; // requiresAuditLog: true 시 주석 해제

const schema = z.object({
  organizationId: z.string().uuid(),
  id: z.string().uuid(),
});

/**
 * 템플릿 액션 — 이름과 내용을 실제 기능에 맞게 수정하세요.
 * 반환 타입: { ok: true } | { ok: false; code: string; userMessage: string } (Rule 4-6)
 */
export async function yourExampleAction(formData: FormData): Promise<
  { ok: true } | { ok: false; code: string; userMessage: string }
> {
  // 1. 입력 검증 (서버가 최종 원본 — Rule 5-6)
  const parsed = schema.safeParse({
    organizationId: formData.get('organizationId'),
    id: formData.get('id'),
  });
  if (!parsed.success) {
    return { ok: false, code: 'INVALID_INPUT', userMessage: '입력값이 올바르지 않습니다.' };
  }

  // 2. 권한 가드 (서버 재검증 필수 — Rule 1-1)
  const { auth } = await requireOrganizationActionAccess(parsed.data.organizationId, {
    permission: 'case_edit', // 필요한 권한으로 교체
    errorMessage: '이 작업을 수행할 권한이 없습니다.',
  });

  try {
    // 3. 실제 작업
    // await supabase.from('...').update({ ... }).eq('id', parsed.data.id);

    // 4. 감사 로그 (requiresAuditLog: true 시 필수)
    // await createAuditLog({
    //   actorId: auth.user.id,
    //   action: 'your_action',
    //   entityType: 'your_entity',
    //   entityId: parsed.data.id,
    // });

    // 5. 경로 재검증
    revalidatePath('/cases'); // revalidateTargets에 맞게 수정

    return { ok: true };
  } catch {
    return { ok: false, code: 'SERVER_ERROR', userMessage: '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
  }
}
