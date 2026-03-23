import {
  emptyNotificationTrashAction,
  markNotificationReadAction,
  markNotificationResolvedAction,
  moveNotificationToTrashAction,
  updateNotificationChannelPreferenceAction
} from '@/lib/actions/notification-actions';
import { NotificationsArchiveButton } from '@/components/notifications-archive-button';
import { NotificationSectionWithPopup } from '@/components/notification-section-with-popup';
import Link from 'next/link';
import type { Route } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { DangerActionButton } from '@/components/ui/danger-action-button';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { UnifiedListSearch } from '@/components/ui/unified-list-search';
import { CollapsibleSettingsSection } from '@/components/ui/collapsible-settings-section';
import { formatNotificationDate } from '@/lib/format';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { getNotificationCenter, getNotificationChannelPreferences, getNotificationQueueView, type NotificationQueueItem } from '@/lib/queries/notifications';

type NotificationCategoryKey = 'immediate' | 'confirm' | 'meeting' | 'other';

function notificationOpenHref(notificationId: string, href: string, organizationId?: string | null) {
  const params = new URLSearchParams();
  params.set('href', href);
  if (organizationId) {
    params.set('organizationId', organizationId);
  }
  return `/notifications/open/${notificationId}?${params.toString()}`;
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

function categoryMeta(key: NotificationCategoryKey) {
  if (key === 'immediate') return { label: '즉시 필요', tone: 'red' as const, colorKey: 'rose' as const };
  if (key === 'confirm') return { label: '검토 필요', tone: 'blue' as const, colorKey: 'blue' as const };
  if (key === 'meeting') return { label: '미팅 알림', tone: 'green' as const, colorKey: 'violet' as const };
  return { label: '기타 알림', tone: 'slate' as const, colorKey: 'slate' as const };
}

function QueueItemRow({ item }: { item: NotificationQueueItem }) {
  const openHref = notificationOpenHref(item.notificationId, item.destinationUrl, item.organizationId);
  const usesGenericInbox = item.destinationUrl === '/notifications';

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
        <Link href={openHref as Route} prefetch className={buttonStyles({ size: 'sm', className: 'h-8 rounded-lg px-3 text-xs !text-white' })}>열기</Link>

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

        {(item.status === 'active' || item.status === 'read' || item.status === 'resolved') ? (
          <ClientActionForm action={moveNotificationToTrashAction} successTitle="보관함으로 이동했습니다.">
            <input type="hidden" name="notificationId" value={item.notificationId} />
            <SubmitButton variant="ghost" pendingLabel="이동 중..." className="h-8 px-3 text-xs">보관함</SubmitButton>
          </ClientActionForm>
        ) : null}
        {usesGenericInbox ? <Badge tone="amber">알림센터에서 확인</Badge> : null}
      </div>
    </div>
  );
}

