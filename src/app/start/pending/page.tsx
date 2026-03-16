import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { ArrowRight, Headphones, Link2, ShieldCheck } from 'lucide-react';
import { requireAuthenticatedUser } from '@/lib/auth';
import { clientAccountStatusDescription, clientAccountStatusLabel, isClientAccountActive, isClientAccountPending } from '@/lib/client-account';
import { listMyClientServiceRequests } from '@/lib/queries/client-account';
import { listMyClientAccessRequests } from '@/lib/queries/client-access';
import { ClientServiceRequestForm } from '@/components/forms/client-service-request-form';
import { InvitationCodeEntryForm } from '@/components/forms/invitation-code-entry-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonStyles } from '@/components/ui/button';

function requestStatusLabel(status: string) {
  if (status === 'approved') return '승인 완료';
  if (status === 'rejected') return '반려됨';
  return '검토 대기';
}

export default async function ClientPendingPage({
  searchParams
}: {
  searchParams?: Promise<{ submitted?: string; help?: string }>;
}) {
  const auth = await requireAuthenticatedUser();

  if (!auth.profile.is_client_account) {
    redirect('/start/signup?flow=client');
  }

  if (isClientAccountActive(auth.profile)) {
    redirect('/portal');
  }

  if (!isClientAccountPending(auth.profile)) {
    redirect('/dashboard');
  }

  const resolved = searchParams ? await searchParams : undefined;
  const [requests, serviceRequests] = await Promise.all([
    listMyClientAccessRequests(),
    listMyClientServiceRequests()
  ]);
  const latestRequest = requests[0] ?? null;
  const status = auth.profile.client_account_status;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="space-y-8">
        <section className="vs-brand-panel rounded-[2.2rem] p-8 text-white shadow-[0_28px_60px_rgba(8,47,73,0.28)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/72">의뢰인 상태 안내</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">{clientAccountStatusLabel(status)}</h1>
              <p className="mt-4 text-sm leading-8 text-slate-200/88">{clientAccountStatusDescription(status)}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-sky-100/72">조직 연결 요청</p>
                <p className="mt-2 text-2xl font-semibold text-white">{requests.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-sky-100/72">고객센터 문의</p>
                <p className="mt-2 text-2xl font-semibold text-white">{serviceRequests.length}</p>
              </div>
            </div>
          </div>
        </section>

        {resolved?.submitted ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            본인정보 등록이 접수되었습니다. 이제 조직에서 받은 초대번호를 입력하거나, 아직 초대번호가 없다면 조직가입신청하기로 다음 단계를 이어가세요.
          </div>
        ) : null}

        {resolved?.help ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            고객센터 문의가 접수되었습니다. 처리 상태는 알림 또는 이 화면의 최근 문의 내역에서 확인할 수 있습니다.
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-[1.8rem] border-amber-200 bg-[linear-gradient(180deg,#fffdf5,#fff6dd)]">
            <CardHeader className="border-none pb-2">
              <CardTitle>다음에 해야 할 일</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-white px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <Link2 className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">먼저 초대번호를 입력하세요.</p>
                    <p className="mt-1 text-sm text-slate-600">사건 허브로 바로 연결되려면 조직에서 전달한 초대번호 또는 초대 링크가 필요합니다. 초대번호가 없으면 아래의 조직가입신청하기로 요청을 남길 수 있습니다.</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <InvitationCodeEntryForm
                    title="의뢰인용 초대번호 입력"
                    description="조직 담당자가 전달한 초대번호나 초대 링크를 입력하면 사건 허브 연결 초대 수락 화면으로 이동합니다."
                    submitLabel="초대번호 입력하고 계속하기"
                  />
                  <Link href={'/client-access' as Route} className={`${buttonStyles({ variant: 'secondary', className: 'w-full justify-between rounded-[1.2rem]' })}`}>
                    조직가입신청하기
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">승인 결과 확인</p>
                    <p className="mt-1 text-sm text-slate-600">승인이 완료되면 로그인 후 포털로 바로 들어가고, 반려되면 반려 사유와 다음 선택지를 확인할 수 있습니다.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <ClientServiceRequestForm
            organizationId={latestRequest?.target_organization_id ?? null}
            requestKind={status === 'pending_reapproval' ? 'reapproval_help' : 'status_help'}
            defaultTitle={status === 'pending_reapproval' ? '재승인 대기 상태 확인 요청' : '승인 대기 상태 확인 요청'}
            description={status === 'pending_reapproval' ? '연결 해제로 인해 다시 대기 상태가 된 경우, 가장 빠른 해결 경로를 안내받을 수 있습니다.' : '언제 승인 검토가 진행되는지, 어떤 정보가 더 필요한지 바로 문의할 수 있습니다.'}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>내 조직 연결 요청</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {requests.length ? requests.map((request: any) => (
                <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{request.organization?.name ?? '조직'}</p>
                      <p className="mt-1 text-sm text-slate-500">조직 키: {request.target_organization_key}</p>
                    </div>
                    <Badge tone={request.status === 'approved' ? 'green' : request.status === 'rejected' ? 'red' : 'amber'}>{requestStatusLabel(request.status)}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{request.request_note ?? '남긴 메모가 없습니다.'}</p>
                  <p className="mt-2 text-xs text-slate-400">검토 메모: {request.review_note ?? '-'}</p>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                  아직 보낸 조직가입신청 내역이 없습니다. 초대번호가 없다면 협업할 조직을 찾아 요청을 남겨 주세요.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>최근 문의 내역</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {serviceRequests.length ? serviceRequests.map((request: any) => (
                <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{request.title}</p>
                    <Badge tone={request.status === 'open' ? 'amber' : 'green'}>{request.status === 'open' ? '처리 대기' : '답변 완료'}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{request.body}</p>
                  {request.resolved_note ? <p className="mt-2 text-xs text-slate-500">답변 메모: {request.resolved_note}</p> : null}
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                  아직 고객센터 문의 내역이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}