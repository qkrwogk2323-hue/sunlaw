import Link from 'next/link';
import { getEffectiveOrganizationId, isPlatformOperator, requireAuthenticatedUser } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardSnapshot } from '@/lib/queries/dashboard';

export const dynamic = 'force-dynamic';

export default async function ProductHomePage() {
  const auth = await requireAuthenticatedUser();
  const isPlatformView = isPlatformOperator(auth);
  const organizationId = getEffectiveOrganizationId(auth) ?? '';
  const data = isPlatformView ? null : await getDashboardSnapshot(organizationId);

  return (
    <main className="space-y-6">
      <div className="vs-brand-panel overflow-hidden rounded-[1.8rem] p-6 text-white shadow-[0_24px_54px_rgba(8,47,73,0.26)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-100/75">Vein Spiral</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">운영 첫 화면</h1>
        <p className="mt-3 text-sm leading-7 text-slate-200/88">지금 우선 처리해야 할 주요 업무를 빠르게 확인하고 바로 이동할 수 있도록 구성한 시작 화면입니다.</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        {isPlatformView ? (
          <>
            <Link href="/admin/organization-requests" className="vs-interactive rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300">
              <p className="text-xs font-semibold uppercase text-slate-500">플랫폼 운영</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">조직 신청 관리</p>
              <p className="mt-1 text-sm text-slate-500">신규 조직 신청과 탈퇴 신청을 검토합니다.</p>
            </Link>
            <Link href="/admin/organizations" className="vs-interactive rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300">
              <p className="text-xs font-semibold uppercase text-slate-500">조직 운영</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">조직 관리</p>
              <p className="mt-1 text-sm text-slate-500">조직 비활성화, 삭제, 상태 조정을 확인합니다.</p>
            </Link>
            <Link href="/admin/audit" className="vs-interactive rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300">
              <p className="text-xs font-semibold uppercase text-slate-500">운영 기록</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">감사 로그</p>
              <p className="mt-1 text-sm text-slate-500">플랫폼에서 일어난 변경 기록을 추적합니다.</p>
            </Link>
          </>
        ) : (
          <>
            <Link href="/cases" className="vs-interactive rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300">
              <p className="text-xs font-semibold uppercase text-slate-500">사건 관리</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{data?.activeCases ?? 0}</p>
              <p className="mt-1 text-sm text-slate-500">진행 중 사건</p>
            </Link>
            <Link href="/collections" className="vs-interactive rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300">
              <p className="text-xs font-semibold uppercase text-slate-500">추심 관리</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{data?.pendingRequests ?? 0}</p>
              <p className="mt-1 text-sm text-slate-500">미처리 요청</p>
            </Link>
            <Link href="/notifications" className="vs-interactive rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300">
              <p className="text-xs font-semibold uppercase text-slate-500">알림 센터</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{data?.unreadNotifications ?? 0}</p>
              <p className="mt-1 text-sm text-slate-500">새 알림</p>
            </Link>
          </>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="vs-interactive">
          <CardHeader>
            <CardTitle>{isPlatformView ? '조직 신청 검토' : '최근 사건'}</CardTitle>
          </CardHeader>
          <CardContent>
            {isPlatformView ? (
              <>
                <p className="text-sm text-slate-600">신규 조직 신청과 탈퇴 신청을 함께 검토하려면 조직 신청 관리로 이동하세요.</p>
                <Link href="/admin/organization-requests" className="mt-2 inline-flex text-sm font-medium text-sky-600">조직 신청 관리 보기 →</Link>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600">최근 사건 목록을 확인하려면 사건 메뉴로 이동하세요.</p>
                <Link href="/cases" className="mt-2 inline-flex text-sm font-medium text-sky-600">사건 보기 →</Link>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="vs-interactive">
          <CardHeader>
            <CardTitle>{isPlatformView ? '운영 기록' : '오늘 일정'}</CardTitle>
          </CardHeader>
          <CardContent>
            {isPlatformView ? (
              <>
                <p className="text-sm text-slate-600">중요한 변경 이력과 검토 기록은 감사 로그에서 바로 추적할 수 있습니다.</p>
                <Link href="/admin/audit" className="mt-2 inline-flex text-sm font-medium text-sky-600">감사 로그 보기 →</Link>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600">오늘의 처리 우선 일정을 확인하려면 일정 메뉴를 사용하세요.</p>
                <Link href="/calendar" className="mt-2 inline-flex text-sm font-medium text-sky-600">일정 보기 →</Link>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
