import {
  bulkNotificationTransitionAction,
  emptyNotificationTrashAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  markNotificationResolvedAction,
  moveNotificationToTrashAction,
  restoreNotificationAction,
  updateNotificationChannelPreferenceAction
} from '@/lib/actions/notification-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SubmitButton } from '@/components/ui/submit-button';
import { DangerActionButton } from '@/components/ui/danger-action-button';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { ImmediateDeleteForm } from '@/components/notifications/immediate-delete-form';
import { UnifiedListSearch } from '@/components/ui/unified-list-search';
import { CollapsibleList } from '@/components/ui/collapsible-list';
import { formatNotificationDate } from '@/lib/format';
import { requireAuthenticatedUser } from '@/lib/auth';
import { getNotificationCenter, getNotificationChannelPreferences, getNotificationQueueView, type NotificationQueueItem } from '@/lib/queries/notifications';

const PAGE_SIZE_OPTIONS = [10, 20, 40, 80] as const;

type QueueSectionKey = 'immediate' | 'confirm' | 'reference';
type QueueEntityType = 'case' | 'schedule' | 'client' | 'collaboration';

function notificationOpenHref(notificationId: string, href: string, organizationId?: string | null) {
  const params = new URLSearchParams();
  params.set('href', href);
  if (organizationId) {
    params.set('organizationId', organizationId);
  }
  return `/notifications/open/${notificationId}?${params.toString()}`;
}

function sectionMeta(section: QueueSectionKey) {
  if (section === 'immediate') return { label: '오늘 할 일', tone: 'red' as const, openByDefault: true };
  if (section === 'confirm') return { label: '검토 필요', tone: 'blue' as const, openByDefault: true };
  return { label: '완료 / 참고', tone: 'slate' as const, openByDefault: false };
}

function entityLabel(entityType: QueueEntityType) {
  if (entityType === 'case') return '사건';
  if (entityType === 'schedule') return '일정';
  if (entityType === 'client') return '의뢰인';
  return '협업';
}

function statusLabel(status: string) {
  if (status === 'active') return '신규';
  if (status === 'read') return '확인';
  if (status === 'resolved') return '해결';
  if (status === 'archived') return '보관';
  return status;
}

function priorityLabel(priority: string) {
  if (priority === 'urgent') return '긴급';
  if (priority === 'normal') return '일반';
  return '낮음';
}

function actionCopy(item: NotificationQueueItem) {
  if (item.entityType === 'case') return '사건 화면에서 다음 조치 진행';
  if (item.entityType === 'schedule') return '일정 화면에서 처리';
  if (item.entityType === 'client') return '의뢰인 화면에서 확인';
  return '조직 소통 화면에서 확인';
}

