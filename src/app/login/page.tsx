import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { CredentialLoginForm } from '@/components/forms/credential-login-form';
import { LoginButton } from '@/components/login-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentAuth } from '@/lib/auth';
import { getAuthenticatedHomePath } from '@/lib/client-account';

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
      <Card className="w-full max-w-5xl rounded-3xl border-white/10 bg-white/95">
        <CardHeader className="space-y-3 border-none">
          <span className="text-sm font-semibold uppercase tracking-wide text-sky-600">Vein Spiral</span>
          <CardTitle className="text-3xl">로그인 방법 선택</CardTitle>
          <p className="text-sm leading-7 text-slate-600">
            카카오 로그인과 일반 로그인 모두 같은 시작 흐름으로 연결됩니다. 로그인 후 역할에 따라 의뢰인 가입, 조직 생성 신청 또는 운영 화면으로 이어집니다.
          </p>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700 lg:col-span-2">
              {error}
            </div>
          ) : null}
          <div className="space-y-4 rounded-3xl border border-sky-100 bg-[linear-gradient(180deg,#f7fbff,#eef6ff)] p-6">
            <div>
              <p className="text-sm font-semibold text-sky-700">카카오 로그인</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">카카오 계정으로 바로 시작합니다.</p>
            </div>
            <LoginButton />
          </div>
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-900">일반 로그인</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">이메일과 비밀번호로 로그인합니다.</p>
            </div>
            <CredentialLoginForm />
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-500 lg:col-span-2">
            처음 이용하신다면 <Link href={'/start/signup' as Route} className="font-medium text-sky-700">회원가입하기</Link>에서 카카오 또는 일반회원가입 중 원하는 방식으로 계정을 만든 뒤 의뢰인 가입 또는 조직 개설 신청으로 이어갈 수 있습니다.
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
