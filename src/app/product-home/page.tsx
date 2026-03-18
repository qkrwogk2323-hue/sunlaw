import Link from 'next/link';
import { requireAuthenticatedUser } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardSnapshot } from '@/lib/queries/dashboard';

export const dynamic = 'force-dynamic';

export default async function ProductHomePage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = auth.memberships[0]?.organization_id ?? '';
  const data = await getDashboardSnapshot(organizationId);

  return (
    <main className="space-y-6">
      <div className="vs-brand-panel overflow-hidden rounded-[1.8rem] p-6 text-white shadow-[0_24px_54px_rgba(8,47,73,0.26)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-100/75">Vein Spiral</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">운영 첫 화면</h1>
        <p className="mt-3 text-sm leading-7 text-slate-200/88">지금 우선 처리해야 할 주요 업무를 빠르게 확인하고 바로 이동할 수 있도록 구성한 시작 화면입니다.</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Link href="/cases" className="vs-interactive rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300">
          <p className="text-xs font-semibold uppercase text-slate-500">사건 관리</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{data.activeCases ?? 0}</p>
          <p className="mt-1 text-sm text-slate-500">진행 중 사건</p>
        </Link>
        <Link href="/collections" className="vs-interactive rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300">
          <p className="text-xs font-semibold uppercase text-slate-500">추심 관리</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{data.pendingRequests ?? 0}</p>
          <p className="mt-1 text-sm text-slate-500">미처리 요청</p>
        </Link>
        <Link href="/notifications" className="vs-interactive rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300">
          <p className="text-xs font-semibold uppercase text-slate-500">알림 센터</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{data.unreadNotifications ?? 0}</p>
          <p className="mt-1 text-sm text-slate-500">새 알림</p>
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="vs-interactive">
          <CardHeader>
            <CardTitle>최근 사건</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">최근 사건 목록을 확인하려면 사건 메뉴로 이동하세요.</p>
            <Link href="/cases" className="mt-2 inline-flex text-sm font-medium text-sky-600">사건 보기 →</Link>
          </CardContent>
        </Card>
        <Card className="vs-interactive">
          <CardHeader>
            <CardTitle>오늘 일정</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">오늘의 처리 우선 일정을 확인하려면 일정 메뉴를 사용하세요.</p>
            <Link href="/calendar" className="mt-2 inline-flex text-sm font-medium text-sky-600">일정 보기 →</Link>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
