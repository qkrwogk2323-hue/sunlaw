import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubmitButton } from '@/components/ui/submit-button';
import { acceptInvitationAction } from '@/lib/actions/organization-actions';
import { requireAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function InvitationAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  await requireAuthenticatedUser();
  const { token } = await params;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Card>
        <CardHeader><CardTitle>초대 수락</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p>이 초대 링크를 수락하면 조직 또는 사건 포털에 연결됩니다.</p>
          <form action={acceptInvitationAction.bind(null, token)}>
            <SubmitButton pendingLabel="연결 중...">초대 수락</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
