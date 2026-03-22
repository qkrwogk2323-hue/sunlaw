import { UserCheck, Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAuthenticatedUser } from '@/lib/auth';
import { countActivePortalLinks } from '@/lib/queries/portal';
import { clientAccountStatusLabel } from '@/lib/client-account';

export const dynamic = 'force-dynamic';

export default async function PortalAccountPage() {
  const auth = await requireAuthenticatedUser();
  const activeLinksCount = await countActivePortalLinks();

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">계정 메뉴</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">내 정보 · 연결 상태</h1>
        <p className="text-sm leading-7 text-slate-600">현재 계정 상태와 포털 연결 상태를 확인합니다.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="vs-mesh-card">
          <CardHeader>
            <CardTitle>내 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="flex items-center gap-2 text-slate-900">
              <UserCheck className="size-4" />
              <span className="font-medium">{auth.profile.full_name}</span>
            </div>
            <p>이메일: {auth.profile.email}</p>
            <p>계정 상태: {clientAccountStatusLabel(auth.profile.client_account_status)}</p>
          </CardContent>
        </Card>

        <Card className="vs-mesh-card">
          <CardHeader>
            <CardTitle>포털 연결 상태</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="flex items-center gap-2 text-slate-900">
              <Link2 className="size-4" />
              <span className="font-medium">활성 연결 {activeLinksCount}건</span>
            </div>
            <p>활성 연결이 있어야 사건 진행, 요청, 청구 정보를 계속 확인할 수 있습니다.</p>
            <p>연결이 끊기면 승인 대기 상태로 전환될 수 있습니다.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
