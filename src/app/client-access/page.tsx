import Link from 'next/link';
import type { Route } from 'next';
import { ArrowRight, Building2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonStyles } from '@/components/ui/button';
import { getCurrentAuth } from '@/lib/auth';
import { clientAccountStatusLabel, isClientAccountPending } from '@/lib/client-account';
import { ClientAccessRequestForm } from '@/components/forms/client-access-request-form';
import { InvitationCodeEntryForm } from '@/components/forms/invitation-code-entry-form';
import { searchPublicOrganizations, listMyClientAccessRequests } from '@/lib/queries/client-access';
import { Badge } from '@/components/ui/badge';

function kindLabel(kind: string | null | undefined) {
  if (kind === 'law_firm') return '법률 조직';
  if (kind === 'collection_company') return '추심 조직';
  if (kind === 'mixed_practice') return '복합 운영 조직';
  return '일반 조직';
}

function requestStatusLabel(status: string) {
  if (status === 'approved') return '승인 완료';
  if (status === 'rejected') return '반려됨';
  return '검토 대기';
}

export default async function ClientAccessPage({ searchParams }: { searchParams?: Promise<{ q?: string; error?: string }> }) {
  const resolved = searchParams ? await searchParams : undefined;
  const query = resolved?.q?.trim() ?? '';
  const error = resolved?.error;
  const auth = await getCurrentAuth();
  const [visibleOrganizations, myRequests] = await Promise.all([
    searchPublicOrganizations(query),
    auth ? listMyClientAccessRequests() : Promise.resolve([])
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="space-y-8">
        <div className="vs-brand-panel rounded-[2rem] p-8 text-white shadow-[0_28px_60px_rgba(8,47,73,0.28)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/72">조직 연결 요청</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">초대번호가 있으면 바로 입력하고, 없으면 조직가입신청으로 이어집니다.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-200/88">
            사건 허브로 바로 연결되려면 조직에서 전달한 초대번호 또는 초대 링크가 필요합니다. 아직 초대번호가 없다면 조직명 또는 조직 키로 조직가입신청을 보내고 승인 결과를 기다릴 수 있습니다.
          </p>
          {auth?.profile.is_client_account ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-sky-100">
              현재 상태: {clientAccountStatusLabel(auth.profile.client_account_status)}
            </div>
          ) : null}
        </div>

        {error ? (
          <Card className="rounded-[1.8rem] border-rose-200 bg-rose-50">
            <CardContent className="px-6 py-4 text-sm leading-7 text-rose-700">{error}</CardContent>
          </Card>
        ) : null}

        {auth && !auth.profile.is_client_account ? (
          <Card className="rounded-[1.8rem] border-amber-200 bg-amber-50">
            <CardHeader className="border-none pb-2">
              <CardTitle className="text-2xl">먼저 의뢰인 가입을 완료해 주세요.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-amber-900">조직 연결 요청은 의뢰인 가입 정보가 등록된 계정만 보낼 수 있습니다. 이름, 주민등록번호, 연락처와 필수 동의 등록 후 다시 시도해 주세요.</p>
              <Link href={'/start/signup?flow=client' as Route} className={buttonStyles({ className: 'min-h-12 rounded-[1.25rem] px-4' })}>
                의뢰인 가입으로 돌아가기
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {auth?.profile.is_client_account && isClientAccountPending(auth.profile) ? (
          <Card className="rounded-[1.8rem] border-sky-200 bg-sky-50">
            <CardHeader className="border-none pb-2">
              <CardTitle className="text-2xl">현재 단계에서 필요한 행동</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-sky-900">
              <p>1. 초대번호가 있다면 먼저 입력해서 바로 연결을 시도합니다.</p>
              <p>2. 초대번호가 없다면 아래에서 조직을 검색하고 조직가입신청을 보냅니다.</p>
              <p>3. 승인 결과는 대기 상태 화면과 알림에서 확인합니다.</p>
              <Link href={'/start/pending' as Route} className={buttonStyles({ variant: 'secondary', className: 'min-h-12 rounded-[1.25rem] px-4' })}>
                대기 상태 화면으로 이동
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {auth?.profile.is_client_account ? (
          <InvitationCodeEntryForm
            title="초대번호를 먼저 입력하세요"
            description="조직에서 받은 초대번호나 초대 링크가 있다면 여기서 바로 입력하세요. 초대번호가 없을 때만 아래 조직가입신청하기를 이용하면 됩니다."
            submitLabel="초대번호 확인하고 계속하기"
          />
        ) : null}

        <Card className="rounded-[1.8rem]">
          <CardHeader className="border-none pb-2">
            <CardTitle className="text-2xl">초대번호가 없으면 조직가입신청하기</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <label className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 shadow-inner">
                <Search className="size-4 text-slate-400" />
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="조직명 또는 조직 키를 입력해 주세요"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>
              <button type="submit" className={buttonStyles({ className: 'min-h-12 rounded-[1.25rem] px-5' })}>
                검색하기
              </button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {visibleOrganizations.length ? (
            visibleOrganizations.map((organization: any) => (
              <Card key={organization.id} className="vs-interactive rounded-[1.6rem]">
                <CardHeader className="border-none pb-2">
                  <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <Building2 className="size-5" />
                  </div>
                  <CardTitle className="mt-4 text-xl">{organization.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-600">{kindLabel(organization.kind)}</p>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">조직 키</p>
                    <p className="mt-2 font-medium text-slate-900">{organization.slug ?? '키 준비 중'}</p>
                  </div>
                  {auth ? (
                    <ClientAccessRequestForm
                      organizationId={organization.id}
                      organizationKey={organization.slug}
                      disabled={!auth.profile.is_client_account || myRequests.some((request: any) => request.target_organization_id === organization.id && request.status === 'pending')}
                      disabledLabel={!auth.profile.is_client_account ? '먼저 의뢰인 가입을 완료해 주세요.' : '이미 이 조직에 보낸 요청이 검토 중입니다.'}
                    />
                  ) : (
                    <Link href="/login" className={buttonStyles({ variant: 'secondary', className: 'min-h-12 w-full justify-between rounded-[1.2rem] px-4' })}>
                      로그인 후 연결 요청 준비
                      <ArrowRight className="size-4" />
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="lg:col-span-2 xl:col-span-3 rounded-[1.6rem] border-dashed">
              <CardContent className="py-12 text-center">
                <p className="text-base font-medium text-slate-900">검색된 조직이 없습니다.</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  조직명 또는 조직 키를 다시 확인해 주세요. 찾는 조직이 없다면 담당자에게 조직 키를 문의해 주세요.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {auth ? (
          <Card className="rounded-[1.8rem]">
            <CardHeader><CardTitle>내 조직가입신청 현황</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {myRequests.length ? myRequests.map((request: any) => (
                <div key={request.id} className="rounded-2xl border border-slate-200 bg-white/85 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{request.organization?.name ?? '조직'}</p>
                      <p className="mt-1 text-sm text-slate-500">조직 키: {request.target_organization_key}</p>
                    </div>
                    <Badge tone={request.status === 'approved' ? 'green' : request.status === 'rejected' ? 'red' : 'amber'}>{requestStatusLabel(request.status)}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{request.request_note ?? '남긴 메모가 없습니다.'}</p>
                  <p className="mt-2 text-xs text-slate-400">검토 메모: {request.review_note ?? '-'}</p>
                  {request.status === 'approved' ? <p className="mt-2 text-xs font-medium text-emerald-700">조직 승인 완료. 이제 담당자가 사건 연결을 진행하면 포털에서 바로 확인할 수 있습니다.</p> : null}
                </div>
              )) : <p className="text-sm text-slate-500">아직 보낸 조직가입신청이 없습니다.</p>}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}