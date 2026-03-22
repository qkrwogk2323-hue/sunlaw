import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { CredentialLoginForm } from '@/components/forms/credential-login-form';
import { LoginButton } from '@/components/login-button';
import { InlineErrorMessage } from '@/components/ui/inline-error';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentAuth } from '@/lib/auth';
import { getAuthenticatedHomePath } from '@/lib/client-account';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const auth = await getCurrentAuth();
  if (auth) {
    redirect(getAuthenticatedHomePath(auth));
  }

  const resolved = searchParams ? await searchParams : undefined;
  const error = resolved?.error;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16">
      <Card className="w-full max-w-6xl rounded-[2rem] border-white/10 bg-white/95">
        <CardHeader className="space-y-3 border-none pb-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-sky-600">Vein Spiral</span>
          <CardTitle className="text-3xl text-slate-950">로그인</CardTitle>
          <p className="max-w-2xl text-sm leading-7 text-slate-600">
            사용 중인 계정 방식에 맞게 로그인해 주세요. 로그인 후 역할에 따라 의뢰인 홈, 조직 업무 화면 또는 운영 화면으로 연결됩니다.
          </p>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          {error ? (
            <InlineErrorMessage
              title="로그인을 진행할 수 없습니다."
              cause={error}
              resolution="안내된 내용을 확인한 뒤 다시 로그인해 주세요. 문제가 반복되면 고객센터로 문의해 주세요."
              className="lg:col-span-2"
            />
          ) : null}
          <div className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-900">일반 로그인</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                이메일 계정 또는 조직에서 안내받은 임시 아이디로 로그인할 수 있습니다.
              </p>
            </div>
            <CredentialLoginForm />
          </div>
          <div className="space-y-4">
            <div className="space-y-4 rounded-[2rem] border border-sky-100 bg-[linear-gradient(180deg,#f7fbff,#eef6ff)] p-6">
              <div>
                <p className="text-sm font-semibold text-sky-700">카카오 로그인</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  카카오 계정으로 빠르게 시작합니다. 처음 로그인한 경우에는 가입 또는 연결 절차로 이어질 수 있습니다.
                </p>
              </div>
              <LoginButton />
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold text-slate-900">처음 이용하시나요?</p>
              <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
                <div>
                  <Link href={'/start/signup' as Route} className="font-semibold text-sky-700 hover:text-sky-800">
                    일반 회원가입
                  </Link>
                  <p>개인 계정을 먼저 만든 뒤 의뢰인 가입 또는 조직 신청으로 이어집니다.</p>
                </div>
                <div>
                  <Link href={'/organization-request' as Route} className="font-semibold text-sky-700 hover:text-sky-800">
                    조직 개설 신청
                  </Link>
                  <p>새 조직을 등록하려는 경우 조직 개설 신청으로 바로 이동합니다.</p>
                </div>
                <div>
                  <Link href={'/support' as Route} className="font-semibold text-sky-700 hover:text-sky-800">
                    도움이 필요하신가요?
                  </Link>
                  <p>로그인 방식이 헷갈리거나 계정 연결이 어려우면 안내를 확인해 주세요.</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
