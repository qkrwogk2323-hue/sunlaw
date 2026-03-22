import type { ReactNode } from 'react';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { getDefaultAppRoute, getEffectiveOrganizationId, getTopLevelAppRoutes, isPlatformOperator, requireAuthenticatedUser } from '@/lib/auth';
import { hasCompletedLegalName, isClientAccountActive, isClientAccountPending } from '@/lib/client-account';
import { getNavUnreadCounts } from '@/lib/queries/notifications';
import { ModeAwareNav } from '@/components/mode-aware-nav';
import { BrandBanner } from '@/components/brand-banner';
import { PageBackButton } from '@/components/page-back-button';
import { buttonStyles } from '@/components/ui/button';
import { signOutAction } from '@/lib/actions/auth-actions';
import { readSupportSessionCookie } from '@/lib/support-cookie';
import { EndSupportSessionForm } from '@/components/end-support-session-form';
import { GlobalCommandPalette } from '@/components/global-command-palette';
import { FloatingExportWidget } from '@/components/floating-export-widget';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { enforceSubscriptionRouteAccess, getOrganizationSubscriptionSnapshot, getSubscriptionLockMessage } from '@/lib/subscription-lock';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const auth = await requireAuthenticatedUser();

  if (auth.profile.must_change_password) {
    redirect('/start/password-reset' as Route);
  }
  if (auth.profile.must_complete_profile) {
    redirect('/start/member-profile' as Route);
  }

  if (!hasCompletedLegalName(auth.profile)) {
    redirect('/start/profile-name' as Route);
  }

  if (isClientAccountPending(auth.profile)) {
    redirect('/start/pending' as Route);
  }

  if (isClientAccountActive(auth.profile)) {
    redirect('/portal' as Route);
  }

  const effectiveOrganizationId = getEffectiveOrganizationId(auth);
  const defaultAppRoute = getDefaultAppRoute(auth) as Route;

  const [supportSession, navCounts, subscriptionSnapshot] = await Promise.all([
    readSupportSessionCookie(),
    getNavUnreadCounts().catch(() => ({ unreadCount: 0, actionRequiredCount: 0, unreadConversationCount: 0 })),
    getOrganizationSubscriptionSnapshot(effectiveOrganizationId)
  ]);

  await enforceSubscriptionRouteAccess(subscriptionSnapshot);

  if (!auth.memberships.length && !isPlatformOperator(auth)) {
    redirect('/start/signup' as Route);
  }

  const lockMessage = getSubscriptionLockMessage(subscriptionSnapshot);

  return (
    <div className="vs-shell min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6">
        <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
          <ModeAwareNav
            memberships={auth.memberships}
            profile={auth.profile}
            unreadNotificationCount={navCounts.unreadCount}
            actionRequiredCount={navCounts.actionRequiredCount}
            unreadConversationCount={navCounts.unreadConversationCount}
          />

          <ClientActionForm action={signOutAction} successTitle="로그아웃되었습니다.">
            <SubmitButton variant="secondary" pendingLabel="로그아웃 중..." className={buttonStyles({ variant: 'secondary', className: 'w-full justify-center gap-2' })}>
              <LogOut className="size-4" /> 로그아웃
            </SubmitButton>
          </ClientActionForm>
        </aside>

        <main className="space-y-6">
          <div className="flex justify-center">
            <BrandBanner href={defaultAppRoute} className="mx-auto max-w-5xl" theme="light" />
          </div>
          <PageBackButton fallbackHref={defaultAppRoute} topLevelRoutes={getTopLevelAppRoutes(auth)} />
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
          <FloatingExportWidget />
          <GlobalCommandPalette />
        </main>
      </div>
    </div>
  );
}
