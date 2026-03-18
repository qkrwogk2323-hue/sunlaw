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
import { ImmediateDeleteForm } from '@/components/notifications/immediate-delete-form';
import { formatNotificationDate } from '@/lib/format';
import { requireAuthenticatedUser } from '@/lib/auth';
import { getNotificationCenter, getNotificationChannelPreferences, getNotificationQueueView, type NotificationQueueItem } from '@/lib/queries/notifications';

const PAGE_SIZE_OPTIONS = [10, 20, 40, 80] as const;

type QueueSectionKey = 'immediate' | 'confirm' | 'reference';
type QueueEntityType = 'case' | 'schedule' | 'client' | 'collaboration';
type WorkflowSectionKey = 'today' | 'review' | 'schedule' | 'communication' | 'reference';

function notificationOpenHref(notificationId: string, href: string, organizationId?: string | null) {
  const params = new URLSearchParams();
  params.set('href', href);
  if (organizationId) {
    params.set('organizationId', organizationId);
  }
  return `/notifications/open/${notificationId}?${params.toString()}`;
}

function entityLabel(entityType: QueueEntityType) {
  if (entityType === 'case') return '사건';
  if (entityType === 'schedule') return '일정';
  if (entityType === 'client') return '의뢰인';
  return '협업';
}

function workflowMeta(section: WorkflowSectionKey) {
  if (section === 'today') {
    return {
      label: '오늘 할 일',
      description: '지금 바로 처리하거나 확인해야 하는 업무입니다.',
      tone: 'red' as const,
      emptyText: '오늘 바로 처리할 항목이 없습니다.'
    };
  }

  if (section === 'review') {
    return {
      label: '검토 필요',
      description: '문서, 승인, 확인 요청처럼 검토가 필요한 항목을 모았습니다.',
      tone: 'amber' as const,
      emptyText: '현재 검토가 필요한 항목이 없습니다.'
    };
  }

  if (section === 'schedule') {
    return {
      label: '일정 / 약속',
      description: '캘린더와 일정 등록으로 이어지는 항목입니다.',
      tone: 'blue' as const,
      emptyText: '확인할 일정 알림이 없습니다.'
    };
  }

  if (section === 'communication') {
    return {
      label: '소통 / 연결',
      description: '조직 소통, 의뢰인 연결, 협업 흐름을 모았습니다.',
      tone: 'green' as const,
      emptyText: '새로 확인할 소통 항목이 없습니다.'
    };
  }

  return {
    label: '참고 / 완료',
    description: '읽었거나 정리된 항목을 다시 확인할 때 사용합니다.',
    tone: 'slate' as const,
    emptyText: '참고용 알림이 없습니다.'
  };
}

function inferWorkflowSection(item: NotificationQueueItem): WorkflowSectionKey {
  if (item.status === 'read' || item.status === 'resolved' || item.status === 'archived') {
    return 'reference';
  }

  const text = `${item.title} ${item.type} ${item.actionLabel}`.toLowerCase();
  if (item.entityType === 'schedule' || /일정|회의|미팅|기일|마감|리마인더|캘린더/.test(text)) {
    return 'schedule';
  }

  if (/검토|승인|결재|확인 요청|문서|review|approval/.test(text)) {
    return 'review';
  }

  if (item.entityType === 'client' || item.entityType === 'collaboration' || /소통|대화|메시지|연결|가입신청|협업|의뢰인/.test(text)) {
    return 'communication';
  }

  return 'today';
}

