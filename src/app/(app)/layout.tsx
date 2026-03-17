import type { ReactNode } from 'react';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { getActiveViewMode, requireAuthenticatedUser, getEffectiveOrganizationId } from '@/lib/auth';
import { hasCompletedLegalName, isClientAccountActive, isClientAccountPending } from '@/lib/client-account';
import { getDashboardSnapshot } from '@/lib/queries/dashboard';
import { ModeAwareNav } from '@/components/mode-aware-nav';
import { BrandBanner } from '@/components/brand-banner';
import { PageBackButton } from '@/components/page-back-button';
import { buttonStyles } from '@/components/ui/button';
import { signOutAction } from '@/lib/actions/auth-actions';
import { readSupportSessionCookie } from '@/lib/support-cookie';
import { EndSupportSessionForm } from '@/components/end-support-session-form';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const auth = await requireAuthenticatedUser();
  const activeViewMode = await getActiveViewMode();
  const initialMode = activeViewMode === 'platform_admin'
    || activeViewMode === 'law_admin'
    || activeViewMode === 'collection_admin'
    || activeViewMode === 'other_admin'
    || activeViewMode === 'organization_staff'
    || activeViewMode === 'client_communication'
    ? activeViewMode
    : null;

  if (!hasCompletedLegalName(auth.profile)) {
    redirect('/start/profile-name' as Route);
  }

  if (isClientAccountPending(auth.profile)) {
    redirect('/start/pending' as Route);
  }

  if (isClientAccountActive(auth.profile)) {
    redirect('/portal' as Route);
  }

  const supportSession = await readSupportSessionCookie();
  const currentOrganizationId = getEffectiveOrganizationId(auth);
  const dashboard = await getDashboardSnapshot(currentOrganizationId);
  const platformOrganizations = auth.profile.platform_role === 'platform_admin'
    ? ((await createSupabaseAdminClient()
      .from('organizations')
      .select('id, name, slug, kind, enabled_modules')
      .neq('lifecycle_status', 'soft_deleted')
      .order('name', { ascending: true })).data ?? [])
    : [];
  const platformScenarioOrganizations = platformOrganizations.filter((organization) => organization.name?.includes('(가상조직)'));

  if (!auth.memberships.length && auth.profile.platform_role !== 'platform_admin') {
    redirect('/start/signup' as Route);
  }

  return (
    <div className="vs-shell min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6">
        <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
          <ModeAwareNav
            memberships={auth.memberships}
            profile={auth.profile}
            platformOrganizations={platformScenarioOrganizations}
            initialMode={initialMode}
          />

          <form action={signOutAction}>
            <button className={buttonStyles({ variant: 'secondary', className: 'w-full justify-center gap-2' })}>
              <LogOut className="size-4" /> 로그아웃
            </button>
          </form>
        </aside>

        <main className="space-y-6">
          <div className="flex justify-center">
            <BrandBanner href="/dashboard" className="mx-auto max-w-5xl" theme="light" />
          </div>
          <PageBackButton
            fallbackHref="/dashboard"
            topLevelRoutes={['/dashboard', '/inbox', '/cases', '/clients', '/organizations', '/collections', '/documents', '/notifications', '/calendar', '/reports', '/settings']}
          />
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
          {children}
        </main>
      </div>
    </div>
  );
}
