import Link from 'next/link';
import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CollaborationHubLiveShell } from '@/components/collaboration-hub-live-shell';
import { CollaborationCaseShareForm } from '@/components/forms/collaboration-case-share-form';
import { CollaborationHubMessageForm } from '@/components/forms/collaboration-hub-message-form';
import { ClientDirectInviteForm } from '@/components/forms/client-direct-invite-form';
import { StaffDirectInviteForm } from '@/components/forms/staff-direct-invite-form';
import { CaseHubRoomPanel } from '@/components/case-hub-room-panel';
import { CaseHubAiAssistant } from '@/components/case-hub-ai-assistant';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { hasVerifiedHubPin } from '@/lib/hub-access';
import { isClientAccountActive } from '@/lib/client-account';
import { formatDateTime } from '@/lib/format';
import { getCollaborationHubDetail } from '@/lib/queries/collaboration-hubs';
import { getOrganizationWorkspaceSummary } from '@/lib/queries/organizations';
import { UnifiedListSearch } from '@/components/ui/unified-list-search';
import { Input } from '@/components/ui/input';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { HubPinGateForm } from '@/components/forms/hub-pin-gate-form';
import { updateCollaborationHubPinAction, verifyCollaborationHubPinAction } from '@/lib/actions/organization-actions';
import { ROUTES } from '@/lib/routes/registry';

