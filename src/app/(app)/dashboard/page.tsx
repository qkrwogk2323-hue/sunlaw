import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { getDefaultAppRoute, getEffectiveOrganizationId, hasActivePlatformAdminView, isManagementRole, requireAuthenticatedUser } from '@/lib/auth';
import { buildDashboardAiOverview } from '@/lib/ai/dashboard-home';
import { DashboardBillingSummary } from '@/components/dashboard-billing-summary';
import { DashboardHubClient } from '@/components/dashboard-hub-client';
import { DashboardHubOverview } from '@/components/dashboard-hub-overview';
import { getDashboardInitialSnapshotForAuth } from '@/lib/queries/dashboard';
import { getCaseHubList } from '@/lib/queries/case-hubs';
import { getOverdueCountsByCaseIds } from '@/lib/queries/billing';

export default async function DashboardPage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  if (getDefaultAppRoute(auth, organizationId) !== '/dashboard') {
    redirect(getDefaultAppRoute(auth, organizationId) as Route);
  }
  // 대시보드 초기 데이터 + 허브 모음 뷰용 참여 허브 목록을 병렬 조회.
  const [data, hubList, isPlatformAdmin] = await Promise.all([
    getDashboardInitialSnapshotForAuth(auth, organizationId),
    organizationId ? getCaseHubList(organizationId, 8) : Promise.resolve([]),
    hasActivePlatformAdminView(auth, organizationId),
  ]);
  // 허브 모음 뷰의 "미납 N" 수치 원천. hubList가 비면 쿼리 생략.
  const overdueMap = hubList.length
    ? await getOverdueCountsByCaseIds(hubList.map((h) => h.caseId).filter(Boolean))
    : {};
  const currentMembership = auth.memberships.find((membership) => membership.organization_id === organizationId) ?? null;
  const roleLabel = isPlatformAdmin
    ? '플랫폼 관리자'
    : isManagementRole(currentMembership?.role)
    ? '조직 관리자'
    : '조직 구성원';
  const initialAiOverview = buildDashboardAiOverview({
    organizationId,
    snapshot: data,
    isPlatformAdmin,
    roleLabel
  });

  const overdueTotal = Object.values(overdueMap).reduce((sum, n) => sum + n, 0);

  return (
    <div className="space-y-5">
      {/* 상단: 참여 허브 모음 뷰 (사건별 한 줄 요약) — 리뷰어 지시 대로 "현관" 역할. */}
      <DashboardHubOverview hubs={hubList} overdueMap={overdueMap} />
      {/* 중간: 조직 전체 비용 긴급성 한 줄 — /billing(리포트)로 drill-down. 둘 다 0이면 숨김. */}
      <DashboardBillingSummary
        pendingBillingCount={data.pendingBillingCount}
        overdueTotal={overdueTotal}
      />
      {/* 하단: 기존 대시보드 카드 조합 (알림·일정·메시지·팀 등 cross-cutting). */}
      <DashboardHubClient
        organizationId={organizationId}
        currentUserId={auth.user.id}
        data={data}
        isPlatformAdmin={isPlatformAdmin}
        initialAiOverview={initialAiOverview}
      />
    </div>
  );
}