function NotificationListSection({
  title,
  tone,
  colorKey,
  items
}: {
  title: string;
  tone: 'red' | 'blue' | 'green' | 'slate';
  colorKey: 'rose' | 'blue' | 'violet' | 'slate';
  items: NotificationQueueItem[];
}) {
  const totalCount = items.length;

  const colorStyles = {
    rose: {
      card: 'border-rose-200 bg-[linear-gradient(180deg,#fff5f5,#fff1f2)]',
      header: 'border-rose-100',
      title: 'text-rose-800',
      icon: '🔴',
      empty: 'border-rose-200 bg-rose-50'
    },
    blue: {
      card: 'border-blue-200 bg-[linear-gradient(180deg,#f0f8ff,#eff6ff)]',
      header: 'border-blue-100',
      title: 'text-blue-800',
      icon: '🔵',
      empty: 'border-blue-200 bg-blue-50'
    },
    violet: {
      card: 'border-violet-200 bg-[linear-gradient(180deg,#faf5ff,#f5f3ff)]',
      header: 'border-violet-100',
      title: 'text-violet-800',
      icon: '🟣',
      empty: 'border-violet-200 bg-violet-50'
    },
    slate: {
      card: 'border-slate-200 bg-[linear-gradient(180deg,#f8fafc,#f1f5f9)]',
      header: 'border-slate-100',
      title: 'text-slate-700',
      icon: '⚪',
      empty: 'border-slate-200 bg-slate-50'
    }
  };
  const cs = colorStyles[colorKey];

  return (
    <Card className={cs.card}>
      <CardHeader className={cs.header}>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className={cs.title}>{title}</CardTitle>
          <Badge tone={tone}>{totalCount}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length ? items.map((item) => <QueueItemRow key={item.notificationId} item={item} />) : (
          <div className={`rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500 ${cs.empty}`}>
            현재 표시할 알림이 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function NotificationsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; state?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const resolved = searchParams ? await searchParams : undefined;
  const keyword = `${resolved?.q ?? ''}`.trim();
  const state = `${resolved?.state ?? 'active'}` as 'active' | 'archived';
  const pageSize = 30;
  const buildFilterHref = ({
    nextState = state
  }: {
    nextState?: 'active' | 'archived';
  }) => {
    const params = new URLSearchParams();
    if (keyword) params.set('q', keyword);
    params.set('state', nextState);
    return `/notifications?${params.toString()}`;
  };

  const [notificationCenter, channelPreferences] = await Promise.all([
    getNotificationCenter(pageSize),
    getNotificationChannelPreferences()
  ]);

  const queueView = await getNotificationQueueView({
    limit: pageSize,
    q: keyword || null,
    state
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">알림센터</h1>
        <NotificationsArchiveButton archivedCount={notificationCenter.trashedNotifications.length} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link href={buildFilterHref({ nextState: 'active' }) as Route}
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center transition hover:bg-rose-100"
          aria-label={`즉시필요 알림 ${queueView.categories.immediate.length}건`}>
          <p className="text-xs font-semibold text-rose-700">즉시필요</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-rose-800">{queueView.categories.immediate.length}</p>
          <p className="mt-1 text-[10px] text-rose-600">업무일정 임박</p>
        </Link>
        <Link href={'#confirm' as Route}
          className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-center transition hover:bg-blue-100"
          aria-label={`검토필요 알림 ${queueView.categories.confirm.length}건`}>
          <p className="text-xs font-semibold text-blue-700">검토필요</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-blue-800">{queueView.categories.confirm.length}</p>
          <p className="mt-1 text-[10px] text-blue-600">요청·협업 알림</p>
        </Link>
        <Link href={'#meeting' as Route}
          className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-center transition hover:bg-violet-100"
          aria-label={`미팅알림 ${queueView.categories.meeting.length}건`}>
          <p className="text-xs font-semibold text-violet-700">미팅알림</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-violet-800">{queueView.categories.meeting.length}</p>
          <p className="mt-1 text-[10px] text-violet-600">미팅 일정</p>
        </Link>
        <Link href={'#other' as Route}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center transition hover:bg-slate-100"
          aria-label={`기타알림 ${queueView.categories.other.length}건`}>
          <p className="text-xs font-semibold text-slate-700">기타알림</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-800">{queueView.categories.other.length}</p>
          <p className="mt-1 text-[10px] text-slate-500">비용·기타</p>
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <UnifiedListSearch
          action="/notifications"
          defaultValue={keyword}
          placeholder="알림 제목 검색"
          ariaLabel="알림 센터 목록 검색"
          sticky
          hiddenFields={{
            state
          }}
        />
      </div>



      {state === 'archived' ? (
        <NotificationListSection
          title="보관함"
          tone="slate"
          colorKey="slate"
          items={notificationCenter.trashedNotifications.map((item: any) => ({
            notificationId: item.id,
            type: `${item.notification_type ?? item.kind ?? 'generic'}`,
            entityType: 'collaboration',
            entityId: item.case_id ?? null,
            priority: 'low',
            status: 'archived',
            destinationType: `${item.destination_type ?? 'internal_route'}`,
            destinationUrl: `${item.destination_url ?? '/notifications'}`,
            createdAt: item.created_at,
            title: item.title,
            actionLabel: `${item.action_label ?? '열기'}`,
            organizationId: item.organization_id ?? null,
            organizationName: item.organization?.name ?? null
          }))}
        />
      ) : (
        <div className="space-y-4">
          <div id="immediate">
            <NotificationSectionWithPopup title={categoryMeta('immediate').label} tone={categoryMeta('immediate').tone} colorKey={categoryMeta('immediate').colorKey} items={queueView.categories.immediate} />
          </div>
          <div id="confirm">
            <NotificationSectionWithPopup title={categoryMeta('confirm').label} tone={categoryMeta('confirm').tone} colorKey={categoryMeta('confirm').colorKey} items={queueView.categories.confirm} />
          </div>
          <div id="meeting">
            <NotificationSectionWithPopup title={categoryMeta('meeting').label} tone={categoryMeta('meeting').tone} colorKey={categoryMeta('meeting').colorKey} items={queueView.categories.meeting} />
          </div>
          <div id="other">
            <NotificationSectionWithPopup title={categoryMeta('other').label} tone={categoryMeta('other').tone} colorKey={categoryMeta('other').colorKey} items={queueView.categories.other} />
          </div>
        </div>
      )}

      <CollapsibleSettingsSection
        title="알림 수신 설정"
        description="카카오톡과 화면 알림 수신 범위를 필요할 때만 펼쳐서 조정하세요."
      >
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
      </CollapsibleSettingsSection>

      {state === 'archived' && notificationCenter.capabilities?.supportsTrash !== false ? (
        <div className="flex justify-end">
          <DangerActionButton
            action={emptyNotificationTrashAction}
            fields={{}}
            confirmTitle="보관함을 비울까요?"
            confirmDescription={`보관함의 알림 ${notificationCenter.trashedNotifications.length}건이 영구 삭제됩니다.`}
            confirmLabel="보관함 비우기"
            variant="danger"
            successTitle="보관함을 비웠습니다."
            errorTitle="보관함 비우기에 실패했습니다."
            errorResolution="잠시 후 다시 시도해 주세요."
            buttonVariant="destructive"
            className="rounded-xl px-4"
          >
            보관함 비우기
          </DangerActionButton>
        </div>
      ) : null}
    </div>
  );
}
