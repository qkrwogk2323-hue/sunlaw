import type { ReactNode } from 'react';
import type { Route } from 'next';
import { getDefaultAppRoute, getTopLevelAppRoutes, requireAuthenticatedUser } from '@/lib/auth';
import { NavBadgesAsync } from '@/components/nav-badges-async';
import { BrandBanner } from '@/components/brand-banner';
import { PageBackButton } from '@/components/page-back-button';
import { EndSupportSessionForm } from '@/components/end-support-session-form';
import { GlobalCommandPalette } from '@/components/global-command-palette';
import { enforceAppEntryPolicy } from '@/lib/app-entry-policy';

// auth/subscription은 쿠키 기반이므로 force-dynamic 불필요.
// navCounts는 NavBadgesAsync(Suspense)로 분리해 레이아웃 블로킹을 제거했음.
// audit-link-exempt: reason=전역 레이아웃 셸이라 개별 이력 버튼을 두지 않음; fallback=각 업무 페이지에서 기록 보기 버튼과 감사로그 링크를 제공함; expires=2026-06-30; approvedBy=codex

export default async function AppLayout({ children }: { children: ReactNode }) {
  const auth = await requireAuthenticatedUser();

  const { effectiveOrganizationId, supportSession, lockMessage } = await enforceAppEntryPolicy(auth);

  const defaultAppRoute = getDefaultAppRoute(auth, effectiveOrganizationId) as Route;

  return (
    <div className="vs-shell min-h-screen">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6">
        <aside className="space-y-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <NavBadgesAsync
            memberships={auth.memberships}
            profile={auth.profile}
          />
        </aside>

        <main className="space-y-6">
          <div className="flex justify-center">
            <BrandBanner href={defaultAppRoute} className="mx-auto max-w-5xl" theme="light" />
          </div>
          <PageBackButton fallbackHref={defaultAppRoute} topLevelRoutes={getTopLevelAppRoutes(auth, effectiveOrganizationId)} />
          {supportSession ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-800">관리자 지원 접속 진행 중</p>
                  <p className="mt-1 text-sm text-amber-700">
                    대상 사용자: {supportSession.targetName} · {supportSession.targetEmail} · 조직: {supportSession.organizationName}
                  </p>
                </div>
                <EndSupportSessionForm />
              </div>
            </div>
          ) : null}
          {lockMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">{lockMessage.title}</p>
              <p className="mt-1 text-sm text-red-700">{lockMessage.description}</p>
            </div>
          ) : null}
          {children}
          <GlobalCommandPalette />
        </main>
      </div>
    </div>
  );
}
