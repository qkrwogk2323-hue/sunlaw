import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { SettingsNav } from '@/components/settings-nav';
import { getEffectiveOrganizationId, isPlatformOperator, requireAuthenticatedUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { updateOrganizationSubscriptionStateAction } from '@/lib/actions/billing-actions';
import { getOrganizationSubscriptionSnapshot } from '@/lib/subscription-lock';
import { AccessDeniedBlock } from '@/components/ui/access-denied-block';

type SearchParams = Promise<{ locked?: string }>;

function subscriptionTone(state: string | null | undefined) {
  if (state === 'locked_hard' || state === 'locked_soft') return 'red';
  if (state === 'past_due') return 'amber';
  if (state === 'trialing') return 'blue';
  if (state === 'cancelled') return 'slate';
  return 'green';
}

export default async function SubscriptionSettingsPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);

  if (!organizationId && !isPlatformOperator(auth)) {
    return (
      <AccessDeniedBlock
        blocked="구독 관리 화면 접근이 차단되었습니다."
        cause="현재 계정에 접근 가능한 조직 컨텍스트가 없습니다."
        resolution="조직 전환 후 다시 시도해 주세요."
      />
    );
  }

  const resolved = searchParams ? await searchParams : undefined;
  const canAdjustSubscription = isPlatformOperator(auth);
  const subscriptionSnapshot = await getOrganizationSubscriptionSnapshot(organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">구독 관리</h1>
        <p className="mt-2 text-sm text-slate-600">회사 관리 영역의 구독 상태, 잠금 사유, 갱신 일정을 관리합니다. 의뢰인 청구/분납 현황은 조직 메뉴의 비용 관리에서 다룹니다.</p>
      </div>

      <SettingsNav currentPath="/settings/subscription" />

      {resolved?.locked ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          구독 상태 때문에 일부 업무 화면 접근이 제한되었습니다. 이 페이지에서 현재 상태를 확인해 주세요.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">현재 상태</CardTitle></CardHeader>
          <CardContent>
            <Badge tone={subscriptionTone(subscriptionSnapshot?.state)}>{subscriptionSnapshot?.state ?? 'active'}</Badge>
          </CardContent>
        </Card>
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">플랜</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-slate-900">{subscriptionSnapshot?.planCode ?? 'starter'}</p></CardContent>
        </Card>
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">Trial 종료</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-semibold text-slate-900">{formatDate(subscriptionSnapshot?.trialEndAt ?? null)}</p></CardContent>
        </Card>
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">다음 갱신일</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-semibold text-slate-900">{formatDate(subscriptionSnapshot?.renewalDueAt ?? null)}</p></CardContent>
        </Card>
      </section>

      <Card className="vs-mesh-card">
        <CardHeader><CardTitle>운영 메모</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>조직 메뉴의 비용 관리는 의뢰인 계약, 청구, 분납, 입금 현황입니다.</p>
          <p>회사 관리의 구독 관리는 우리 조직이 플랫폼에 내는 구독료와 잠금 상태입니다.</p>
          <p>두 흐름은 다른 데이터이므로 섞지 않고 분리해서 운영합니다.</p>
        </CardContent>
      </Card>

      <Card className="vs-mesh-card">
        <CardHeader><CardTitle>구독 상태 상세</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 text-sm text-slate-700">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Past Due 시작</p>
            <p className="mt-2 font-semibold text-slate-900">{formatDate(subscriptionSnapshot?.pastDueStartedAt ?? null)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Soft Lock</p>
            <p className="mt-2 font-semibold text-slate-900">{formatDate(subscriptionSnapshot?.lockedSoftAt ?? null)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Hard Lock</p>
            <p className="mt-2 font-semibold text-slate-900">{formatDate(subscriptionSnapshot?.lockedHardAt ?? null)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Cancel</p>
            <p className="mt-2 font-semibold text-slate-900">{formatDate(subscriptionSnapshot?.cancelledAt ?? null)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 md:col-span-2 xl:col-span-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">잠금 사유</p>
            <p className="mt-2 text-sm text-slate-700">{subscriptionSnapshot?.lockReason ?? '정상 이용 중'}</p>
          </div>
        </CardContent>
      </Card>

      {canAdjustSubscription ? (
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle>플랫폼 운영자 조정</CardTitle></CardHeader>
          <CardContent>
            <ClientActionForm action={updateOrganizationSubscriptionStateAction} successTitle="구독 상태가 반영되었습니다." className="space-y-4">
              <input type="hidden" name="organizationId" value={organizationId ?? ''} />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                  <span className="font-medium text-slate-800">Trial 종료</span>
                  <input type="datetime-local" name="trialEndAt" defaultValue={subscriptionSnapshot?.trialEndAt ? subscriptionSnapshot.trialEndAt.slice(0, 16) : ''} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">갱신 예정</span>
                  <input type="datetime-local" name="renewalDueAt" defaultValue={subscriptionSnapshot?.renewalDueAt ? subscriptionSnapshot.renewalDueAt.slice(0, 16) : ''} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">Past Due 시작</span>
                  <input type="datetime-local" name="pastDueStartedAt" defaultValue={subscriptionSnapshot?.pastDueStartedAt ? subscriptionSnapshot.pastDueStartedAt.slice(0, 16) : ''} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">Soft Lock</span>
                  <input type="datetime-local" name="lockedSoftAt" defaultValue={subscriptionSnapshot?.lockedSoftAt ? subscriptionSnapshot.lockedSoftAt.slice(0, 16) : ''} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">Hard Lock</span>
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
    </div>
  );
}
