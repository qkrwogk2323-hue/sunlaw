import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { LoginButton } from '@/components/login-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentAuth } from '@/lib/auth';
import { getAuthenticatedHomePath } from '@/lib/client-account';

export default async function LoginPage() {
  const auth = await getCurrentAuth();
  if (auth) {
    redirect(getAuthenticatedHomePath(auth));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16">
      <Card className="w-full max-w-lg rounded-3xl border-white/10 bg-white/95">
        <CardHeader className="space-y-3 border-none">
          <span className="text-sm font-semibold uppercase tracking-wide text-sky-600">Vein Spiral</span>
          <CardTitle className="text-3xl">카카오로 로그인</CardTitle>
          <p className="text-sm leading-7 text-slate-600">
            로그인 후 역할에 따라 운영 화면, 조직 개설 신청 흐름 또는 의뢰인 포털로 이어집니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoginButton />
          <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-500">
            처음 이용하신다면 <Link href={'/start/signup' as Route} className="font-medium text-sky-700">회원가입하기</Link>에서 계정을 만든 뒤 의뢰인 가입 또는 조직 개설 신청으로 이어갈 수 있습니다.
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
