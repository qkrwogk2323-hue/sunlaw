import {
  emptyNotificationTrashAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  moveNotificationToTrashAction,
  openNotificationTargetAction,
  restoreNotificationAction
} from '@/lib/actions/notification-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SubmitButton } from '@/components/ui/submit-button';
import { Button, segmentStyles } from '@/components/ui/button';
import { getNotificationCenter } from '@/lib/queries/notifications';
import { formatNotificationDate } from '@/lib/format';
import { getActiveViewMode, hasActivePlatformScenarioView, requireAuthenticatedUser } from '@/lib/auth';
import { isPlatformScenarioMode } from '@/lib/platform-scenarios';
import { getPlatformScenarioNotificationCenter } from '@/lib/platform-scenario-workspace';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 40, 80, 120] as const;

function kindLabel(kind: string) {
  if (kind === 'approval_requested') return '결재 요청';
  if (kind === 'approval_completed') return '결재 결과';
  if (kind === 'support_request') return '지원 요청';
  if (kind === 'schedule_due') return '일정 알림';
  if (kind === 'collection_update') return '회수 소식';
  if (kind === 'case_assigned') return '사건 배정';
  return '알림';
}

function kindTone(kind: string) {
  if (kind === 'approval_requested' || kind === 'support_request') return 'amber' as const;
  if (kind === 'approval_completed') return 'green' as const;
  return 'blue' as const;
}

