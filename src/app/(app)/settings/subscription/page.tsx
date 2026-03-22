import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { SettingsNav } from '@/components/settings-nav';
import { getEffectiveOrganizationId, getPlatformOrganizationContextId, hasActivePlatformAdminView, isPlatformOperator, requireAuthenticatedUser } from '@/lib/auth';
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

function subscriptionStateLabel(state: string | null | undefined) {
  if (state === 'locked_hard') return '장기 미납 잠금';
  if (state === 'locked_soft') return '일부 기능 제한';
  if (state === 'past_due') return '결제 지연';
  if (state === 'trialing') return '체험 사용 중';
  if (state === 'cancelled') return '이용 종료';
  return '정상 이용 중';
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
  const canAdjustSubscription = await hasActivePlatformAdminView(auth, organizationId);
  const canViewPlatformControls = await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth));
  const subscriptionSnapshot = await getOrganizationSubscriptionSnapshot(organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">구독 관리</h1>
        <p className="mt-2 text-sm text-slate-600">우리 조직의 플랫폼 이용 상태와 갱신 일정을 확인합니다. 의뢰인 청구·분납 현황은 조직 메뉴의 비용 관리에서 확인합니다.</p>
      </div>

      <SettingsNav currentPath="/settings/subscription" canViewPlatformControls={canViewPlatformControls} />

      {resolved?.locked ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          구독 상태 때문에 일부 업무 화면 접근이 제한되었습니다. 이 페이지에서 현재 상태를 확인해 주세요.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">현재 상태</CardTitle></CardHeader>
          <CardContent>
            <Badge tone={subscriptionTone(subscriptionSnapshot?.state)}>{subscriptionStateLabel(subscriptionSnapshot?.state)}</Badge>
          </CardContent>
        </Card>
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">이용 플랜</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-slate-900">{subscriptionSnapshot?.planCode ?? 'starter'}</p></CardContent>
        </Card>
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">체험 종료일</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-semibold text-slate-900">{formatDate(subscriptionSnapshot?.trialEndAt ?? null)}</p></CardContent>
        </Card>
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">다음 갱신일</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-semibold text-slate-900">{formatDate(subscriptionSnapshot?.renewalDueAt ?? null)}</p></CardContent>
        </Card>
      </section>

      <Card className="vs-mesh-card">
        <CardHeader><CardTitle>이용 안내</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>현재 상태와 다음 갱신일만 확인하면 됩니다.</p>
          <p>결제 지연이나 이용 제한이 있으면 이 화면에 사유가 표시됩니다.</p>
          <p>의뢰인 계약·청구·분납은 이 화면이 아니라 조직 메뉴의 비용 관리에서 확인합니다.</p>
        </CardContent>
      </Card>

      <Card className="vs-mesh-card">
        <CardHeader><CardTitle>구독 상태 상세</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 text-sm text-slate-700">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">결제 지연 시작</p>
            <p className="mt-2 font-semibold text-slate-900">{formatDate(subscriptionSnapshot?.pastDueStartedAt ?? null)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">일부 기능 제한 시작</p>
            <p className="mt-2 font-semibold text-slate-900">{formatDate(subscriptionSnapshot?.lockedSoftAt ?? null)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">장기 미납 잠금 시작</p>
            <p className="mt-2 font-semibold text-slate-900">{formatDate(subscriptionSnapshot?.lockedHardAt ?? null)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">이용 종료일</p>
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
          <CardHeader><CardTitle>플랫폼 조직 관리자 조정</CardTitle></CardHeader>
          <CardContent>
            <ClientActionForm action={updateOrganizationSubscriptionStateAction} successTitle="구독 상태가 반영되었습니다." className="space-y-4">
              <input type="hidden" name="organizationId" value={organizationId ?? ''} />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">상태</span>
                  <select name="state" defaultValue={subscriptionSnapshot?.state ?? 'active'} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
                    <option value="trialing">체험 사용 중</option>
                    <option value="active">정상 이용 중</option>
                    <option value="past_due">결제 지연</option>
                    <option value="locked_soft">일부 기능 제한</option>
                    <option value="locked_hard">장기 미납 잠금</option>
                    <option value="cancelled">이용 종료</option>
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
                  <span className="font-medium text-slate-800">갱신 예정</span>
                  <input type="datetime-local" name="renewalDueAt" defaultValue={subscriptionSnapshot?.renewalDueAt ? subscriptionSnapshot.renewalDueAt.slice(0, 16) : ''} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">결제 지연 시작</span>
                  <input type="datetime-local" name="pastDueStartedAt" defaultValue={subscriptionSnapshot?.pastDueStartedAt ? subscriptionSnapshot.pastDueStartedAt.slice(0, 16) : ''} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">일부 기능 제한 시작</span>
                  <input type="datetime-local" name="lockedSoftAt" defaultValue={subscriptionSnapshot?.lockedSoftAt ? subscriptionSnapshot.lockedSoftAt.slice(0, 16) : ''} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">장기 미납 잠금 시작</span>
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
                이용 종료 상태에서도 내보내기 허용
              </label>

              <div className="flex justify-end">
                <SubmitButton pendingLabel="반영 중..." className="px-5">
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
