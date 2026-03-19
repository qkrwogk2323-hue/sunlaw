import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubmitButton } from '@/components/ui/submit-button';
import { createClientSpecialNoteAction, linkRelatedClientAction } from '@/lib/actions/client-management-actions';
import { findMembership, getEffectiveOrganizationId, isManagementRole, requireAuthenticatedUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { hasPermission } from '@/lib/permissions';
import { getClientDetailSummary, listClientRosterSummary } from '@/lib/queries/clients';

export default async function ClientDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ clientKey: string }>;
  searchParams?: Promise<{ aiComment?: string }>;
}) {
  const { clientKey } = await params;
  if (searchParams) await searchParams;

  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  if (!organizationId) notFound();

  const membership = findMembership(auth, organizationId);
  const canManage = Boolean(
    membership
    && isManagementRole(membership.role)
    && hasPermission(auth, organizationId, 'user_manage')
  );

  const [detail, roster] = await Promise.all([
    getClientDetailSummary(organizationId, clientKey),
    listClientRosterSummary(organizationId)
  ]);
  if (!detail) notFound();
  const relationCandidates = roster
    .filter((item: any) => (item.clientKey ?? item.id) !== clientKey)
    .slice(0, 200);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{detail.name}</h1>
          <p className="mt-2 text-sm text-slate-600">의뢰인 기본정보와 누적 이력을 한 화면에서 관리합니다.</p>
        </div>
        <Link href="/clients" className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          의뢰인목록으로
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>기본정보</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <p className="text-sm text-slate-700">이름: <span className="font-medium text-slate-900">{detail.name}</span></p>
          <p className="text-sm text-slate-700">주민번호: <span className="font-medium text-slate-900">{detail.residentNumberMasked ?? '-'}</span></p>
          <p className="text-sm text-slate-700">주소: <span className="font-medium text-slate-900">{detail.addressSummary ?? '-'}</span></p>
          <p className="text-sm text-slate-700">연락처: <span className="font-medium text-slate-900">{detail.contactPhone ?? '-'}</span></p>
          <p className="text-sm text-slate-700 md:col-span-2">이메일: <span className="font-medium text-slate-900">{detail.email ?? '-'}</span></p>
          <p className="text-sm text-slate-700">연결 사건: <span className="font-medium text-slate-900">{detail.caseTitle ?? '미연결'}</span></p>
          <p className="text-sm text-slate-700">관계/지위: <span className="font-medium text-slate-900">{detail.relationLabel ?? '-'}</span></p>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Badge tone={detail.isPortalEnabled ? 'green' : 'amber'}>{detail.isPortalEnabled ? '포털 활성' : '포털 대기'}</Badge>
            {detail.tempLoginId ? <Badge tone="slate">임시아이디 {detail.tempLoginId}</Badge> : null}
            <Badge tone={detail.mustChangePassword ? 'amber' : 'green'}>{detail.mustChangePassword ? '초기 이행 필요' : '초기 이행 완료'}</Badge>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-6">
        <Card>
          <CardHeader><CardTitle>특이사항/요청/응답 누적 목록</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {detail.activities.length ? detail.activities.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <Badge tone="slate">{item.type}</Badge>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.body}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">누적된 이력이 없습니다.</p>}
          </CardContent>
        </Card>

        {canManage ? (
          <Card>
            <CardHeader><CardTitle>특이사항 추가</CardTitle></CardHeader>
            <CardContent>
              <form action={createClientSpecialNoteAction} className="space-y-3">
                <input type="hidden" name="organizationId" value={organizationId} />
                <input type="hidden" name="clientKey" value={clientKey} />
                <input type="hidden" name="returnPath" value={`/clients/${clientKey}`} />
                <select name="noteType" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
                  <option value="special">특이사항</option>
                  <option value="phone_window">전화 가능 시간대</option>
                  <option value="request">요청 메모</option>
                  <option value="response">응답 메모</option>
                  <option value="hub">허브 메모</option>
                </select>
                <textarea
                  name="noteBody"
                  rows={4}
                  placeholder="예: 평일 14시~17시 통화 가능, 문서 요청 시 카카오 우선"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  required
                />
                <SubmitButton pendingLabel="저장 중..." className="w-full justify-center">누적 목록에 추가</SubmitButton>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>관련인물</CardTitle>
              {canManage ? (
                <details className="group">
                  <summary className="list-none">
                    <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 group-open:bg-slate-100">
                      관련인 연동
                    </span>
                  </summary>
                  <form action={linkRelatedClientAction} className="mt-3 w-[20rem] max-w-full space-y-2 rounded-xl border border-slate-200 p-3">
                    <input type="hidden" name="organizationId" value={organizationId} />
                    <input type="hidden" name="clientKey" value={clientKey} />
                    <input type="hidden" name="returnPath" value={`/clients/${clientKey}`} />
                    <select name="targetClientKey" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" required>
                      <option value="">의뢰인 선택</option>
                      {relationCandidates.map((item: any) => (
                        <option key={item.clientKey ?? item.id} value={item.clientKey ?? item.id}>{item.name}</option>
                      ))}
                    </select>
                    <input
                      name="relation"
                      placeholder="관계 예: 가족, 친구, 소개인"
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                      required
                    />
                    <SubmitButton pendingLabel="연동 중..." className="w-full justify-center">저장</SubmitButton>
                  </form>
                </details>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.relatedPeople?.length ? detail.relatedPeople.map((person: any) => (
              <div key={person.id} className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">{person.targetName}</p>
                <p className="text-xs text-slate-600">관계: {person.relation}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(person.createdAt)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">연동된 관련인물이 없습니다.</p>}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
