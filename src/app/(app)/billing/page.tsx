import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { getEffectiveOrganizationId, isPlatformOperator, requireAuthenticatedUser } from '@/lib/auth';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { getBillingHubSnapshot } from '@/lib/queries/billing';
import { getOrganizationSubscriptionSnapshot } from '@/lib/subscription-lock';
import { updateOrganizationSubscriptionStateAction } from '@/lib/actions/billing-actions';

function badgeTone(status: string) {
  if (status === 'overdue') return 'red';
  if (status === 'upcoming') return 'amber';
  if (status === 'issued' || status === 'partial') return 'blue';
  if (status === 'draft') return 'slate';
  return 'green';
}

export default async function BillingPage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const canAdjustSubscription = isPlatformOperator(auth);
  const [billing, subscriptionSnapshot] = await Promise.all([
    getBillingHubSnapshot(organizationId),
    getOrganizationSubscriptionSnapshot(organizationId)
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">비용 관련</h1>
          <p className="mt-2 text-sm text-slate-600">어떤 의뢰인에게 얼마를 청구하기로 했고 언제까지 확인해야 하는지, 약정과 입금까지 한 화면에서 봅니다.</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          사건 Billing 탭에서 항목이나 약정을 등록하면 대시보드, 알림, 일정 확인에 자동 반영됩니다.
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">1단계</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">사건에서 등록</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">사건 Billing 탭이나 허브에서 비용 항목과 약정을 등록하면 여기에 자동 반영됩니다.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">2단계</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">기한과 연체 확인</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">열린 비용 항목과 연체 상태를 보고 다음 확인 대상부터 우선순위를 잡습니다.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">3단계</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">계약과 분리 확인</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">비용 약정은 계약 관리에서, 청구 상태와 입금은 비용 관리에서 각각 검토합니다.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">4단계</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">일정·알림으로 이어짐</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">기한이 있거나 확인이 필요한 항목은 일정과 알림센터에서 같은 사건 흐름으로 다시 확인합니다.</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href="/contracts" className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
          계약 관리 보기
        </Link>
        <Link href="/calendar" className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
          일정 확인
        </Link>
        <Link href="/notifications" className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
          알림센터 보기
        </Link>
      </div>

      <Card className="border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fbff)]">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>구독 상태</CardTitle>
              <p className="mt-1 text-sm text-slate-500">7일 무료, 연체, 소프트 잠금, 하드 잠금 전환을 이 카드에서 확인합니다.</p>
            </div>
            <Badge tone={
              subscriptionSnapshot?.state === 'locked_hard' ? 'red'
                : subscriptionSnapshot?.state === 'locked_soft' ? 'red'
                : subscriptionSnapshot?.state === 'past_due' ? 'amber'
                : subscriptionSnapshot?.state === 'cancelled' ? 'slate'
                : subscriptionSnapshot?.state === 'trialing' ? 'blue'
                : 'green'
            }>
              {subscriptionSnapshot?.state ?? 'active'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">플랜</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{subscriptionSnapshot?.planCode ?? 'starter'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">체험 종료</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{formatDate(subscriptionSnapshot?.trialEndAt ?? null)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">다음 갱신</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{formatDate(subscriptionSnapshot?.renewalDueAt ?? null)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">잠금 사유</p>
            <p className="mt-2 text-sm font-medium text-slate-700">{subscriptionSnapshot?.lockReason ?? '정상 이용 중'}</p>
          </div>
        </CardContent>
      </Card>

      {canAdjustSubscription && organizationId ? (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>구독 상태 조정</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientActionForm
              action={updateOrganizationSubscriptionStateAction}
              successTitle="구독 상태를 반영했습니다."
              errorTitle="구독 상태 변경에 실패했습니다."
              errorCause="조직 구독 상태를 저장하는 중 서버 응답이 실패했습니다."
              errorResolution="입력값을 확인한 뒤 다시 시도해 주세요."
              className="space-y-4"
            >
              <input type="hidden" name="organizationId" value={organizationId} />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">상태</span>
                  <select name="state" defaultValue={subscriptionSnapshot?.state ?? 'active'} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
                    <option value="trialing">trialing</option>
                    <option value="active">active</option>
                    <option value="past_due">past_due</option>
                    <option value="locked_soft">locked_soft</option>
                    <option value="locked_hard">locked_hard</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">플랜 코드</span>
                  <input name="planCode" defaultValue={subscriptionSnapshot?.planCode ?? 'starter'} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">체험 종료</span>
                  <input type="datetime-local" name="trialEndAt" defaultValue={subscriptionSnapshot?.trialEndAt ? subscriptionSnapshot.trialEndAt.slice(0, 16) : ''} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">다음 갱신</span>
                  <input type="datetime-local" name="renewalDueAt" defaultValue={subscriptionSnapshot?.renewalDueAt ? subscriptionSnapshot.renewalDueAt.slice(0, 16) : ''} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">연체 시작</span>
                  <input type="datetime-local" name="pastDueStartedAt" defaultValue={subscriptionSnapshot?.pastDueStartedAt ? subscriptionSnapshot.pastDueStartedAt.slice(0, 16) : ''} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">소프트 잠금</span>
                  <input type="datetime-local" name="lockedSoftAt" defaultValue={subscriptionSnapshot?.lockedSoftAt ? subscriptionSnapshot.lockedSoftAt.slice(0, 16) : ''} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">하드 잠금</span>
                  <input type="datetime-local" name="lockedHardAt" defaultValue={subscriptionSnapshot?.lockedHardAt ? subscriptionSnapshot.lockedHardAt.slice(0, 16) : ''} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">취소 시각</span>
                  <input type="datetime-local" name="cancelledAt" defaultValue={subscriptionSnapshot?.cancelledAt ? subscriptionSnapshot.cancelledAt.slice(0, 16) : ''} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                </label>
              </div>

              <label className="block space-y-2 text-sm text-slate-600">
                <span className="font-medium text-slate-800">잠금 사유</span>
                <textarea name="lockReason" defaultValue={subscriptionSnapshot?.lockReason ?? ''} rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900" />
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="exportAllowedWhenCancelled" defaultChecked={subscriptionSnapshot?.exportAllowedWhenCancelled ?? false} className="h-4 w-4 rounded border-slate-300" />
                cancelled 상태에서 내보내기 허용
              </label>

              <div className="flex justify-end">
                <SubmitButton variant="secondary" pendingLabel="반영 중..." className="px-5">
                  구독 상태 저장
                </SubmitButton>
              </div>
            </ClientActionForm>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">열린 비용 항목</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold text-slate-900">{billing.summary.openEntryCount}</p></CardContent>
        </Card>
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">연체 확인 필요</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold text-red-600">{billing.summary.overdueEntryCount}</p></CardContent>
        </Card>
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">활성 비용 약정</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold text-slate-900">{billing.summary.activeAgreementCount}</p></CardContent>
        </Card>
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">이번 달 예정 금액</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-slate-900">{formatCurrency(billing.summary.expectedThisMonth)}</p></CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle>청구 예정과 비용 확인</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {billing.entries.length ? billing.entries.map((entry: any) => (
              <Link key={entry.id} href={`/cases/${entry.case_id}?tab=billing`} className="block rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:border-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{entry.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{entry.cases?.title ?? '사건'} · {entry.targetLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={badgeTone(entry.status)}>{entry.status}</Badge>
                    <Badge tone={badgeTone(entry.dueStatus)}>{entry.dueStatus === 'overdue' ? '연체' : entry.dueStatus === 'upcoming' ? '예정' : '미지정'}</Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                  <p>공급가액 {formatCurrency(entry.amount)}</p>
                  <p>세액 {formatCurrency(entry.tax_amount)}</p>
                  <p>기한 {formatDate(entry.due_on)}</p>
                </div>
                {entry.notes ? <p className="mt-3 text-sm leading-7 text-slate-600">{entry.notes}</p> : null}
              </Link>
            )) : <p className="text-sm text-slate-500">열린 비용 항목이 없습니다.</p>}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="vs-mesh-card">
            <CardHeader><CardTitle>비용 약정</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {billing.agreements.length ? billing.agreements.map((agreement: any) => (
                <Link key={agreement.id} href={`/cases/${agreement.case_id}?tab=billing`} className="block rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:border-slate-900">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{agreement.title}</p>
                    <Badge tone={agreement.is_active ? 'green' : 'slate'}>{agreement.agreement_type}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{agreement.cases?.title ?? '사건'} · {agreement.targetLabel}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {agreement.fixed_amount != null ? `고정금액 ${formatCurrency(agreement.fixed_amount)}` : '고정금액 없음'}
                    {agreement.rate != null ? ` · 비율 ${agreement.rate}%` : ''}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">적용 {formatDate(agreement.effective_from)} ~ {formatDate(agreement.effective_to)}</p>
                </Link>
              )) : <p className="text-sm text-slate-500">등록된 비용 약정이 없습니다.</p>}
            </CardContent>
          </Card>

          <Card className="vs-mesh-card">
            <CardHeader><CardTitle>최근 입금 기록</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {billing.payments.length ? billing.payments.map((payment: any) => (
                <Link key={payment.id} href={`/cases/${payment.case_id}?tab=billing`} className="block rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:border-slate-900">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{formatCurrency(payment.amount)}</p>
                    <Badge tone="green">{payment.payment_status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{payment.cases?.title ?? '사건'} · {payment.payment_method}</p>
                  <p className="mt-2 text-xs text-slate-400">{formatDateTime(payment.received_at)}</p>
                </Link>
              )) : <p className="text-sm text-slate-500">최근 입금 기록이 없습니다.</p>}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
