import {
  emptyNotificationTrashAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  markNotificationResolvedAction,
  moveNotificationToTrashAction,
  openNotificationTargetAction,
  restoreNotificationAction
} from '@/lib/actions/notification-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SubmitButton } from '@/components/ui/submit-button';
import { getNotificationCenter } from '@/lib/queries/notifications';
import { formatNotificationDate } from '@/lib/format';
import { getActiveViewMode, hasActivePlatformScenarioView, requireAuthenticatedUser } from '@/lib/auth';
import { isPlatformScenarioMode } from '@/lib/platform-scenarios';
import { getPlatformScenarioNotificationCenter } from '@/lib/platform-scenario-workspace';

const PAGE_SIZE_OPTIONS = [10, 20, 40, 80] as const;

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

function entityLabel(value?: string | null) {
  if (value === 'case') return '사건';
  if (value === 'schedule') return '일정';
  if (value === 'client') return '의뢰인';
  if (value === 'collaboration') return '협업';
  return '업무';
}

/** 행동 중심 단일 카드 — 주요 액션 1개, 보조 액션은 메뉴로 */
function NotificationCard({
  notification,
  currentOrganizationId,
  supportsTrash = true,
  isScenarioMode = false
}: {
  notification: any;
  currentOrganizationId: string | null;
  supportsTrash?: boolean;
  isScenarioMode?: boolean;
}) {
  const needsSwitch = Boolean(
    notification.organization_id &&
    currentOrganizationId &&
    notification.organization_id !== currentOrganizationId
  );
  const openHref = notification.destination_url ?? notification.action_href;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_6px_16px_rgba(15,23,42,0.05)]">
      {/* 미독 인디케이터 */}
      <div className="mt-1.5 shrink-0">
        {!notification.read_at
          ? <span className="block h-2 w-2 rounded-full bg-blue-500" aria-label="읽지 않음" />
          : <span className="block h-2 w-2 rounded-full bg-transparent" />}
      </div>

      {/* 본문 */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-900">{notification.title}</span>
          <Badge tone={kindTone(notification.kind)}>{kindLabel(notification.kind)}</Badge>
          <Badge tone="slate">{entityLabel(notification.entity_type ?? notification.action_entity_type)}</Badge>
        </div>
        {notification.body ? (
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{notification.body}</p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>{notification.organization?.name ?? (isScenarioMode ? '가상조직' : '조직 정보 없음')}</span>
          <span>·</span>
          <span>{formatNotificationDate(notification.created_at)}</span>
          {notification.resolved_at ? (
            <>
              <span>·</span>
              <span className="text-emerald-600">처리 완료 {formatNotificationDate(notification.resolved_at)}</span>
            </>
          ) : null}
        </div>
      </div>

      {/* 액션 영역 */}
      {!isScenarioMode ? (
        <div className="flex shrink-0 items-center gap-1">
          {/* 주요 액션: 열기 */}
          {openHref ? (
            needsSwitch ? (
              <details className="group relative">
                <summary className="list-none cursor-pointer">
                  <span className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,#0f766e_0%,#0284c7_55%,#0f172a_100%)] px-3 py-1.5 text-xs font-medium text-white shadow-[0_6px_18px_rgba(14,165,164,0.18)] transition hover:-translate-y-px">
                    조직 전환 후 열기
                  </span>
                </summary>
                <div className="mt-3 w-full rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-900">
                  <p>{notification.organization?.name ?? '다른 조직'}으로 전환한 뒤 이 알림을 엽니다.</p>
                  <form action={openNotificationTargetAction} className="mt-3 flex flex-wrap gap-2">
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <input type="hidden" name="organizationId" value={notification.organization_id ?? ''} />
                    <input type="hidden" name="href" value={openHref} />
                    <SubmitButton pendingLabel="이동 중..." className="min-w-20 whitespace-nowrap rounded-full px-4">열기</SubmitButton>
                  </form>
                </div>
              </details>
            ) : (
              <form action={openNotificationTargetAction}>
                <input type="hidden" name="notificationId" value={notification.id} />
                <input type="hidden" name="organizationId" value={needsSwitch ? notification.organization_id ?? '' : ''} />
                <input type="hidden" name="href" value={openHref} />
                <SubmitButton pendingLabel="이동 중..." className="min-w-20 whitespace-nowrap rounded-full px-4">{notification.action_label ?? '열기'}</SubmitButton>
              </form>
            )
          ) : null}

          {/* 보조 액션: 더보기 메뉴 */}
          {supportsTrash || !notification.read_at ? (
            <details className="group relative">
              <summary className="list-none cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
                </svg>
                <span className="sr-only">더보기</span>
              </summary>
              <div className="absolute right-0 top-full z-10 mt-1 min-w-[7rem] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {!notification.read_at ? (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <SubmitButton variant="ghost" pendingLabel="반영 중..." className="w-full justify-start rounded-none px-3 py-1.5 text-sm">
                      확인 표시
                    </SubmitButton>
                  </form>
                ) : null}
                {notification.status === 'active' || notification.status === 'read' ? (
                  <form action={markNotificationResolvedAction}>
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <SubmitButton variant="ghost" pendingLabel="처리 중..." className="w-full justify-start rounded-none px-3 py-1.5 text-sm">
                      해결 처리
                    </SubmitButton>
                  </form>
                ) : null}
                {supportsTrash && notification.status === 'resolved' ? (
                  <form action={moveNotificationToTrashAction}>
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <SubmitButton variant="ghost" pendingLabel="이동 중..." className="w-full justify-start rounded-none px-3 py-1.5 text-sm text-slate-500">
                      보관함으로
                    </SubmitButton>
                  </form>
                ) : null}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
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

  // 상태 기반 처리 큐
  const actionItems = activeNotifications.filter((n: any) => n.status === 'active' && (n.priority === 'urgent' || n.requires_action));
  const newItems = activeNotifications.filter((n: any) => (n.status === 'active' || n.status === 'read') && !(n.priority === 'urgent' || n.requires_action));
  const referenceItems = activeNotifications.filter((n: any) => n.status === 'resolved' || n.status === 'archived');

  const supportsTrash = notificationCenter.capabilities?.supportsTrash !== false;

  return (
    <div className="space-y-5">
      {/* 헤더 + 요약 */}
      <div className="rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f3f8fd)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">알림센터</h1>
            <p className="mt-2 text-sm text-slate-500">사건/일정/의뢰인/협업 업무를 처리하는 큐 화면입니다. 보관함 알림은 30일 뒤 자동 삭제됩니다.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* 처리 필요 카운트 — 0이 아닐 때만 강조 */}
            {notificationCenter.summary.actionRequiredCount > 0 ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-rose-600">처리 필요</p>
                <p className="mt-1 text-2xl font-semibold text-rose-700">{notificationCenter.summary.actionRequiredCount}</p>
              </div>
            ) : null}
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">새 알림</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{notificationCenter.summary.unreadCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">보관함</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{notificationCenter.summary.trashCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 툴바: 개수 드롭다운 + 일괄 확인 */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <form method="get" action="/notifications">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="whitespace-nowrap">표시 개수</span>
            <select
              name="size"
              defaultValue={pageSize}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}개</option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:-translate-y-px hover:shadow-md"
            >
              적용
            </button>
          </label>
        </form>
        {!isScenarioMode ? (
          <form action={markAllNotificationsReadAction}>
            <SubmitButton variant="secondary" pendingLabel="반영 중...">모두 확인 표시</SubmitButton>
          </form>
        ) : null}
      </div>

      {/* ① 처리 필요 — 0이면 최소 배너 */}
      {actionItems.length > 0 ? (
        <Card className="border-rose-200 bg-[linear-gradient(180deg,#fffafb,#fff4f6)]">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>처리 필요</CardTitle>
              <Badge tone="red">{actionItems.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {actionItems.map((notification: any) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                currentOrganizationId={notificationCenter.currentOrganizationId}
                supportsTrash={supportsTrash}
                isScenarioMode={isScenarioMode}
              />
            ))}
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          처리 필요한 알림이 없습니다.
        </div>
      )}

      {/* ② 새 알림 — 읽지 않은 참고용 */}
      {newItems.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>새 알림</CardTitle>
              <Badge tone="blue">{newItems.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {newItems.slice(0, pageSize).map((notification: any) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                currentOrganizationId={notificationCenter.currentOrganizationId}
                supportsTrash={supportsTrash}
                isScenarioMode={isScenarioMode}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* ③ 참고용 — 이미 확인한 알림 */}
      {referenceItems.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>참고용</CardTitle>
              <Badge tone="slate">{referenceItems.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {referenceItems.slice(0, pageSize).map((notification: any) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                currentOrganizationId={notificationCenter.currentOrganizationId}
                supportsTrash={supportsTrash}
                isScenarioMode={isScenarioMode}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* ④ 보관함 */}
      {!isScenarioMode && supportsTrash ? (
        <Card className="border-slate-100">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>보관함</CardTitle>
                {notificationCenter.trashedNotifications.length > 0 ? (
                  <Badge tone="slate">{notificationCenter.trashedNotifications.length}</Badge>
                ) : null}
              </div>
              {notificationCenter.trashedNotifications.length > 0 ? (
                <form action={emptyNotificationTrashAction}>
                  <SubmitButton variant="destructive" pendingLabel="비우는 중..." className="rounded-full px-5">보관함 비우기</SubmitButton>
                </form>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {notificationCenter.trashedNotifications.length > 0 ? (
              notificationCenter.trashedNotifications.map((notification: any) => (
                <div key={notification.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-500">{notification.title}</span>
                      <Badge tone="slate">보관됨</Badge>
                    </div>
                    {notification.body ? (
                      <p className="mt-1 line-clamp-1 text-xs text-slate-400">{notification.body}</p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span>{notification.organization?.name ?? '조직 정보 없음'}</span>
                      <span>·</span>
                      <span>도착 {formatNotificationDate(notification.created_at)}</span>
                      <span>·</span>
                      <span>보관 {formatNotificationDate(notification.trashed_at)}</span>
                    </div>
                  </div>
                  <form action={restoreNotificationAction} className="shrink-0">
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <SubmitButton variant="secondary" pendingLabel="복원 중..." className="whitespace-nowrap rounded-full px-4 py-1.5 text-xs">다시 꺼내기</SubmitButton>
                  </form>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">보관함이 비어 있습니다.</p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