function buildWorkflowSections(items: NotificationQueueItem[]) {
  return {
    today: items.filter((item) => inferWorkflowSection(item) === 'today'),
    review: items.filter((item) => inferWorkflowSection(item) === 'review'),
    schedule: items.filter((item) => inferWorkflowSection(item) === 'schedule'),
    communication: items.filter((item) => inferWorkflowSection(item) === 'communication'),
    reference: items.filter((item) => inferWorkflowSection(item) === 'reference')
  } satisfies Record<WorkflowSectionKey, NotificationQueueItem[]>;
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
  return '대시보드 소통창에서 확인';
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
          <form action={markNotificationResolvedAction}>
            <input type="hidden" name="notificationId" value={item.notificationId} />
            <SubmitButton variant="ghost" pendingLabel="처리 중..." className="h-8 px-3 text-xs">해결 처리</SubmitButton>
          </form>
        ) : null}

        {item.status === 'active' ? (
          <form action={markNotificationReadAction}>
            <input type="hidden" name="notificationId" value={item.notificationId} />
            <SubmitButton variant="ghost" pendingLabel="반영 중..." className="h-8 px-3 text-xs">읽음 처리</SubmitButton>
          </form>
        ) : null}

        {item.status === 'resolved' ? (
          <form action={moveNotificationToTrashAction}>
            <input type="hidden" name="notificationId" value={item.notificationId} />
            <SubmitButton variant="ghost" pendingLabel="이동 중..." className="h-8 px-3 text-xs">완료함 이동</SubmitButton>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function WorkflowSection({ section, items }: { section: WorkflowSectionKey; items: NotificationQueueItem[] }) {
  const meta = workflowMeta(section);
  const byEntity = (['case', 'schedule', 'client', 'collaboration'] as QueueEntityType[])
    .map((entityType) => ({ entityType, items: items.filter((item) => item.entityType === entityType) }))
    .filter((group) => group.items.length > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{meta.label}</CardTitle>
            <p className="mt-1 text-sm text-slate-500">{meta.description}</p>
          </div>
          <Badge tone={meta.tone}>{items.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length ? byEntity.map((group) => (
          <div key={group.entityType} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">{entityLabel(group.entityType)}</p>
              <Badge tone="slate">{group.items.length}</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {group.items.map((item) => <QueueItemRow key={item.notificationId} item={item} />)}
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-sm text-slate-500">
            {meta.emptyText}
          </div>
        )}
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
  const workflowSections = buildWorkflowSections(queueView.items);

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
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">오늘 할 일</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{workflowSections.today.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">검토 필요</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{workflowSections.review.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">새 알림</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{notificationCenter.summary.unreadCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <form method="get" action="/notifications" className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="whitespace-nowrap">검색</span>
            <input name="q" defaultValue={keyword} placeholder="제목 검색" className="h-9 w-40 rounded-lg border border-slate-200 px-2 text-sm" />
          </label>
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
            <button
              type="submit"
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:-translate-y-px hover:shadow-md"
            >
              검색/적용
            </button>
          </label>
        </form>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <form id="bulk-queue-form" action={bulkNotificationTransitionAction} className="flex flex-wrap items-center gap-2">
          <button type="submit" name="operation" value="read" className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
            선택 읽음
          </button>
          <button type="submit" name="operation" value="resolve" className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
            선택 해결
          </button>
          <button type="submit" name="operation" value="archive" className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
            선택 완료함 이동
          </button>
        </form>
        <form action={markAllNotificationsReadAction}>
          <SubmitButton variant="secondary" pendingLabel="반영 중...">모두 확인 표시</SubmitButton>
        </form>
      </div>

      {queueView ? (
        <div className="space-y-4">
          <WorkflowSection section="today" items={workflowSections.today} />
          <WorkflowSection section="review" items={workflowSections.review} />
          <WorkflowSection section="schedule" items={workflowSections.schedule} />
          <WorkflowSection section="communication" items={workflowSections.communication} />
          <WorkflowSection section="reference" items={workflowSections.reference} />
        </div>
      ) : null}

      <Card className="border-slate-100">
        <CardHeader><CardTitle>알림 수신 설정</CardTitle></CardHeader>
        <CardContent>
          <form action={updateNotificationChannelPreferenceAction} className="grid gap-3 md:grid-cols-2">
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
          </form>
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
                    <SubmitButton variant="secondary" pendingLabel="복원 중..." className="whitespace-nowrap rounded-full px-4 py-1.5 text-xs">복원</SubmitButton>
                  </form>
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