export default async function CollaborationHubPage({
  params,
  searchParams
}: {
  params: Promise<{ hubId: string }>;
  searchParams?: Promise<{ q?: string; invite?: string; caseId?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const { hubId } = await params;
  const query = searchParams ? await searchParams : undefined;
  const searchQuery = `${query?.q ?? ''}`.trim();
  const selectedCaseId = `${query?.caseId ?? ''}`.trim();

  const [hub, workspace] = await Promise.all([
    getCollaborationHubDetail(hubId, organizationId, searchQuery),
    organizationId ? getOrganizationWorkspaceSummary(organizationId) : Promise.resolve(null)
  ]);

  if (!organizationId || isClientAccountActive(auth.profile)) {
    redirect('/portal' as Route);
  }

  if (!hub) {
    notFound();
  }

  const hasPinAccess = hub.accessPinEnabled ? await hasVerifiedHubPin('collaboration_hub', hub.id) : true;
  if (!hasPinAccess) {
    return (
      <HubPinGateForm
        action={verifyCollaborationHubPinAction}
        hubId={hub.id}
        organizationId={organizationId}
        title={hub.title}
        description="이 조직협업 허브는 비밀번호가 설정되어 있습니다. 현재 참여 중인 조직만 4자리 비밀번호를 입력해 입장할 수 있습니다."
      />
    );
  }

  const caseOptions = (workspace?.recentCases ?? []).map((item: any) => ({
    id: item.id,
    title: item.title,
    referenceNo: item.reference_no ?? null
  }));
  const roomCandidates = [
    ...(workspace?.members ?? []).map((member: any) => ({
      id: `member:${member.profile?.id ?? member.id}`,
      label: member.profile?.full_name ?? '구성원',
      subtitle: member.profile?.email ?? '',
      type: 'individual' as const
    })),
    {
      id: `org:${hub.currentOrganization?.id ?? 'current'}`,
      label: hub.currentOrganization?.name ?? '현재 조직',
      subtitle: '조직',
      type: 'organization' as const
    },
    {
      id: `org:${hub.partnerOrganization?.id ?? 'partner'}`,
      label: hub.partnerOrganization?.name ?? '협업 조직',
      subtitle: '조직',
      type: 'organization' as const
    }
  ];

  const clientInquiryMessages = hub.messages.filter((message) => message.body.includes('문의'));

  return (
    <CollaborationHubLiveShell hubId={hub.id} organizationId={organizationId}>
      <div className="space-y-6">
      <div className="vs-brand-panel overflow-hidden rounded-[1.8rem] p-6 text-white shadow-[0_24px_54px_rgba(8,47,73,0.26)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/80">사건허브</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{hub.title}</h1>
            <p className="mt-3 text-sm leading-7 text-slate-200/88">사건과 의뢰인, 참여 조직을 하나로 묶어 진행 현황과 대화를 동시에 관리합니다.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-sm text-emerald-100">현재 조직</p>
            <p className="mt-1 text-lg font-semibold text-white">{hub.currentOrganization?.name ?? '현재 조직'}</p>
            <p className="mt-1 text-xs text-slate-200">협업 조직: {hub.partnerOrganization?.name ?? '미지정'}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        {/* BUG-AUDIT: 감사로그 직접 이동 차단 - 일반 사용자가 플랫폼 관리자 감사로그에 접근하는 버그 */}
      </div>

      {query?.invite ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          생성된 초대 링크 토큰: <span className="font-mono">{query.invite}</span>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          <CaseHubRoomPanel
            initialOccupants={[
              {
                id: `org:${hub.currentOrganization?.id ?? 'current'}`,
                label: hub.currentOrganization?.name ?? '현재 조직',
                roleLabel: '조직관리자',
                type: 'organization',
                tone: 'green'
              },
              {
                id: `org:${hub.partnerOrganization?.id ?? 'partner'}`,
                label: hub.partnerOrganization?.name ?? '협업 조직',
                roleLabel: '이해관계인(기업)',
                type: 'organization',
                tone: 'blue'
              }
            ]}
            candidates={roomCandidates}
          />

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>사건허브 채팅</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">{hub.summary ?? '허브 대화를 통해 진행 현황을 공유하세요.'}</p>
                </div>
                <Badge tone="green">진행중</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-[34rem] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                {hub.messages.length ? hub.messages.map((message) => {
                  const mine = message.organizationId === organizationId;
                  const isCurrentOrg = message.organizationId === hub.currentOrganization?.id;
                  return (
                    <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm ${mine ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
                        <div className="flex flex-wrap items-center gap-2 text-xs opacity-80">
                          <span className={`inline-flex h-2.5 w-2.5 rounded-full ${isCurrentOrg ? 'bg-emerald-300' : 'bg-sky-400'}`} />
                          <span className="font-semibold">{message.organizationName}</span>
                          <span className="rounded-full border border-current/30 px-1.5 py-0.5 text-[10px]">{isCurrentOrg ? '베인' : '협업조직'}</span>
                          <span>{message.senderName}</span>
                          <span>{formatDateTime(message.createdAt)}</span>
                          {message.caseTitle ? <span>연결 사건: {message.caseTitle}</span> : null}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                        {message.uploadedDocument ? (
                          <div className={`mt-3 rounded-xl border px-3 py-3 text-sm ${mine ? 'border-white/20 bg-white/10 text-white' : 'border-slate-200 bg-slate-50 text-slate-800'}`}>
                            <p className="font-medium">{message.uploadedDocument.title}</p>
                            <p className={`mt-1 text-xs ${mine ? 'text-slate-200' : 'text-slate-500'}`}>
                              {message.uploadedDocument.fileName ?? '첨부 문서'}{message.uploadedDocument.fileSize ? ` · ${(message.uploadedDocument.fileSize / 1024 / 1024).toFixed(1)}MB` : ''}
                            </p>
                            <Link
                              href={`/api/documents/${message.uploadedDocument.id}/download` as Route}
                              className={`mt-3 inline-flex text-xs font-medium ${mine ? 'text-sky-200' : 'text-sky-700'}`}
                            >
                              업로드 문서 열기
                            </Link>
                          </div>
                        ) : null}
                        {message.caseId ? (
                          <Link href={`${ROUTES.CASES}/${message.caseId}` as Route} className={`mt-3 inline-flex text-xs font-medium ${mine ? 'text-sky-200' : 'text-sky-700'}`}>
                            사건 상세 열기
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  );
                }) : <p className="text-sm text-slate-500">아직 대화가 없습니다. 첫 메시지로 허브를 시작하세요.</p>}
              </div>

              <CollaborationHubMessageForm
                hubId={hub.id}
                organizationId={organizationId}
                cases={caseOptions}
                returnPath={`/inbox/${hub.id}`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>의뢰인 문의사항</CardTitle>
            </CardHeader>
            <CardContent>
              <details className="rounded-xl border border-slate-200 bg-white p-3" open={clientInquiryMessages.length > 0}>
                <summary className="cursor-pointer text-sm font-medium text-slate-900">
                  의뢰인 문의 ({clientInquiryMessages.length})
                </summary>
                <div className="mt-3 space-y-2">
                  {clientInquiryMessages.length ? clientInquiryMessages.map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <p className="text-xs text-slate-600">{item.senderName} · {formatDateTime(item.createdAt)}</p>
                      <p className="mt-1 text-sm text-slate-900">{item.body}</p>
                    </div>
                  )) : <p className="text-xs text-slate-500">현재 의뢰인 문의가 없습니다.</p>}
                </div>
              </details>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="space-y-3">
                <CardTitle>관련 사건 검색</CardTitle>
                <UnifiedListSearch
                  action={`/inbox/${hub.id}`}
                  defaultValue={searchQuery}
                  placeholder="사건명, 사건번호, 상태 검색"
                  ariaLabel="관련 사건 검색"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {hub.relatedCases.length ? hub.relatedCases.map((caseItem) => (
                <Link key={caseItem.id} href={`${ROUTES.CASES}/${caseItem.id}` as Route} className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-900 hover:bg-slate-50/70">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{caseItem.title}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="blue">{caseItem.caseStatus ?? '진행 중'}</Badge>
                      <Badge tone="slate">{caseItem.permissionScope}</Badge>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{caseItem.referenceNo ?? '사건번호 없음'} · {caseItem.updatedAt ? formatDateTime(caseItem.updatedAt) : '업데이트 정보 없음'}</p>
                  <p className="mt-1 text-xs text-slate-400">공유 조직: {caseItem.sharedByOrganizationName ?? '현재 조직'}{caseItem.note ? ` · ${caseItem.note}` : ''}</p>
                </Link>
              )) : <p className="text-sm text-slate-500">검색 조건에 맞는 사건이 없습니다.</p>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card id="case-register">
            <CardHeader>
              <CardTitle>사건허브 등록</CardTitle>
            </CardHeader>
            <CardContent>
              {caseOptions.length ? (
                <CollaborationCaseShareForm
                  hubId={hub.id}
                  organizationId={organizationId}
                  cases={caseOptions}
                  initialCaseId={selectedCaseId || null}
                  returnPath={`/inbox/${hub.id}`}
                />
              ) : (
                <p className="text-sm text-slate-500">공유할 수 있는 현재 조직 사건이 없습니다.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>허브 비밀번호</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-slate-600">참여 조직만 이 허브를 열 수 있도록 4자리 비밀번호를 설정합니다. 비워두면 잠금이 해제됩니다.</p>
              <ClientActionForm action={updateCollaborationHubPinAction} successTitle="비밀번호가 저장되었습니다." className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="hubId" value={hub.id} />
                <input type="hidden" name="organizationId" value={organizationId} />
                <div className="min-w-[12rem] flex-1">
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="collaboration-hub-pin">
                    4자리 비밀번호
                  </label>
                  <Input id="collaboration-hub-pin" name="pin" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="비워두면 해제" />
                </div>
                <SubmitButton variant="secondary" pendingLabel="저장 중..." className="h-10 rounded-xl px-4">비밀번호 저장</SubmitButton>
              </ClientActionForm>
            </CardContent>
          </Card>

          <CaseHubAiAssistant
            organizationId={organizationId}
            defaultCaseId={selectedCaseId || caseOptions[0]?.id}
            caseOptions={caseOptions.map((item) => ({ id: item.id, title: item.title }))}
          />

          <Card>
            <CardHeader>
              <CardTitle>담당자 초대</CardTitle>
            </CardHeader>
            <CardContent>
              <StaffDirectInviteForm organizationId={organizationId} returnPath={`/inbox/${hub.id}`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>의뢰인 초대</CardTitle>
            </CardHeader>
            <CardContent>
              {caseOptions.length ? (
                <ClientDirectInviteForm organizationId={organizationId} cases={caseOptions} returnPath={`/inbox/${hub.id}`} />
              ) : (
                <p className="text-sm text-slate-500">먼저 현재 조직에 연결된 사건이 있어야 의뢰인을 허브 흐름으로 초대할 수 있습니다.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>허브 운영 메모</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                이 허브는 상대 조직과 실시간 협업, 사건 참조, 의뢰인 초대 흐름을 한 곳에 묶는 공간입니다.
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                메시지에 사건을 연결하면 바로 사건 상세로 이동할 수 있고, 검색 결과에서도 상세 페이지를 열 수 있습니다.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      </div>
    </CollaborationHubLiveShell>
  );
}
