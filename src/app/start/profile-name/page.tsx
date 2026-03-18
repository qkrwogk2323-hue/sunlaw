import type { Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { completeLegalNameAction } from '@/lib/actions/profile-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonStyles } from '@/components/ui/button';
import { getCurrentAuth } from '@/lib/auth';
import { getAuthenticatedHomePath, hasCompletedLegalName } from '@/lib/client-account';

export const dynamic = 'force-dynamic';

export default async function ProfileNamePage() {
  const auth = await getCurrentAuth();

  if (!auth) {
    redirect('/login');
  }

  if (hasCompletedLegalName(auth.profile)) {
    redirect(getAuthenticatedHomePath(auth));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16">
      <Card className="w-full max-w-xl rounded-3xl border-white/10 bg-white/95">
        <CardHeader className="space-y-3 border-none">
          <span className="text-sm font-semibold uppercase tracking-wide text-sky-600">본인 확인</span>
          <CardTitle className="text-3xl">실명을 먼저 확인합니다</CardTitle>
          <p className="text-sm leading-7 text-slate-600">
            카카오 계정으로 가입했더라도 실제 업무와 승인 흐름에는 본인 실명이 필요합니다. 이후 화면에서는 이 이름을 기준으로 표시합니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <form action={completeLegalNameAction} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="legalName" className="text-sm font-medium text-slate-900">본인 실명</label>
              <input
                id="legalName"
                name="legalName"
                type="text"
                defaultValue={auth.profile.legal_name ?? ''}
                autoComplete="name"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                placeholder="예: 홍길동"
                required
              />
            </div>
            <button type="submit" className={buttonStyles({ className: 'min-h-12 w-full rounded-[1.25rem] px-4 text-base' })}>
              실명 저장하고 계속
            </button>
          </form>

          <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-500">
            실명은 승인, 지원 접속, 의뢰인 안내, 문서 결재 기록에 사용됩니다. 문제가 있으면 <Link href={'/login' as Route} className="font-medium text-sky-700">로그인 화면</Link>으로 돌아갈 수 있습니다.
          </div>
        </CardContent>
      </Card>
    </main>
  );
}