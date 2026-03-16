import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { MessageSquareText, Bell, LogOut, Sparkles, FolderOpen } from 'lucide-react';
import { requireAuthenticatedUser } from '@/lib/auth';
import { hasCompletedLegalName, isClientAccountActive, isClientAccountPending } from '@/lib/client-account';
import { signOutAction } from '@/lib/actions/auth-actions';
import { PageBackButton } from '@/components/page-back-button';
import { buttonStyles } from '@/components/ui/button';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const auth = await requireAuthenticatedUser();

  if (!hasCompletedLegalName(auth.profile)) {
    redirect('/start/profile-name' as Route);
  }

  if (isClientAccountPending(auth.profile)) {
    redirect('/start/pending' as Route);
  }

  if (!isClientAccountActive(auth.profile)) {
    redirect('/dashboard' as Route);
  }

  return (
    <div className="vs-shell min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-6">
        <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
          <div className="vs-brand-panel rounded-[1.6rem] p-5 text-white">
            <div className="flex items-center justify-between gap-2">
              <Link href="/portal" className="text-xl font-semibold tracking-tight">Vein Spiral 의뢰인 포털</Link>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-100"><Sparkles className="size-3" /> 열린 상태</span>
            </div>
            <p className="mt-2 text-sm text-slate-300">{auth.profile.full_name}</p>
            <p className="mt-4 text-sm text-slate-200/80">사건 진행, 문서, 요청, 알림을 의뢰인 시점에서 명확하게 확인할 수 있습니다.</p>
          </div>
          <nav className="rounded-[1.4rem] border border-slate-200/80 bg-white/88 p-3 shadow-[0_18px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <div className="space-y-2">
              <Link href="/portal" className="vs-interactive flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-3 text-sm font-medium text-slate-700 hover:border-sky-200 hover:bg-sky-50/70 hover:text-slate-900">
                <FolderOpen className="size-4 text-sky-700" /> 내 사건 보기
              </Link>
              <Link href="/portal" className="vs-interactive flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-3 text-sm font-medium text-slate-700 hover:border-sky-200 hover:bg-sky-50/70 hover:text-slate-900">
                <MessageSquareText className="size-4 text-sky-700" /> 사건 소통
              </Link>
              <Link href="/portal" className="vs-interactive flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-3 text-sm font-medium text-slate-700 hover:border-sky-200 hover:bg-sky-50/70 hover:text-slate-900">
                <Bell className="size-4 text-sky-700" /> 알림 확인
              </Link>
            </div>
          </nav>
          <form action={signOutAction}>
            <button className={buttonStyles({ variant: 'secondary', className: 'w-full justify-center gap-2' })}>
              <LogOut className="size-4" /> 로그아웃
            </button>
          </form>
        </aside>
        <main className="space-y-4">
          <PageBackButton fallbackHref="/portal" topLevelRoutes={['/portal']} />
          {children}
        </main>
      </div>
    </div>
  );
}
