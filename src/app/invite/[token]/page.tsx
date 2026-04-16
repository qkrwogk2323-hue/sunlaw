import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubmitButton } from '@/components/ui/submit-button';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { acceptInvitationAction } from '@/lib/actions/organization-actions';
import { getCurrentAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/routes/registry';

export const dynamic = 'force-dynamic';

export default async function InvitationAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const auth = await getCurrentAuth();

  if (!auth) {
    redirect(ROUTES.LOGIN);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Card>
        <CardHeader><CardTitle>초대 수락</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p>이 초대 링크를 수락하면 조직 또는 사건 포털에 연결됩니다.</p>
          <ClientActionForm
            action={acceptInvitationAction.bind(null, token)}
            successTitle="초대 수락 완료"
            successMessage="조직 또는 사건 포털에 연결되었습니다."
            errorTitle="초대 수락 실패"
            errorCause="초대 링크가 만료되었거나 이미 사용되었습니다. 담당자에게 새 초대 링크를 요청해주세요."
          >
            <SubmitButton pendingLabel="연결 중...">초대 수락</SubmitButton>
          </ClientActionForm>
        </CardContent>
      </Card>
    </main>
  );
}