function QueueItemRow({ item }: { item: NotificationQueueItem }) {
  const openHref = notificationOpenHref(item.notificationId, item.destinationUrl, item.organizationId);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
          <p className="mt-1 text-xs text-slate-500">{actionCopy(item)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Badge tone="slate">{statusLabel(item.status)}</Badge>
          <Badge tone={item.priority === 'urgent' ? 'red' : item.priority === 'normal' ? 'blue' : 'slate'}>{priorityLabel(item.priority)}</Badge>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>{item.organizationName ?? '조직 미지정'}</span>
        <span>·</span>
        <span>{formatNotificationDate(item.createdAt)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600">
          <input type="checkbox" name="notificationIds" value={item.notificationId} form="bulk-queue-form" className="h-3.5 w-3.5" />
          선택
        </label>
        <a
          href={openHref}
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
        >
          열기
        </a>

        {(item.status === 'active' || item.status === 'read') ? (
          <ClientActionForm action={markNotificationResolvedAction} successTitle="해결 처리되었습니다.">
            <input type="hidden" name="notificationId" value={item.notificationId} />
            <SubmitButton variant="ghost" pendingLabel="처리 중..." className="h-8 px-3 text-xs">해결 처리</SubmitButton>
          </ClientActionForm>
        ) : null}

        {item.status === 'active' ? (
          <ClientActionForm action={markNotificationReadAction} successTitle="읽음으로 표시했습니다.">
            <input type="hidden" name="notificationId" value={item.notificationId} />
            <SubmitButton variant="ghost" pendingLabel="반영 중..." className="h-8 px-3 text-xs">읽음 처리</SubmitButton>
          </ClientActionForm>
        ) : null}

        {item.status === 'resolved' ? (
          <ClientActionForm action={moveNotificationToTrashAction} successTitle="보관함으로 이동했습니다.">
            <input type="hidden" name="notificationId" value={item.notificationId} />
            <SubmitButton variant="ghost" pendingLabel="이동 중..." className="h-8 px-3 text-xs">완료함 이동</SubmitButton>
          </ClientActionForm>
        ) : null}
      </div>
    </div>
  );
}

function QueueSection({
  section,
  groups
}: {
  section: QueueSectionKey;
  groups: Array<{ groupKey: string; entityType: QueueEntityType; entityId: string | null; title: string; count: number; items: NotificationQueueItem[] }>;
}) {
  const meta = sectionMeta(section);
  const totalCount = groups.reduce((sum, group) => sum + group.count, 0);
  let remaining = 5;
  const limitedGroups = groups
    .map((group) => {
      if (remaining <= 0) return null;
      const items = group.items.slice(0, remaining);
      remaining -= items.length;
      if (!items.length) return null;
      return {
        ...group,
        count: items.length,
        items
      };
    })
    .filter(Boolean) as typeof groups;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{meta.label}</CardTitle>
          <Badge tone={meta.tone}>{totalCount}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {(['case', 'schedule', 'client', 'collaboration'] as QueueEntityType[]).map((entityType) => {
          const entityGroups = limitedGroups.filter((group) => group.entityType === entityType);
          if (!entityGroups.length) return null;

          return (
            <details key={entityType} open={meta.openByDefault} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                {entityLabel(entityType)} · {entityGroups.length}개 그룹
              </summary>
              <div className="mt-3 space-y-3">
                {entityGroups.map((group) => (
                  <details key={group.groupKey} open={meta.openByDefault} className="rounded-xl border border-slate-200 bg-white p-3">
                    <summary className="cursor-pointer list-none text-sm font-medium text-slate-900">
                      {group.title} ({group.count})
                    </summary>
                    <div className="mt-3 space-y-2">
                      {group.items.map((item) => <QueueItemRow key={item.notificationId} item={item} />)}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default async function NotificationsPage({
  searchParams
}: {
  searchParams?: Promise<{ size?: string; q?: string; entity?: string; section?: string; priority?: string; state?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const resolved = searchParams ? await searchParams : undefined;
  const requestedSize = Number(resolved?.size ?? 20);
  const keyword = `${resolved?.q ?? ''}`.trim();
  const entity = `${resolved?.entity ?? 'all'}` as 'all' | QueueEntityType;
  const section = `${resolved?.section ?? 'all'}` as 'all' | QueueSectionKey;
  const priority = `${resolved?.priority ?? 'all'}` as 'all' | 'urgent' | 'normal' | 'low';
  const state = `${resolved?.state ?? 'all'}` as 'all' | 'active' | 'read' | 'resolved' | 'archived';
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedSize as (typeof PAGE_SIZE_OPTIONS)[number]) ? requestedSize : 20;

  const [notificationCenter, channelPreferences] = await Promise.all([
    getNotificationCenter(pageSize),
    getNotificationChannelPreferences()
  ]);

  const queueView = await getNotificationQueueView({
    limit: pageSize,
    q: keyword || null,
    entityType: entity,
    section,
    priority,
    state
  });

  return (
    <div className="space-y-5">
      <div className="rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f3f8fd)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">알림센터</h1>
            <p className="mt-2 text-sm text-slate-500">알림을 보는 곳이 아니라 사건/일정/의뢰인/협업 업무를 처리하는 큐입니다.</p>
            <p className="mt-1 text-xs text-amber-700">카카오톡 가입자는 중요 알림을 카카오톡으로 받을 수 있습니다. 아래 수신 설정에서 알림 유형을 선택하세요.</p>
          </div>
          <div className="flex items-center gap-3">
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

      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <UnifiedListSearch
          action="/notifications"
          defaultValue={keyword}
          placeholder="제목, 조직, 처리 안내 검색"
          ariaLabel="알림 센터 목록 검색"
          hiddenFields={{
            entity,
            section,
            priority,
            state,
            size: pageSize
          }}
        >
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="whitespace-nowrap">유형</span>
            <select name="entity" defaultValue={entity} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800">
              <option value="all">전체</option>
              <option value="case">사건</option>
              <option value="schedule">일정</option>
              <option value="client">의뢰인</option>
              <option value="collaboration">협업</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="whitespace-nowrap">섹션</span>
            <select name="section" defaultValue={section} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800">
              <option value="all">전체</option>
              <option value="immediate">즉시 처리</option>
              <option value="confirm">확인 필요</option>
              <option value="reference">참고/완료</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="whitespace-nowrap">우선순위</span>
            <select name="priority" defaultValue={priority} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800">
              <option value="all">전체</option>
              <option value="urgent">긴급</option>
              <option value="normal">일반</option>
              <option value="low">낮음</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="whitespace-nowrap">상태</span>
            <select name="state" defaultValue={state} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800">
              <option value="all">전체</option>
              <option value="active">신규</option>
              <option value="read">확인</option>
              <option value="resolved">해결</option>
              <option value="archived">완료</option>
            </select>
          </label>
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
          </label>
        </UnifiedListSearch>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ClientActionForm
          id="bulk-queue-form"
          action={bulkNotificationTransitionAction}
          successTitle="선택한 알림을 정리했습니다."
          errorTitle="일괄 처리에 실패했습니다."
          errorCause="선택한 알림을 처리하는 중 서버 응답이 실패했습니다."
          errorResolution="선택 항목을 다시 확인한 뒤 다시 시도해 주세요."
          className="flex flex-wrap items-center gap-2"
        >
          <SubmitButton name="operation" value="read" variant="secondary" pendingLabel="반영 중..." className="px-3">
            선택 읽음
          </SubmitButton>
          <SubmitButton name="operation" value="resolve" variant="secondary" pendingLabel="반영 중..." className="px-3">
            선택 해결
          </SubmitButton>
          <SubmitButton name="operation" value="archive" variant="secondary" pendingLabel="이동 중..." className="px-3">
            선택 완료함 이동
          </SubmitButton>
        </ClientActionForm>
        <ClientActionForm action={markAllNotificationsReadAction} successTitle="모든 알림을 확인 표시했습니다.">
          <SubmitButton variant="secondary" pendingLabel="반영 중...">모두 확인 표시</SubmitButton>
        </ClientActionForm>
      </div>

      {queueView ? (
        <div className="space-y-4">
          <CollapsibleList
            label="알림 큐 섹션"
            totalCount={3}
            defaultShowCount={2}
            visibleContent={
              <div className="space-y-4">
                <QueueSection section="immediate" groups={queueView.sections.immediate} />
                <QueueSection section="confirm" groups={queueView.sections.confirm} />
              </div>
            }
            hiddenContent={<QueueSection section="reference" groups={queueView.sections.reference} />}
          />
        </div>
      ) : null}

      <Card className="border-slate-100">
        <CardHeader><CardTitle>알림 수신 설정</CardTitle></CardHeader>
        <CardContent>
          <ClientActionForm
            action={updateNotificationChannelPreferenceAction}
            successTitle="수신 설정이 저장되었습니다."
            successMessage="변경된 설정이 즉시 적용됩니다."
            errorTitle="수신 설정 저장에 실패했습니다."
            errorResolution="잠시 후 다시 시도해 주세요."
            className="grid gap-3 md:grid-cols-2"
          >
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="kakao_enabled" defaultChecked={Boolean(channelPreferences?.kakao_enabled)} className="size-4" />
              카카오톡 알림 받기
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="kakao_important_only" defaultChecked={Boolean(channelPreferences?.kakao_important_only)} className="size-4" />
              카카오톡은 중요 알림만 받기
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="allow_case" defaultChecked={Boolean(channelPreferences?.allow_case)} className="size-4" />
              사건 알림 받기
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="allow_schedule" defaultChecked={Boolean(channelPreferences?.allow_schedule)} className="size-4" />
              일정 알림 받기
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="allow_client" defaultChecked={Boolean(channelPreferences?.allow_client)} className="size-4" />
              의뢰인 알림 받기
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="allow_collaboration" defaultChecked={Boolean(channelPreferences?.allow_collaboration)} className="size-4" />
              협업 알림 받기
            </label>
            <div className="md:col-span-2">
              <SubmitButton pendingLabel="저장 중...">수신 설정 저장</SubmitButton>
            </div>
          </ClientActionForm>
        </CardContent>
      </Card>

      {notificationCenter.capabilities?.supportsTrash !== false ? (
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
                <DangerActionButton
                  action={emptyNotificationTrashAction}
                  fields={{}}
                  confirmTitle="보관함을 비울까요?"
                  confirmDescription={`보관함의 알림 ${notificationCenter.trashedNotifications.length}건이 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`}
                  confirmLabel="모두 삭제"
                  variant="danger"
                  successTitle="보관함을 비웠습니다."
                  successMessage="보관된 알림이 모두 영구 삭제되었습니다."
                  errorTitle="보관함 비우기에 실패했습니다."
                  errorCause="알림 보관함을 비우는 중 서버 응답이 실패했습니다."
                  errorResolution="잠시 후 다시 시도해 주세요."
                  buttonVariant="destructive"
                  className="rounded-full px-5"
                >
                  보관함 비우기
                </DangerActionButton>
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
                  <ClientActionForm
                    action={restoreNotificationAction}
                    successTitle="알림이 복원되었습니다."
                    errorTitle="복원에 실패했습니다."
                    errorResolution="잠시 후 다시 시도해 주세요."
                    className="shrink-0"
                  >
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <SubmitButton variant="secondary" pendingLabel="복원 중..." className="whitespace-nowrap rounded-full px-4 py-1.5 text-xs">복원</SubmitButton>
                  </ClientActionForm>
                  <ImmediateDeleteForm notificationId={notification.id} />
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
