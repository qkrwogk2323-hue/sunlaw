import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubmitButton } from '@/components/ui/submit-button';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { acceptInvitationAction } from '@/lib/actions/organization-actions';
import { getCurrentAuth } from '@/lib/auth';
import { PLATFORM_REQUIRED_CONSENTS } from '@/lib/legal-documents';

export const dynamic = 'force-dynamic';

export default async function InvitationAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const auth = await getCurrentAuth();
  if (!auth) redirect('/login');

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Card>
        <CardHeader><CardTitle>초대 수락</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p>이 초대 링크를 수락하면 조직 또는 사건 포털에 연결됩니다. 연결 전에 필수 동의를 확인해 주세요.</p>
          <ClientActionForm
            action={acceptInvitationAction.bind(null, token)}
            successTitle="초대 수락 완료"
            successMessage="조직 또는 사건 포털에 연결되었습니다."
            errorTitle="초대 수락 실패"
            errorCause="초대 링크가 만료되었거나 이미 사용되었을 수 있습니다."
            errorResolution="담당자에게 새 초대 링크를 요청하거나, 초대받은 이메일 계정으로 다시 로그인해 주세요."
            className="space-y-4"
          >
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              {PLATFORM_REQUIRED_CONSENTS.map((item) => (
                <label key={item.key} className="flex items-start gap-3 rounded-2xl border border-white bg-white px-4 py-3">
                  <input type="checkbox" name={item.key} required className="mt-1 size-4 rounded border-slate-300" />
                  <span>
                    <span className="block font-medium text-slate-900">{item.label} <span className="text-rose-500">*</span></span>
                    <span className="block text-xs leading-6 text-slate-500">{item.description}</span>
                    <Link href={item.href as Route} className="mt-2 inline-block text-xs font-medium text-sky-700 underline underline-offset-4">자세히 보기</Link>
                  </span>
                </label>
              ))}
            </div>
            <SubmitButton pendingLabel="연결 중...">초대 수락</SubmitButton>
          </ClientActionForm>
        </CardContent>
      </Card>
    </main>
  );
}
