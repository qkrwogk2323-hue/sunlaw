import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAuthenticatedUser } from '@/lib/auth';
import { TemporaryPasswordResetForm } from '@/components/forms/temporary-password-reset-form';
import { getAuthenticatedHomePath } from '@/lib/client-account';

export default async function TemporaryPasswordResetPage() {
  const auth = await requireAuthenticatedUser();

  if (!auth.profile.must_change_password) {
    redirect(getAuthenticatedHomePath(auth));
  }

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-xl items-center px-6 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>임시 비밀번호 변경</CardTitle>
          <p className="text-sm text-slate-600">보안을 위해 첫 로그인 시 비밀번호를 반드시 변경해야 합니다.</p>
        </CardHeader>
        <CardContent>
          <TemporaryPasswordResetForm />
        </CardContent>
      </Card>
    </main>
  );
}
