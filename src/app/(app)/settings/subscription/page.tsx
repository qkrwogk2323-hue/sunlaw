import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { SettingsNav } from '@/components/settings-nav';
import { getEffectiveOrganizationId, getPlatformOrganizationContextId, hasActivePlatformAdminView, requireAuthenticatedUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { updateOrganizationSubscriptionStateAction } from '@/lib/actions/billing-actions';
import { getOrganizationSubscriptionSnapshot } from '@/lib/subscription-lock';
import { listAccessibleOrganizations } from '@/lib/queries/organizations';
import { getSettingsAdminData } from '@/lib/queries/settings-admin';
import { CollapsibleSettingsSection } from '@/components/ui/collapsible-settings-section';
import { redirect } from 'next/navigation';
import type { Route } from 'next';

type SearchParams = Promise<{ locked?: string; org?: string }>;

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
  const defaultOrganizationId = getEffectiveOrganizationId(auth);
  const canViewPlatformControls = await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth));

  // 플랫폼 관리자 전용 페이지 — 일반 조직 사용자는 조직설정 개요로 이동
  if (!canViewPlatformControls) {
    redirect('/settings' as Route);
  }

  const resolved = searchParams ? await searchParams : undefined;
  const organizationOptions = await listAccessibleOrganizations({ includeAll: true });
  const selectedOrganizationId = `${resolved?.org ?? ''}`.trim() || defaultOrganizationId;
  const canAdjustSubscription = Boolean(selectedOrganizationId);
  const subscriptionSnapshot = await getOrganizationSubscriptionSnapshot(selectedOrganizationId);
  const settingsAdminData = selectedOrganizationId ? await getSettingsAdminData(selectedOrganizationId) : null;
  const subscriptionLogs = (settingsAdminData?.changeLogs ?? []).filter((row: any) => row.target_type === 'organization_subscription_state').slice(0, 8);
  const selectedOrganization = organizationOptions.find((item: any) => item.id === selectedOrganizationId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">구독 관리</h1>
        <p className="mt-2 text-sm text-slate-600">우리 조직의 플랫폼 이용 상태와 갱신 일정을 확인합니다. 의뢰인 청구·분납 현황은 조직 메뉴의 비용 관리에서 확인합니다.</p>
      </div>

      <SettingsNav currentPath="/settings/subscription" canViewPlatformControls={true} />

      {organizationOptions.length ? (
        <CollapsibleSettingsSection
          title="조직별 구독 권한 조정"
          description="대상 조직을 고르거나 구독 상태를 바꿀 때만 열어서 사용합니다."
        >
          <div className="space-y-3">
            <form action="/settings/subscription" className="flex flex-wrap items-end gap-3">
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-medium text-slate-800">대상 조직</span>
                <select name="org" defaultValue={selectedOrganizationId ?? ''} className="h-10 min-w-72 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
                  {organizationOptions.map((organization: any) => (
                    <option key={organization.id} value={organization.id}>{organization.name}</option>
                  ))}
                </select>
              </label>
              <SubmitButton variant="secondary" pendingLabel="불러오는 중...">대상 변경</SubmitButton>
            </form>
            <p className="text-xs text-slate-500">플랫폼 조직은 여기서 각 조직의 이용 권한을 부여하거나 제한할 수 있습니다.</p>
          </div>
        </CollapsibleSettingsSection>
      ) : null}

      {resolved?.locked ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          구독 상태 때문에 일부 업무 화면 접근이 제한되었습니다. 이 페이지에서 현재 상태를 확인해 주세요.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">현재 상태</CardTitle></CardHeader>
          <CardContent>
            {selectedOrganization ? <p className="mb-2 text-sm font-medium text-slate-900">{selectedOrganization.name}</p> : null}
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
        <CollapsibleSettingsSection
          title="플랫폼 조직 관리자 조정"
          description="구독 상태를 실제로 바꿔야 할 때만 열어서 저장합니다."
        >
            <ClientActionForm action={updateOrganizationSubscriptionStateAction} successTitle="구독 상태가 반영되었습니다." className="space-y-4">
              <input type="hidden" name="organizationId" value={selectedOrganizationId ?? ''} />
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
        </CollapsibleSettingsSection>
      ) : null}

      <Card className="vs-mesh-card">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>구독 변경 기록</CardTitle>
            {/* BUG-AUDIT: 감사로그 직접 이동 차단 - 일반 사용자가 플랫폼 관리자 감사로그에 접근하는 버그 */}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {subscriptionLogs.length ? subscriptionLogs.map((row: any) => (
            <div key={row.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">{row.reason ?? '구독 상태 변경'}</p>
              <p className="mt-1 text-xs text-slate-500">변경 시각: {formatDate(row.created_at)}</p>
              <p className="mt-1 text-xs text-slate-500">변경자: {row.changed_by_profile?.full_name ?? row.changed_by}</p>
            </div>
          )) : (
            <p className="text-sm text-slate-500">표시할 구독 변경 기록이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