function NotificationCard({
  notification,
  currentOrganizationId,
  supportsTrash = true,
  confirmSwitch = false
}: {
  notification: any;
  currentOrganizationId: string | null;
  supportsTrash?: boolean;
  confirmSwitch?: boolean;
}) {
  const needsSwitch = Boolean(notification.organization_id && currentOrganizationId && notification.organization_id !== currentOrganizationId);

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-slate-900">{notification.title}</p>
            <Badge tone={kindTone(notification.kind)}>{kindLabel(notification.kind)}</Badge>
            {notification.requires_action && !notification.resolved_at ? <Badge tone="red">처리 필요</Badge> : null}
            {!notification.read_at ? <Badge tone="blue">읽지 않음</Badge> : null}
            {notification.read_at && !notification.requires_action ? <Badge tone="slate">확인함</Badge> : null}
          </div>
          <p className="text-sm leading-7 text-slate-600">{notification.body}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">{notification.organization?.name ?? '조직 정보 없음'}</span>
            <span>{formatNotificationDate(notification.created_at)}</span>
            {notification.resolved_at ? <span>처리 완료 {formatNotificationDate(notification.resolved_at)}</span> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-start gap-2 lg:justify-end">
          {!notification.read_at ? (
            <form action={markNotificationReadAction}>
              <input type="hidden" name="notificationId" value={notification.id} />
              <SubmitButton variant="secondary" pendingLabel="반영 중..." className="min-w-20 whitespace-nowrap rounded-full px-4">
                확인
              </SubmitButton>
            </form>
          ) : null}
          {notification.action_href ? (
            needsSwitch && confirmSwitch ? (
              <details className="group">
                <summary className="list-none">
                  <Button variant="primary" className="min-w-28 whitespace-nowrap rounded-full px-4">조직 전환 후 열기</Button>
                </summary>
                <div className="mt-3 w-full rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-900">
                  <p>{notification.organization?.name ?? '다른 조직'}으로 전환한 뒤 이 알림을 엽니다.</p>
                  <form action={openNotificationTargetAction} className="mt-3 flex flex-wrap gap-2">
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <input type="hidden" name="organizationId" value={notification.organization_id ?? ''} />
                    <input type="hidden" name="href" value={notification.action_href} />
                    <SubmitButton pendingLabel="이동 중..." className="min-w-20 whitespace-nowrap rounded-full px-4">열기</SubmitButton>
                  </form>
                </div>
              </details>
            ) : (
              <form action={openNotificationTargetAction}>
                <input type="hidden" name="notificationId" value={notification.id} />
                <input type="hidden" name="organizationId" value={needsSwitch ? notification.organization_id ?? '' : ''} />
                <input type="hidden" name="href" value={notification.action_href} />
                <SubmitButton pendingLabel="이동 중..." className="min-w-20 whitespace-nowrap rounded-full px-4">{notification.action_label ?? '열기'}</SubmitButton>
              </form>
            )
          ) : null}
          {supportsTrash ? (
            <form action={moveNotificationToTrashAction}>
              <input type="hidden" name="notificationId" value={notification.id} />
              <SubmitButton variant="ghost" pendingLabel="이동 중..." className="min-w-24 whitespace-nowrap rounded-full px-4">보관함</SubmitButton>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default async function NotificationsPage({
  searchParams
}: {
  searchParams?: Promise<{ size?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const activeViewMode = await getActiveViewMode();
  const scenarioMode = isPlatformScenarioMode(activeViewMode) && await hasActivePlatformScenarioView(auth, activeViewMode) ? activeViewMode : null;
  const isScenarioMode = Boolean(scenarioMode);
  const resolved = searchParams ? await searchParams : undefined;
  const requestedSize = Number(resolved?.size ?? 20);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedSize as (typeof PAGE_SIZE_OPTIONS)[number]) ? requestedSize : 20;
  const notificationCenter = scenarioMode ? getPlatformScenarioNotificationCenter(scenarioMode, pageSize) : await getNotificationCenter(pageSize);
  const activeNotifications = notificationCenter.activeNotifications ?? notificationCenter.currentOrganizationNotifications;
  const actionItems = activeNotifications.filter((notification: any) => notification.requires_action && !notification.resolved_at);
  const referenceItems = activeNotifications.filter((notification: any) => !(notification.requires_action && !notification.resolved_at));
  const recentItems = [...activeNotifications].sort((left: any, right: any) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());

  return (
    <div className="space-y-6">
      <div className="rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f3f8fd)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">알림 정리함</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">읽지 않음, 처리 필요, 보관함 상태를 먼저 확인하고 필요한 알림만 바로 정리합니다.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">읽지 않음</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{notificationCenter.summary.unreadCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">처리 필요</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{notificationCenter.summary.actionRequiredCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">보관함</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{notificationCenter.summary.trashCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">알림 정리함</h2>
          <p className="mt-2 text-sm text-slate-600">보관함에 들어간 알림은 30일 뒤 자동으로 비워집니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="알림 개수 선택" className="inline-flex flex-wrap gap-2 rounded-[1.25rem] bg-slate-100 p-1.5">
            {PAGE_SIZE_OPTIONS.map((option) => (
              <a
                key={option}
                href={`/notifications?size=${option}`}
                aria-current={pageSize === option ? 'page' : undefined}
                className={segmentStyles({ active: pageSize === option })}
              >
                {option}개
              </a>
            ))}
          </nav>
          {!isScenarioMode ? (
            <form action={markAllNotificationsReadAction}>
              <SubmitButton variant="secondary" pendingLabel="반영 중...">읽지 않은 알림만 정리</SubmitButton>
            </form>
          ) : null}
        </div>
      </div>

      <Card className="border-rose-200 bg-[linear-gradient(180deg,#fffafb,#fff4f6)]">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>조치 필요</CardTitle>
              <p className="mt-2 text-sm text-slate-600">승인, 전환, 확인이 필요한 알림부터 먼저 처리합니다.</p>
            </div>
            <Badge tone="red">{actionItems.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {actionItems.length ? (
            actionItems.map((notification: any) => (
              isScenarioMode ? (
                <div key={notification.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-slate-900">{notification.title}</p>
                    <Badge tone={kindTone(notification.kind)}>{kindLabel(notification.kind)}</Badge>
                    <Badge tone="red">처리 필요</Badge>
                    {!notification.read_at ? <Badge tone="blue">읽지 않음</Badge> : null}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{notification.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1">{notification.organization?.name ?? '가상조직'}</span>
                    <span>{formatNotificationDate(notification.created_at)}</span>
                  </div>
                </div>
              ) : (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  currentOrganizationId={notificationCenter.currentOrganizationId}
                  supportsTrash={notificationCenter.capabilities?.supportsTrash !== false}
                />
              )
            ))
          ) : (
            <p className="text-sm text-slate-500">즉시 처리해야 할 알림이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>참고용</CardTitle>
                <p className="mt-2 text-sm text-slate-600">읽어두면 좋은 변경사항과 완료 알림을 모아둡니다.</p>
              </div>
              <Badge tone="blue">{referenceItems.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {referenceItems.length ? (
              referenceItems.slice(0, pageSize).map((notification: any) => (
                isScenarioMode ? (
                  <div key={notification.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-slate-900">{notification.title}</p>
                      <Badge tone={kindTone(notification.kind)}>{kindLabel(notification.kind)}</Badge>
                      {!notification.read_at ? <Badge tone="blue">읽지 않음</Badge> : null}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{notification.body}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-3 py-1">{notification.organization?.name ?? '가상조직'}</span>
                      <span>{formatNotificationDate(notification.created_at)}</span>
                    </div>
                  </div>
                ) : (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    currentOrganizationId={notificationCenter.currentOrganizationId}
                    supportsTrash={notificationCenter.capabilities?.supportsTrash !== false}
                    confirmSwitch={Boolean(notification.organization_id && notification.organization_id !== notificationCenter.currentOrganizationId)}
                  />
                )
              ))
            ) : (
              <p className="text-sm text-slate-500">참고용 알림이 없습니다.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>최근 도착</CardTitle>
                <p className="mt-2 text-sm text-slate-600">조직이 달라도 최근 순서대로 빠르게 훑어봅니다.</p>
              </div>
              <Badge tone="slate">{recentItems.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentItems.length ? (
              recentItems.slice(0, Math.min(pageSize, 8)).map((notification: any) => (
                <div key={notification.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-slate-900">{notification.title}</p>
                    <Badge tone={kindTone(notification.kind)}>{kindLabel(notification.kind)}</Badge>
                    {notification.requires_action && !notification.resolved_at ? <Badge tone="red">조치 필요</Badge> : null}
                    {!notification.read_at ? <Badge tone="blue">읽지 않음</Badge> : null}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{notification.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1">{notification.organization?.name ?? '조직 정보 없음'}</span>
                    <span>{formatNotificationDate(notification.created_at)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">최근 도착한 알림이 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {!isScenarioMode && notificationCenter.capabilities?.supportsTrash !== false ? (
      <Card className="border-red-100">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>보관함</CardTitle>
              <p className="mt-2 text-sm text-slate-600">실수로 비우면 다시 되돌릴 수 없습니다.</p>
            </div>
            {notificationCenter.trashedNotifications.length ? (
              <form action={emptyNotificationTrashAction}>
                <SubmitButton variant="destructive" pendingLabel="비우는 중..." className="rounded-full px-5">보관함 비우기</SubmitButton>
              </form>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {notificationCenter.trashedNotifications.length ? (
            notificationCenter.trashedNotifications.map((notification: any) => (
              <div key={notification.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-slate-900">{notification.title}</p>
                      <Badge tone="slate">보관됨</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{notification.body}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-3 py-1">{notification.organization?.name ?? '조직 정보 없음'}</span>
                      <span>도착 {formatNotificationDate(notification.created_at)}</span>
                      <span>보관 {formatNotificationDate(notification.trashed_at)}</span>
                    </div>
                  </div>
                  <form action={restoreNotificationAction}>
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <SubmitButton variant="secondary" pendingLabel="복원 중..." className="rounded-full px-5 whitespace-nowrap">다시 꺼내기</SubmitButton>
                  </form>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">보관함은 비어 있습니다.</p>
          )}
        </CardContent>
      </Card>
      ) : null}
    </div>
  );
}
