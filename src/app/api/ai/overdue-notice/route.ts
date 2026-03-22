import { NextResponse } from 'next/server';
import { requireAiAccess } from '@/lib/ai/policy';
import { buildOverdueNoticeDraft } from '@/lib/ai/overdue-notice';
import type { OverdueNoticeParams } from '@/lib/ai/overdue-notice';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as (OverdueNoticeParams & { organizationId: string }) | null;

    if (!body?.organizationId) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_INPUT', userMessage: '조직 정보가 필요합니다.' },
        { status: 400 },
      );
    }

    const access = await requireAiAccess({
      organizationId: body.organizationId,
      blocked: '연체 안내 초안 생성이 차단되었습니다.',
    });
    if (!access.ok) return access.response;

    const required: (keyof OverdueNoticeParams)[] = ['clientName', 'caseTitle', 'overdueAmount', 'dueDaysAgo', 'orgName', 'noticeType'];
    const missing = required.filter((key) => !body[key] && body[key] !== 0);
    if (missing.length > 0) {
      return NextResponse.json(
        { ok: false, code: 'MISSING_FIELDS', userMessage: `필수 항목이 누락되었습니다: ${missing.join(', ')}` },
        { status: 400 },
      );
    }

    const draft = buildOverdueNoticeDraft(body);
    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        code: 'INTERNAL_ERROR',
        userMessage: error instanceof Error ? error.message : '초안 생성에 실패했습니다.',
      },
      { status: 500 },
    );
  }
}
