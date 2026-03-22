import { NextResponse } from 'next/server';
import { requireAiAccess } from '@/lib/ai/policy';
import { buildScheduleBriefing } from '@/lib/ai/schedule-briefing';
import { listCalendarEntries } from '@/lib/queries/calendar';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as {
      organizationId?: string;
      todayIso?: string;
      weekEndIso?: string;
    };

    const { organizationId } = body;
    if (!organizationId) {
      return NextResponse.json({ error: '조직 정보가 필요합니다.' }, { status: 400 });
    }

    const access = await requireAiAccess({
      organizationId,
      blocked: '일정 브리핑을 조회할 권한이 없습니다.',
      cause: '현재 조직에 대한 멤버십 또는 플랫폼 관리자 권한이 확인되지 않았습니다.'
    });

    if (!access.ok) {
      return access.response;
    }

    const schedules = await listCalendarEntries(organizationId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToSunday = dayOfWeek === 0 ? 6 : 7 - dayOfWeek;
    weekEnd.setDate(today.getDate() + daysToSunday);
    weekEnd.setHours(23, 59, 59, 999);

    const briefing = buildScheduleBriefing(
      schedules,
      today.toISOString(),
      weekEnd.toISOString(),
    );

    return NextResponse.json({ briefing });
  } catch (error) {
    const message = error instanceof Error ? error.message : '브리핑 생성에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
