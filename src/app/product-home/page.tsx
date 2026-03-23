import Link from 'next/link';
import type { Route } from 'next';
import { getEffectiveOrganizationId, hasPlatformViewForOrganization, requireAuthenticatedUser } from '@/lib/auth';
import { getOrganizationAdminMode } from '@/lib/organization-mode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardSnapshot } from '@/lib/queries/dashboard';

export const dynamic = 'force-dynamic';

export default async function ProductHomePage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth) ?? '';
  const isPlatformView = hasPlatformViewForOrganization(auth, organizationId);
  const currentMembership = auth.memberships.find((membership) => membership.organization_id === organizationId) ?? auth.memberships[0] ?? null;
  const currentOrganizationKind = currentMembership?.organization?.kind;
  const organizationMode = getOrganizationAdminMode(currentOrganizationKind);
  const data = isPlatformView ? null : await getDashboardSnapshot(organizationId);

  type StartCard = {
    href: Route;
    eyebrow: string;
    title: string;
    description: string;
    value?: number;
    suffix?: string;
  };

  const startCards: StartCard[] = isPlatformView
    ? [
        {
          href: '/product-home' as Route,
          eyebrow: '공통 시작',
          title: '운영 첫 화면',
          description: '플랫폼 운영에서 가장 먼저 확인할 시작 화면입니다.'
        },
        {
          href: '/admin/organization-requests' as Route,
          eyebrow: '조직 메뉴',
          title: '조직 신청 관리',
          description: '신규 조직 신청과 탈퇴 신청을 검토합니다.'
        },
        {
          href: '/admin/audit' as Route,
          eyebrow: '공통 기록',
          title: '감사 로그',
          description: '플랫폼에서 일어난 변경 기록을 추적합니다.'
        }
      ]
    : organizationMode === 'collection_admin'
      ? [
          {
            href: '/dashboard' as Route,
            eyebrow: '공통 시작',
            title: '대시보드',
            description: '오늘의 핵심 요약과 다음 액션을 먼저 확인합니다.',
            value: data?.activeCases ?? 0,
            suffix: '개'
          },
          {
            href: '/collections' as Route,
            eyebrow: '조직 메뉴',
            title: '신용정보 운영',
            description: '회수 활동과 미처리 요청을 이어서 봅니다.',
            value: data?.pendingRequests ?? 0,
            suffix: '건'
          },
          {
            href: '/notifications' as Route,
            eyebrow: '공통 확인',
            title: '알림 센터',
            description: '새 알림과 확인 대기 항목을 확인합니다.',
            value: data?.unreadNotifications ?? 0,
            suffix: '개'
          }
        ]
      : [
          {
            href: '/dashboard' as Route,
            eyebrow: '공통 시작',
            title: '대시보드',
            description: '오늘의 핵심 요약과 다음 액션을 먼저 확인합니다.',
            value: data?.activeCases ?? 0,
            suffix: '건'
          },
          {
            href: '/cases' as Route,
            eyebrow: '조직 메뉴',
            title: '사건 목록',
            description: '진행 중 사건과 후속 작업을 이어서 봅니다.',
            value: data?.activeCases ?? 0,
            suffix: '건'
          },
          {
            href: '/notifications' as Route,
            eyebrow: '공통 확인',
            title: '알림 센터',
            description: '새 알림과 확인 대기 항목을 확인합니다.',
            value: data?.unreadNotifications ?? 0,
            suffix: '개'
          }
        ];

  return (
    <main className="space-y-6">
      <div className="vs-brand-panel overflow-hidden rounded-[1.8rem] p-6 text-white shadow-[0_24px_54px_rgba(8,47,73,0.26)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-100/75">Vein Spiral</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">운영 첫 화면</h1>
        <p className="mt-3 text-sm leading-7 text-slate-200/88">지금 우선 처리해야 할 주요 업무를 빠르게 확인하고 바로 이동할 수 있도록 구성한 시작 화면입니다.</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        {startCards.map((card) => (
          <Link key={card.href} href={card.href} className="vs-interactive rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300">
            <p className="text-xs font-semibold uppercase text-slate-500">{card.eyebrow}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {typeof card.value === 'number' ? `${card.value}${card.suffix ?? ''}` : card.title}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800">{typeof card.value === 'number' ? card.title : null}</p>
            <p className="mt-1 text-sm text-slate-500">{card.description}</p>
          </Link>
        ))}
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
