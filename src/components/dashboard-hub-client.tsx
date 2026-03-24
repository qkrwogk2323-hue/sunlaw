'use client';

// audit-link-exempt: reason=대시보드 요약 위젯이라 개별 감사로그 버튼을 직접 두지 않음; fallback=각 메뉴의 상세 화면에서 기록 보기 버튼과 감사로그 링크를 제공함; expires=2026-06-30; approvedBy=codex

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { BellRing, Bot, ChevronRight, Link2, Minus, Plus, Search, ThumbsDown, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, segmentStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast-provider';
import type { DashboardAiAssistantResponse, DashboardAiOverview, DraftAssistResponse } from '@/lib/ai/dashboard-home';
import { getCaseStageLabel } from '@/lib/case-stage';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';

type PlatformScenarioMode = 'law_admin' | 'collection_admin' | 'other_admin';
const PLATFORM_SCENARIO_MEMBER_STORAGE_KEY = 'vs_platform_scenario_member';

type CaseOption = {
  id: string;
  title: string | null;
  reference_no?: string | null;
  case_status?: string | null;
  stage_key?: string | null;
  updated_at?: string | null;
};

type TeamMember = {
  id: string;
  role?: string | null;
  title?: string | null;
  profile?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
  } | Array<{
    id: string;
    full_name?: string | null;
    email?: string | null;
  }> | null;
};

type MessageItem = {
  id: string;
  body: string | null;
  is_internal: boolean | null;
  created_at: string | null;
  sender_role?: string | null;
  sender_profile_id?: string | null;
  recipient_profile_id?: string | null;
  case_id?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
  sender?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
};

type ScheduleItem = {
  id: string;
  title: string | null;
  schedule_kind: string | null;
  scheduled_start: string | null;
  location?: string | null;
  notes?: string | null;
  is_important?: boolean | null;
  case_id?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
};

type RequestItem = {
  id: string;
  title: string | null;
  status: string | null;
  request_kind?: string | null;
  due_at?: string | null;
  case_id?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
};

type BillingItem = {
  id: string;
  title: string | null;
  amount: number | null;
  status: string | null;
  due_on?: string | null;
  case_id?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
};

type NotificationItem = {
  id: string;
  title: string | null;
  body?: string;
  created_at: string | null;
  action_label?: string | null;
  action_href?: string | null;
  destination_url?: string | null;
  destination_type?: string | null;
  priority?: 'urgent' | 'normal' | 'low' | string | null;
  status?: 'active' | 'read' | 'resolved' | 'archived' | 'deleted' | string | null;
  entity_type?: 'case' | 'schedule' | 'client' | 'collaboration' | string | null;
  entity_id?: string | null;
  action_entity_type?: string | null;
  requires_action?: boolean | null;
  resolved_at?: string | null;
  organization_id?: string | null;
};

type ClientAccessQueueItem = {
  id: string;
  requester_name: string | null;
  requester_email?: string | null;
  status: string | null;
  request_note?: string | null;
  created_at: string | null;
  target_organization_id?: string | null;
  organization?: {
    name?: string | null;
    slug?: string | null;
  } | Array<{
    name?: string | null;
    slug?: string | null;
  }> | null;
};

type ClientContact = {
  id: string;
  case_id: string | null;
  profile_id?: string | null;
  client_name: string | null;
  relation_label?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
};

type PartnerContact = {
  case_organization_id: string;
  case_id: string | null;
  organization_id: string | null;
  organization_name: string;
  role?: string | null;
  membership_id: string;
  member_role?: string | null;
  profile?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
  } | null;
};

type OrganizationConversationMessage = {
  id: string;
  body: string;
  created_at: string;
  sender_name: string;
  sender_organization_name: string;
  recipient_organization_name: string;
  case_id?: string | null;
  case_title?: string | null;
};

type OrganizationConversationRoom = {
  id: string;
  partner_organization_id: string;
  partner_organization_name: string;
  topic: string;
  last_message_at: string;
  case_id?: string | null;
  case_title?: string | null;
  unread_count: number;
  messages: OrganizationConversationMessage[];
};

type PlannerTask = {
  title: string;
  summary: string;
  dueAt: string | null;
  scheduleKind: 'deadline' | 'meeting' | 'hearing' | 'reminder' | 'other';
  isImportant: boolean;
  reason: string;
  provider: 'openai' | 'gemini' | 'rules';
  setupHint: string | null;
};

type AiSourceMeta = {
  dataType: string;
  generatedAt: string;
  scope: Record<string, unknown>;
  filters: Record<string, unknown>;
};

type CoordinationChecklistItem = {
  id: string;
  label: string;
  detail: string;
  dueAt: string | null;
  priority: 'high' | 'medium' | 'low';
  notifyTarget: 'self' | 'manager' | 'assignee' | 'team';
};

type CoordinationPlan = {
  summary: string;
  reason: string;
  provider: 'openai' | 'gemini' | 'rules';
  setupHint: string | null;
  recommendedRecipientMode: 'self' | 'managers' | 'all' | 'one';
  checklist: CoordinationChecklistItem[];
};

type WorkItemLink = {
  id: string;
  link_type: string;
  target_id: string;
  display_label: string | null;
};

type WorkItem = {
  id: string;
  item_type: 'message' | 'task' | 'request' | 'instruction';
  title: string | null;
  body: string;
  status: 'open' | 'in_progress' | 'done' | 'canceled';
  priority: 'urgent' | 'normal' | 'low';
  assigned_profile_id: string | null;
  created_by: string;
  completed_by: string | null;
  completed_at: string | null;
  due_at: string | null;
  created_at: string;
  links: WorkItemLink[];
};

type DashboardSnapshot = {
  activeCases: number;
  pendingDocuments: number;
  pendingRequests: number;
  recentMessages: number;
  urgentSchedules: ScheduleItem[];
  recentCases: CaseOption[];
  caseOptions: CaseOption[];
  recentRequests: RequestItem[];
  recentMessageItems: MessageItem[];
  monthlyHighlights: ScheduleItem[];
  teamMembers: TeamMember[];
  pendingBillingCount: number;
  upcomingBilling: BillingItem[];
  unreadNotifications: number;
  unreadNotificationItems: NotificationItem[];
  clientAccessQueue: ClientAccessQueueItem[];
  actionableNotifications: NotificationItem[];
  clientContacts: ClientContact[];
  partnerContacts: PartnerContact[];
  organizationConversations: OrganizationConversationRoom[];
  recentWorkItems: WorkItem[];
};

function isManagementRole(role?: string | null) {
  return role === 'org_owner' || role === 'org_manager';
}

function senderName(message: MessageItem) {
  if (Array.isArray(message.sender)) return message.sender[0]?.full_name ?? '구성원';
  return message.sender?.full_name ?? '구성원';
}

function relatedTitle(value?: { title?: string | null } | Array<{ title?: string | null }> | null) {
  if (Array.isArray(value)) return value[0]?.title ?? null;
  return value?.title ?? null;
}

function profileRecord(value?: TeamMember['profile']) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function partnerProfileRecord(value?: PartnerContact['profile']) {
  return value ?? null;
}

function organizationRecord(value?: ClientAccessQueueItem['organization']) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toThreadPreview(message: MessageItem) {
  return (message.body ?? '').replace(/\s+/g, ' ').trim();
}

function priorityTone(priority: CoordinationChecklistItem['priority']) {
  if (priority === 'high') return 'amber';
  if (priority === 'low') return 'slate';
  return 'blue';
}

function providerTone(provider: 'openai' | 'gemini' | 'rules') {
  if (provider === 'gemini') return 'green';
  if (provider === 'openai') return 'blue';
  return 'amber';
}

function recommendationTone(priority: 'high' | 'medium' | 'low') {
  if (priority === 'high') return 'red';
  if (priority === 'low') return 'slate';
  return 'blue';
}

function anomalyTone(severity: 'warning' | 'notice') {
  return severity === 'warning' ? 'amber' : 'blue';
}

function priorityLabel(priority: CoordinationChecklistItem['priority']) {
  if (priority === 'high') return '높음';
  if (priority === 'medium') return '중간';
  return '낮음';
}

function providerLabel(provider: 'openai' | 'gemini' | 'rules') {
  if (provider === 'rules') return '기준 안내';
  return 'AI 응답';
}

function clientAccessStatusLabel(status: string) {
  if (status === 'pending') return '승인 대기';
  if (status === 'approved') return '사건 연결 대기';
  return '요청';
}

function notificationActionLabel(item: NotificationItem) {
  if (item.action_label) return item.action_label;
  if (item.action_entity_type === 'client_access_request') return '의뢰인 관리 열기';
  if (item.action_entity_type === 'support_access_request') return '지원 요청 보기';
  return '알림 보기';
}

function toNotificationOpenHref(item: NotificationItem) {
  const target = (item.destination_url ?? item.action_href ?? '').trim();
  if (!target.startsWith('/')) return '/notifications' as Route;
  const params = new URLSearchParams();
  params.set('href', target);
  if (item.organization_id) {
    params.set('organizationId', item.organization_id);
  }
  return `/notifications/open/${item.id}?${params.toString()}` as Route;
}

function scenarioMessageStorageKey(mode: PlatformScenarioMode) {
  return `vs_scenario_messages:${mode}`;
}

function scenarioReadStorageKey(mode: PlatformScenarioMode, userId: string) {
  return `vs_scenario_reads:${mode}:${userId}`;
}

function counterpartProfileId(message: MessageItem, currentUserId: string) {
  if (message.sender_profile_id === currentUserId) {
    return message.recipient_profile_id ?? null;
  }

  if (message.recipient_profile_id === currentUserId) {
    return message.sender_profile_id ?? null;
  }

  return message.sender_profile_id ?? null;
}

function previewText(message?: MessageItem | null) {
  if (!message) return '아직 대화가 없습니다.';
  return (message.body ?? '').replace(/\s+/g, ' ').trim();
}

function roomTargetLabel(message: MessageItem, currentUserId: string, teamMemberNameByProfileId: Record<string, string>) {
  const targetId = message.sender_profile_id === currentUserId
    ? message.recipient_profile_id
    : message.sender_profile_id;

  if (!targetId) return '조직 내부';
  return teamMemberNameByProfileId[targetId] ?? '조직 내부';
}

function useDashboardPlannerState({
  organizationId,
  caseOptions,
  memberOptions,
  router,
  onSuccess,
  onError
}: {
  organizationId: string | null;
  caseOptions: CaseOption[];
  memberOptions: Array<{ membershipId: string; profileId: string; label: string; roleLabel: string }>;
  router: ReturnType<typeof useRouter>;
  onSuccess: (title: string, opts?: { message?: string }) => void;
  onError: (title: string, opts?: { message?: string }) => void;
}) {
  const [plannerEnabled, setPlannerEnabled] = useState(true);
  const [plannerInput, setPlannerInput] = useState('');
  const [plannerPreview, setPlannerPreview] = useState<PlannerTask | null>(null);
  const [plannerCaseId, setPlannerCaseId] = useState(caseOptions[0]?.id ?? '');
  const [plannerSource, setPlannerSource] = useState<AiSourceMeta | null>(null);
  const [plannerEstimate, setPlannerEstimate] = useState(false);
  const [plannerRecipientMembershipId, setPlannerRecipientMembershipId] = useState('');
  const [plannerPending, startPlannerTransition] = useTransition();
  const effectivePlannerRecipientMembershipId = memberOptions.some((item) => item.membershipId === plannerRecipientMembershipId)
    ? plannerRecipientMembershipId
    : '';

  const selectedPlannerCase = caseOptions.find((item) => item.id === plannerCaseId) ?? null;

  const commitPlanner = () => {
    if (!organizationId || !plannerPreview || !plannerCaseId) return;

    startPlannerTransition(async () => {
      try {
        const response = await fetch('/api/dashboard-ai/commit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId,
            caseId: plannerCaseId,
            content: plannerInput,
            title: plannerPreview.title,
            summary: plannerPreview.summary,
            dueAt: plannerPreview.dueAt,
            scheduleKind: plannerPreview.scheduleKind,
            isImportant: plannerPreview.isImportant,
            recipientMembershipId: effectivePlannerRecipientMembershipId || null
          })
        });

        if (response.ok) {
          setPlannerInput('');
          setPlannerPreview(null);
          setPlannerSource(null);
          setPlannerEstimate(false);
          router.refresh();
          onSuccess('AI 플래너 일정이 등록되었습니다.', { message: `"${plannerPreview.title}" 일정이 사건에 추가되었습니다.` });
        } else {
          onError('일정 등록에 실패했습니다.', { message: '잠시 후 다시 시도해 주세요.' });
        }
      } catch {
        onError('일정 등록에 실패했습니다.', { message: '원인: 네트워크 연결 또는 응답 처리에 문제가 있습니다. 해결 방법: 연결 상태를 확인한 뒤 다시 시도해 주세요.' });
      }
    });
  };

  const generatePlannerPreview = () => {
    if (!organizationId || !plannerInput.trim()) return;

    startPlannerTransition(async () => {
      const response = await fetch('/api/dashboard-ai/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, content: plannerInput })
      });

      if (!response.ok) return;
      const payload = await response.json();
      setPlannerPreview(payload.preview ?? null);
      setPlannerSource((payload.source ?? null) as AiSourceMeta | null);
      setPlannerEstimate(Boolean(payload.estimate));
    });
  };

  return {
    plannerEnabled,
    setPlannerEnabled,
    plannerInput,
    setPlannerInput,
    plannerPreview,
    setPlannerPreview,
    plannerCaseId,
    setPlannerCaseId,
    plannerSource,
    plannerEstimate,
    plannerRecipientMembershipId: effectivePlannerRecipientMembershipId,
    setPlannerRecipientMembershipId,
    plannerPending,
    selectedPlannerCase,
    commitPlanner,
    generatePlannerPreview
  };
}

function useDashboardCommunicationState({
  organizationId,
  currentUserId,
  scenarioMode,
  data,
  router,
  onSuccess,
  onError
}: {
  organizationId: string | null;
  currentUserId: string;
  scenarioMode?: PlatformScenarioMode | null;
  data: DashboardSnapshot;
  router: ReturnType<typeof useRouter>;
  onSuccess: (title: string, opts?: { message?: string }) => void;
  onError: (title: string, opts?: { message?: string }) => void;
}) {
  const ALL_RECIPIENT_MEMBERSHIP_ID = '__all__';
  const [messageCaseId, setMessageCaseId] = useState(data.caseOptions[0]?.id ?? '');
  const [orgRecipientMembershipIdState, setOrgRecipientMembershipIdState] = useState(ALL_RECIPIENT_MEMBERSHIP_ID);
  const [targetSearch, setTargetSearch] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [coordinationPreview, setCoordinationPreview] = useState<CoordinationPlan | null>(null);
  const [coordinationSource, setCoordinationSource] = useState<AiSourceMeta | null>(null);
  const [coordinationEstimate, setCoordinationEstimate] = useState(false);
  const [selectedChecklistIds, setSelectedChecklistIds] = useState<string[]>([]);
  const [communicationView, setCommunicationView] = useState<'organization' | 'direct'>('organization');
  const [scenarioDraftMessages, setScenarioDraftMessages] = useState<MessageItem[]>([]);
  const [scenarioReadStateOverrides, setScenarioReadStateOverrides] = useState<Record<string, string>>({});
  const [selectedScenarioConversationIdState, setSelectedScenarioConversationIdState] = useState(data.organizationConversations[0]?.id ?? '');
  const [messagePending, startMessageTransition] = useTransition();
  const [coordinationPending, startCoordinationTransition] = useTransition();
  const scenarioCurrentUserId = useMemo(() => {
    if (!scenarioMode) return null;

    const fallbackMemberId = data.teamMembers[0]
      ? profileRecord(data.teamMembers[0].profile)?.id ?? data.teamMembers[0].id
      : null;

    if (typeof window === 'undefined') return fallbackMemberId;

    const raw = window.localStorage.getItem(PLATFORM_SCENARIO_MEMBER_STORAGE_KEY);
    const savedSelections = raw ? JSON.parse(raw) as Record<string, string> : {};
    const nextMemberId = savedSelections[scenarioMode];

    return data.teamMembers.some((member) => (profileRecord(member.profile)?.id ?? member.id) === nextMemberId)
      ? nextMemberId
      : fallbackMemberId;
  }, [data.teamMembers, scenarioMode]);
  const effectiveCurrentUserId = scenarioCurrentUserId ?? currentUserId;
  const selectedMessageCase = data.caseOptions.find((item) => item.id === messageCaseId) ?? null;

  const memberOptions = data.teamMembers
    .map((member) => ({
      membershipId: member.id,
      profileId: profileRecord(member.profile)?.id ?? '',
      label: profileRecord(member.profile)?.full_name || profileRecord(member.profile)?.email || '구성원',
      roleLabel: member.title || member.role || '구성원'
    }))
    .filter((item) => item.profileId && item.profileId !== effectiveCurrentUserId);

  const normalizedSearch = targetSearch.trim().toLowerCase();
  const filteredOrgMembers = memberOptions.filter((item) => {
    if (!normalizedSearch) return true;
    return `${item.label} ${item.roleLabel}`.toLowerCase().includes(normalizedSearch);
  });
  const orgRecipientMembershipId = orgRecipientMembershipIdState === ALL_RECIPIENT_MEMBERSHIP_ID
    ? ALL_RECIPIENT_MEMBERSHIP_ID
    : filteredOrgMembers.some((item) => item.membershipId === orgRecipientMembershipIdState)
      ? orgRecipientMembershipIdState
      : ALL_RECIPIENT_MEMBERSHIP_ID;
  const activeOrgRecipient = filteredOrgMembers.find((item) => item.membershipId === orgRecipientMembershipId) ?? null;
  const isOrganizationWideRoom = orgRecipientMembershipId === ALL_RECIPIENT_MEMBERSHIP_ID;
  const currentMemberProfile = data.teamMembers.find((member) => (profileRecord(member.profile)?.id ?? member.id) === effectiveCurrentUserId) ?? null;
  const persistedScenarioMessages = useMemo(() => {
    if (!scenarioMode || typeof window === 'undefined') return [] as MessageItem[];
    const rawMessages = window.localStorage.getItem(scenarioMessageStorageKey(scenarioMode));
    return rawMessages ? JSON.parse(rawMessages) as MessageItem[] : [];
  }, [scenarioMode]);
  const persistedScenarioReadState = useMemo(() => {
    if (!scenarioMode || typeof window === 'undefined') return {} as Record<string, string>;
    const rawReads = window.localStorage.getItem(scenarioReadStorageKey(scenarioMode, effectiveCurrentUserId));
    return rawReads ? JSON.parse(rawReads) as Record<string, string> : {};
  }, [effectiveCurrentUserId, scenarioMode]);
  const scenarioMessageItems = useMemo(() => {
    if (!scenarioMode) return data.recentMessageItems;
    const merged = [...scenarioDraftMessages, ...persistedScenarioMessages, ...data.recentMessageItems]
      .filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index);
    merged.sort((left, right) => new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime());
    return merged;
  }, [data.recentMessageItems, persistedScenarioMessages, scenarioDraftMessages, scenarioMode]);
  const scenarioReadState = useMemo(
    () => ({ ...persistedScenarioReadState, ...scenarioReadStateOverrides }),
    [persistedScenarioReadState, scenarioReadStateOverrides]
  );
  const messageItems = scenarioMode ? scenarioMessageItems : data.recentMessageItems;
  const teamMemberNameByProfileId = useMemo(() => Object.fromEntries(data.teamMembers.map((member) => {
    const profile = profileRecord(member.profile);
    return [profile?.id ?? member.id, profile?.full_name ?? member.title ?? '구성원'];
  })), [data.teamMembers]);
  const scenarioConversationRooms = data.organizationConversations;
  const selectedScenarioConversationId = scenarioConversationRooms.some((room) => room.id === selectedScenarioConversationIdState)
    ? selectedScenarioConversationIdState
    : scenarioConversationRooms[0]?.id ?? '';
  const activeScenarioConversation = scenarioConversationRooms.find((room) => room.id === selectedScenarioConversationId) ?? scenarioConversationRooms[0] ?? null;

  useEffect(() => {
    if (!scenarioMode) return;
    window.localStorage.setItem(scenarioMessageStorageKey(scenarioMode), JSON.stringify(scenarioMessageItems));
  }, [scenarioMessageItems, scenarioMode]);

  useEffect(() => {
    if (!scenarioMode) return;
    window.localStorage.setItem(scenarioReadStorageKey(scenarioMode, effectiveCurrentUserId), JSON.stringify(scenarioReadState));
  }, [effectiveCurrentUserId, scenarioMode, scenarioReadState]);

  const threadRooms = useMemo(() => {
    return memberOptions.map((member) => {
      const roomMessages = messageItems
        .filter((item) => item.is_internal)
        .filter((item) => counterpartProfileId(item, effectiveCurrentUserId) === member.profileId)
        .sort((left, right) => new Date(left.created_at ?? 0).getTime() - new Date(right.created_at ?? 0).getTime());
      const latestMessage = roomMessages[roomMessages.length - 1] ?? null;
      const readAt = scenarioReadState[member.profileId] ?? null;
      const unreadCount = scenarioMode
        ? roomMessages.filter((item) => item.sender_profile_id === member.profileId && (!readAt || new Date(item.created_at ?? 0).getTime() > new Date(readAt).getTime())).length
        : 0;

      return {
        ...member,
        messages: roomMessages,
        latestMessage,
        unreadCount,
        hasNew: unreadCount > 0,
        latestAt: latestMessage?.created_at ?? null
      };
    });
  }, [effectiveCurrentUserId, memberOptions, messageItems, scenarioMode, scenarioReadState]);

  const filteredThreadRooms = useMemo(() => threadRooms.filter((room) => {
    if (!normalizedSearch) return true;
    return `${room.label} ${room.roleLabel}`.toLowerCase().includes(normalizedSearch);
  }), [normalizedSearch, threadRooms]);

  const updateScenarioReadState = useCallback((profileId: string | null | undefined) => {
    if (!scenarioMode || !profileId) return;
    setScenarioReadStateOverrides((current) => ({
      ...current,
      [profileId]: current[profileId] ?? new Date().toISOString()
    }));
  }, [scenarioMode]);

  const setOrgRecipientMembershipId = useCallback((nextMembershipId: string) => {
    setOrgRecipientMembershipIdState(nextMembershipId);
    const nextRecipient = memberOptions.find((item) => item.membershipId === nextMembershipId);
    updateScenarioReadState(nextRecipient?.profileId);
  }, [memberOptions, updateScenarioReadState]);

  const setSelectedScenarioConversationId = useCallback((nextConversationId: string) => {
    setSelectedScenarioConversationIdState(nextConversationId);
  }, []);

  const visibleMessages = useMemo(() => {
    if (scenarioMode) {
      return threadRooms.find((room) => room.membershipId === orgRecipientMembershipId)?.messages ?? [];
    }

    return messageItems
      .filter((item) => item.is_internal)
      .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
  }, [messageItems, orgRecipientMembershipId, scenarioMode, threadRooms]);

  const organizationRoomMessages = useMemo(() => {
    return messageItems
      .filter((item) => item.is_internal)
      .sort((left, right) => new Date(left.created_at ?? 0).getTime() - new Date(right.created_at ?? 0).getTime());
  }, [messageItems]);

  const communicationTitle = '조직소통 대화방';
  const activeTargetLabel = '조직소통 대화방';

  const sendMessage = () => {
    if (!messageInput.trim()) return;
    // caseId는 선택 사항 — 연결 사건이 없어도 조직 내부 메시지로 전송 가능
    const resolvedCaseId = messageCaseId || data.caseOptions[0]?.id || null;

    // 전체 공유 시 recipientMembershipId 없이 1회, 특정 대상 선택 시 해당 1명에게 1회
    const targetMembershipId = isOrganizationWideRoom ? '' : orgRecipientMembershipId;

    if (scenarioMode && !organizationId) {
      startMessageTransition(async () => {
        const newMessage: MessageItem = {
          id: `scenario-message-${Date.now()}`,
          body: messageInput.trim(),
          is_internal: true,
          created_at: new Date().toISOString(),
          sender_role: 'staff',
          sender_profile_id: effectiveCurrentUserId,
          recipient_profile_id: activeOrgRecipient?.profileId ?? null,
          case_id: resolvedCaseId,
          cases: { title: selectedMessageCase?.title ?? '사건' },
          sender: { full_name: profileRecord(currentMemberProfile?.profile)?.full_name ?? '나' }
        };

        setScenarioDraftMessages((current) => [newMessage, ...current]);
        setMessageInput('');
      });
      return;
    }

    if (!organizationId) {
      onError('전송 불가', { message: '조직 정보가 없습니다. 페이지를 새로고침해 주세요.' });
      return;
    }

    startMessageTransition(async () => {
      const response = await fetch('/api/dashboard/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          caseId: resolvedCaseId,
          content: messageInput,
          targetType: 'org',
          recipientMembershipId: targetMembershipId,
          isInternal: true
        })
      });

      if (response.ok) {
        setMessageInput('');
        router.refresh();
        onSuccess('메시지가 전송되었습니다.');
      } else {
        onError('메시지 전송에 실패했습니다.', { message: '잠시 후 다시 시도해 주세요.' });
      }
    });
  };

  const summarizeThread = () => {
    if (!visibleMessages.length) return;
    const latestMessages = visibleMessages.slice(-8);
    const latestSummary = latestMessages.map((item) => `${senderName(item)}: ${previewText(item)}`).join(' / ');
    const scheduleTalk = /일정|회의|미팅|기일|마감|내일|이번주|시간|오전|오후|달력|캘린더/.test(latestSummary);

    if (scheduleTalk) {
      const preview: CoordinationPlan = {
        summary: `${activeTargetLabel}와 대화를 하였는데, 일정에 등록할까요?`,
        reason: latestSummary,
        provider: 'rules',
        setupHint: '일정 관련 대화로 감지되었습니다. 체크 후 일정 등록을 진행하세요.',
        recommendedRecipientMode: 'one',
        checklist: [
          {
            id: 'schedule-register',
            label: '대화 기반 일정 등록',
            detail: '대화에서 언급한 날짜/시간을 캘린더 일정으로 등록합니다.',
            dueAt: null,
            priority: 'high',
            notifyTarget: 'self'
          }
        ]
      };
      setCoordinationPreview(preview);
      setCoordinationSource(null);
      setCoordinationEstimate(true);
      setSelectedChecklistIds(preview.checklist.map((item) => item.id));
      return;
    }

    if (scenarioMode && !organizationId) {
      const scenarioMessages = visibleMessages.slice(-4);
      const scenarioSummary = scenarioMessages.map((item) => `${senderName(item)}: ${previewText(item)}`).join(' / ');
      const preview: CoordinationPlan = {
        summary: `${activeTargetLabel}와 오늘 ${visibleMessages.length}건의 대화를 확인했습니다.`,
        reason: scenarioSummary,
        provider: 'rules',
        setupHint: '핵심 내용을 선택해 메모 또는 후속 작업으로 남길 수 있습니다.',
        recommendedRecipientMode: 'one',
        checklist: [
          {
            id: 'follow-up-1',
            label: `${activeTargetLabel} 후속 회신 여부 확인`,
            detail: '오늘 합의된 내용이 실제로 전달되었는지 다시 확인합니다.',
            dueAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            priority: 'high',
            notifyTarget: 'self'
          },
          {
            id: 'follow-up-2',
            label: '대화 메모 남기기',
            detail: '핵심 쟁점과 다음 액션을 짧게 정리해 대화방 기록으로 남깁니다.',
            dueAt: null,
            priority: 'medium',
            notifyTarget: 'self'
          }
        ]
      };

      setCoordinationPreview(preview);
      setSelectedChecklistIds(preview.checklist.map((item) => item.id));
      return;
    }

    if (!organizationId) return;

    const content = visibleMessages
      .slice(-8)
      .map((item) => `${senderName(item)}: ${item.body}`)
      .join('\n');

    startCoordinationTransition(async () => {
      const response = await fetch('/api/dashboard-ai/coordination-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, content })
      });

      if (!response.ok) return;
      const payload = await response.json();
      const preview = payload.preview as CoordinationPlan | null;
      setCoordinationPreview(preview);
      setCoordinationSource((payload.source ?? null) as AiSourceMeta | null);
      setCoordinationEstimate(Boolean(payload.estimate));
      setSelectedChecklistIds(preview?.checklist.map((item) => item.id) ?? []);
    });
  };

  const commitCoordination = () => {
    if (!messageCaseId || !coordinationPreview) return;
    const selectedItems = coordinationPreview.checklist.filter((item) => selectedChecklistIds.includes(item.id));
    if (!selectedItems.length) return;

    if (scenarioMode && !organizationId) {
      const memoMessage: MessageItem = {
        id: `scenario-summary-${Date.now()}`,
        body: `오늘 대화 정리\n- ${coordinationPreview.summary}\n${selectedItems.map((item) => `- ${item.label}: ${item.detail}`).join('\n')}`,
        is_internal: true,
        created_at: new Date().toISOString(),
        sender_role: 'staff',
        sender_profile_id: effectiveCurrentUserId,
        recipient_profile_id: activeOrgRecipient?.profileId ?? null,
        case_id: messageCaseId,
        cases: { title: selectedMessageCase?.title ?? '사건' },
        sender: { full_name: profileRecord(currentMemberProfile?.profile)?.full_name ?? '나' }
      };

      setScenarioDraftMessages((current) => [memoMessage, ...current]);
      setCoordinationPreview(null);
      setCoordinationSource(null);
      setCoordinationEstimate(false);
      setSelectedChecklistIds([]);
      return;
    }

    if (!organizationId) return;

    startCoordinationTransition(async () => {
      try {
        const response = await fetch('/api/dashboard-ai/coordination-commit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId,
            caseId: messageCaseId,
            title: `오늘 대화 AI 정리 · ${selectedMessageCase?.title ?? '사건 대화'}`,
            summary: coordinationPreview.summary,
            recipientMode: activeOrgRecipient ? 'one' : 'self',
            recipientMembershipId: activeOrgRecipient?.membershipId ?? null,
            selectedItems
          })
        });

        if (response.ok) {
          setCoordinationPreview(null);
          setCoordinationSource(null);
          setCoordinationEstimate(false);
          setSelectedChecklistIds([]);
          router.refresh();
          onSuccess('AI 조율 항목이 등록되었습니다.', { message: `${selectedItems.length}개 체크리스트가 사건 기록에 추가되었습니다.` });
        } else {
          onError('조율 항목 등록에 실패했습니다.', { message: '잠시 후 다시 시도해 주세요.' });
        }
      } catch {
        onError('조율 항목 등록에 실패했습니다.', { message: '원인: 네트워크 연결 또는 응답 처리에 문제가 있습니다. 해결 방법: 연결 상태를 확인한 뒤 다시 시도해 주세요.' });
      }
    });
  };

  return {
    messageCaseId,
    setMessageCaseId,
    orgRecipientMembershipId,
    setOrgRecipientMembershipId,
    targetSearch,
    setTargetSearch,
    messageInput,
    setMessageInput,
    coordinationPreview,
    setCoordinationPreview,
    coordinationSource,
    coordinationEstimate,
    selectedChecklistIds,
    setSelectedChecklistIds,
    communicationView,
    setCommunicationView,
    selectedScenarioConversationId,
    setSelectedScenarioConversationId,
    scenarioConversationRooms,
    activeScenarioConversation,
    messagePending,
    coordinationPending,
    effectiveCurrentUserId,
    selectedMessageCase,
    memberOptions,
    filteredOrgMembers,
    activeOrgRecipient,
    isOrganizationWideRoom,
    activeTargetLabel,
    currentMemberProfile,
    filteredThreadRooms,
    visibleMessages,
    organizationRoomMessages,
    communicationTitle,
    teamMemberNameByProfileId,
    sendMessage,
    summarizeThread,
    commitCoordination
  };
}

// ─── 문서 AI 분류 하드코딩 테이블 ───────────────────────────────────────────
// 향후 정부24, 홈텍스, 법원 전자소송 서류 추가 예정
type DocClassification = {
  kind: string;
  description: string;
  guidance: string;
  clientVisible: boolean;
};

function classifyDocumentByName(name: string): DocClassification {
  // 법원 문서
  if (name.includes('소장')) return { kind: '소장', description: '이 문서는 소장입니다. 법원에 제출된 소제기 서면으로, 청구 내용과 당사자 정보가 포함되어 있습니다.', guidance: '의뢰인에게 서류안내 시: 소장 사본을 의뢰인에게 전달하고 청구 취지와 원인을 설명해주세요.', clientVisible: true };
  if (name.includes('답변서')) return { kind: '답변서', description: '이 문서는 답변서입니다. 소장에 대한 피고 측의 방어 서면입니다.', guidance: '의뢰인에게 서류안내 시: 답변 기한 내 제출 여부를 확인하고 주요 반박 내용을 안내해주세요.', clientVisible: true };
  if (name.includes('준비서면')) return { kind: '준비서면', description: '이 문서는 준비서면입니다. 변론기일 전에 주장과 증거를 정리한 서면입니다.', guidance: '의뢰인에게 서류안내 시: 변론기일과 함께 준비서면 요지를 설명해주세요.', clientVisible: false };
  if (name.includes('판결문') || name.includes('판결')) return { kind: '판결문', description: '이 문서는 판결문입니다. 법원의 최종 판단이 담긴 문서입니다.', guidance: '의뢰인에게 서류안내 시: 주문과 이유를 요약해서 설명하고, 항소 기한(2주)을 반드시 안내해주세요.', clientVisible: true };
  if (name.includes('결정문') || name.includes('결정')) return { kind: '결정문', description: '이 문서는 결정문입니다. 본안 외 법원의 중간 판단입니다.', guidance: '의뢰인에게 서류안내 시: 결정의 효력과 불복 방법을 안내해주세요.', clientVisible: true };
  if (name.includes('가압류') || name.includes('가처분')) return { kind: '가압류/가처분', description: '이 문서는 가압류 또는 가처분 관련 서류입니다. 임시 보전조치 문서입니다.', guidance: '의뢰인에게 서류안내 시: 보전 대상 재산과 효력 범위를 설명해주세요.', clientVisible: false };
  if (name.includes('항소장')) return { kind: '항소장', description: '이 문서는 항소장입니다. 1심 판결에 불복하여 2심을 구하는 서면입니다.', guidance: '의뢰인에게 서류안내 시: 항소 이유서 제출 기한(항소 후 20일)을 반드시 안내해주세요.', clientVisible: true };
  if (name.includes('상고장')) return { kind: '상고장', description: '이 문서는 상고장입니다. 2심 판결에 불복하여 대법원에 제출하는 서면입니다.', guidance: '의뢰인에게 서류안내 시: 상고 이유서 제출 기한을 안내해주세요.', clientVisible: true };
  if (name.includes('조정') || name.includes('화해')) return { kind: '조정/화해조서', description: '이 문서는 조정 또는 화해 관련 서류입니다. 합의 내용을 정리한 문서입니다.', guidance: '의뢰인에게 서류안내 시: 합의 내용과 이행 기한을 설명해주세요.', clientVisible: true };
  // 파산/회생
  if (name.includes('파산') || name.includes('회생')) return { kind: '파산·회생 관련 서류', description: '이 문서는 파산 또는 개인회생 관련 서류입니다.', guidance: '의뢰인에게 서류안내 시: 신청 요건, 면책 기간, 채권자 목록 제출 방법을 안내해주세요.', clientVisible: false };
  // 의뢰인 제출 서류
  if (name.includes('주민등록') || name.includes('주민')) return { kind: '주민등록 서류', description: '이 문서는 주민등록 관련 서류입니다. (주민등록등본/초본)', guidance: '서류 발급 방법: 정부24(www.gov.kr) > 민원서비스 > 주민등록등본(초본) 발급. 인터넷 발급 또는 주민센터 방문 가능.', clientVisible: false };
  if (name.includes('가족관계') || name.includes('가족')) return { kind: '가족관계증명서', description: '이 문서는 가족관계증명서입니다.', guidance: '서류 발급 방법: 정부24(www.gov.kr) > 가족관계등록부 발급. 본인 또는 직계가족만 발급 가능.', clientVisible: false };
  if (name.includes('등기') || name.includes('부동산')) return { kind: '부동산 등기 서류', description: '이 문서는 부동산 등기 관련 서류입니다.', guidance: '서류 발급 방법: 대법원 인터넷등기소(www.iros.go.kr)에서 등기사항전부증명서 발급 가능.', clientVisible: false };
  if (name.includes('사업자') || name.includes('법인')) return { kind: '사업자/법인 서류', description: '이 문서는 사업자 또는 법인 관련 서류입니다.', guidance: '서류 발급 방법: 홈택스(www.hometax.go.kr) > 사업자등록증명 발급 또는 법원 법인등기 확인.', clientVisible: false };
  // 기본 분류
  if (name.endsWith('.pdf')) return { kind: 'PDF 문서', description: '이 문서는 PDF 파일입니다. 내용을 확인한 후 사건에 연결해 주세요.', guidance: '사건 페이지에서 서류 업로드 후 종류를 지정해주세요.', clientVisible: false };
  return { kind: '미분류 문서', description: '이 문서의 종류를 자동으로 파악하지 못했습니다. 직접 종류를 지정해주세요.', guidance: '사건 페이지에서 서류를 업로드하고 종류를 수동으로 지정해주세요.', clientVisible: false };
}

// ─── AI 문서 분석 분류표 (상세 안내 포함) ─────────────────────────────────────
type DocAnalysisResult = {
  kind: string;
  label: string;
  description: string;
  clientHint: string | null;
  updateHint: string;
};

function classifyDocumentName(name: string): DocAnalysisResult {
  if (/소장/.test(name)) return {
    kind: 'court',
    label: '소장',
    description: '이 소장은 원고가 법원에 제출하는 최초 청구 문서입니다. 사건번호, 청구취지, 청구원인을 확인해야 합니다.',
    clientHint: '의뢰인에게 소장 사본 전달 시, 법원 전자민원센터(ecf.scourt.go.kr)에서 사건 조회가 가능하다고 안내하세요.',
    updateHint: '해당 사건의 문서 탭에 업로드하면 관련 기록과 함께 관리됩니다.'
  };
  if (/답변서/.test(name)) return {
    kind: 'court',
    label: '답변서',
    description: '이 답변서는 피고가 소장에 대응하여 제출하는 문서입니다. 청구 인부(인정·부인)와 항변 사항을 포함합니다.',
    clientHint: '의뢰인에게 답변서 제출 기한(통상 30일)과 전자소송 시스템(ecfs.scourt.go.kr) 이용 방법을 안내하세요.',
    updateHint: '해당 사건 문서 탭에 업로드하여 소장과 함께 관리하세요.'
  };
  if (/준비서면/.test(name)) return {
    kind: 'court',
    label: '준비서면',
    description: '이 준비서면은 변론 전 당사자가 주장과 증거를 미리 정리하여 제출하는 문서입니다.',
    clientHint: null,
    updateHint: '해당 사건 문서 탭에 업로드하고, 기일 일정과 연결하여 관리하세요.'
  };
  if (/결정문|판결문/.test(name)) return {
    kind: 'court',
    label: /결정문/.test(name) ? '결정문' : '판결문',
    description: `이 ${/결정문/.test(name) ? '결정문' : '판결문'}은 법원이 발급한 공식 재판 결과 문서입니다. 주문, 이유, 선고일을 반드시 확인하세요.`,
    clientHint: '의뢰인에게 판결 주문 내용과 항소 기한(판결 송달일로부터 2주)을 설명하세요.',
    updateHint: '해당 사건 문서 탭에 업로드하고, 항소 여부 검토 일정을 캘린더에 등록하세요.'
  };
  if (/영장|구속/.test(name)) return {
    kind: 'court',
    label: '영장 / 구속 관련',
    description: '영장 또는 구속 관련 법원 문서입니다. 발부 일시, 혐의 내용, 유효기간을 확인하세요.',
    clientHint: null,
    updateHint: '해당 사건 문서 탭에 즉시 업로드하세요.'
  };
  if (/호적|등록부|가족관계/.test(name)) return {
    kind: 'registry',
    label: '가족관계등록부',
    description: '이 문서는 가족관계등록부(구 호적)로, 혼인·출생·사망 등 신분 관계를 확인하는 공식 서류입니다.',
    clientHint: '의뢰인에게 정부24(gov.kr) → "가족관계증명서" 검색 후 온라인 발급 방법을 안내하세요.',
    updateHint: '의뢰인 관리 또는 해당 사건 문서 탭에 업로드하세요.'
  };
  if (/초본|주민등록/.test(name)) return {
    kind: 'registry',
    label: '주민등록 초본',
    description: '주민등록 초본은 주소 이력과 주민번호가 포함된 공식 신분 서류입니다.',
    clientHint: '의뢰인에게 정부24(gov.kr) → "주민등록초본" 온라인 발급 방법을 안내하세요. 법원 제출용은 3개월 이내 발급본이어야 합니다.',
    updateHint: '해당 사건 문서 탭에 업로드하고, 발급일을 확인하세요.'
  };
  if (/등기부|등기/.test(name)) return {
    kind: 'registry',
    label: '등기부 등본',
    description: '등기부 등본은 부동산 소유권, 근저당, 전세권 등 물권 관계를 확인하는 문서입니다.',
    clientHint: '의뢰인에게 대법원 인터넷등기소(iros.go.kr)에서 온라인 발급 방법을 안내하세요.',
    updateHint: '해당 사건 문서 탭에 업로드하고, 근저당 설정일과 말소 여부를 확인하세요.'
  };
  if (/계약서/.test(name)) return {
    kind: 'contract',
    label: '계약서',
    description: '계약서 문서입니다. 계약 당사자, 목적물, 금액, 특약 사항을 확인하세요.',
    clientHint: null,
    updateHint: '계약 관리 메뉴 또는 해당 사건 문서 탭에 업로드하세요.'
  };
  if (/진단서|소견서|의무기록/.test(name)) return {
    kind: 'medical',
    label: '의료 문서',
    description: '진단서 또는 의무기록 관련 문서입니다. 진단명, 발급일, 발급 기관을 확인하세요.',
    clientHint: null,
    updateHint: '해당 사건 문서 탭에 업로드하고, 관련 일정과 연결하세요.'
  };
  return {
    kind: 'unknown',
    label: '문서',
    description: '이 문서의 종류를 자동으로 분류하지 못했습니다. 파일명에 문서 종류를 포함하면 더 정확하게 안내할 수 있습니다.',
    clientHint: null,
    updateHint: '해당 사건 또는 의뢰인 문서 탭에 업로드하여 관리하세요.'
  };
}

export function DashboardHubClient({
  organizationId,
  currentUserId,
  scenarioMode,
  data,
  isPlatformAdmin = false,
  initialAiOverview
}: {
  organizationId: string | null;
  currentUserId: string;
  scenarioMode?: PlatformScenarioMode | null;
  data: DashboardSnapshot;
  isPlatformAdmin?: boolean;
  initialAiOverview: DashboardAiOverview;
}) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const communication = useDashboardCommunicationState({
    organizationId,
    currentUserId,
    scenarioMode,
    data,
    router,
    onSuccess: toastSuccess,
    onError: toastError
  });
  const planner = useDashboardPlannerState({
    organizationId,
    caseOptions: data.caseOptions,
    memberOptions: communication.memberOptions,
    router,
    onSuccess: toastSuccess,
    onError: toastError
  });
  const {
    plannerEnabled,
    setPlannerEnabled,
    plannerInput,
    setPlannerInput,
    plannerPreview,
    setPlannerPreview,
    plannerCaseId,
    setPlannerCaseId,
    plannerSource,
    plannerEstimate,
    plannerRecipientMembershipId,
    setPlannerRecipientMembershipId,
    plannerPending,
    selectedPlannerCase,
    commitPlanner,
    generatePlannerPreview
  } = planner;
  const {
    messageCaseId,
    setMessageCaseId,
    orgRecipientMembershipId,
    setOrgRecipientMembershipId,
    targetSearch,
    setTargetSearch,
    messageInput,
    setMessageInput,
    coordinationPreview,
    setCoordinationPreview,
    coordinationSource,
    coordinationEstimate,
    selectedChecklistIds,
    setSelectedChecklistIds,
    communicationView,
    setCommunicationView,
    selectedScenarioConversationId,
    setSelectedScenarioConversationId,
    messagePending,
    coordinationPending,
    effectiveCurrentUserId,
    selectedMessageCase,
    memberOptions,
    filteredOrgMembers,
    activeOrgRecipient,
    isOrganizationWideRoom,
    activeTargetLabel,
    filteredThreadRooms,
    visibleMessages,
    organizationRoomMessages,
    scenarioConversationRooms,
    activeScenarioConversation,
    communicationTitle,
    teamMemberNameByProfileId,
    sendMessage,
    summarizeThread,
    commitCoordination
  } = communication;

  const pendingClientAccessCount = data.clientAccessQueue.filter((item) => item.status === 'pending').length;

  // 조직 업무 항목 로컬 상태 (서버 refetch 없이 낙관적 체크)
  const [workItems, setWorkItems] = useState<WorkItem[]>(data.recentWorkItems ?? []);
  const [workItemType, setWorkItemType] = useState<'message' | 'task' | 'request'>('message');
  const [workItemLinks, setWorkItemLinks] = useState<WorkItemLink[]>([]);
  const [workItemDueAt, setWorkItemDueAt] = useState('');
  const [workItemAssignee, setWorkItemAssignee] = useState('');
  const [workItemPending, startWorkItemTransition] = useTransition();

  const sendWorkItem = () => {
    if (!messageInput.trim()) return;
    if (!organizationId) {
      toastError('전송 불가', { message: '조직 정보가 없습니다. 페이지를 새로고침해 주세요.' });
      return;
    }
    if (workItemType === 'message') {
      sendMessage();
      return;
    }
    startWorkItemTransition(async () => {
      const response = await fetch('/api/dashboard/work-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          itemType: workItemType,
          content: messageInput,
          dueAt: workItemDueAt || null,
          assignedProfileId: workItemAssignee || null,
          links: workItemLinks.map((l) => ({ linkType: l.link_type, targetId: l.target_id, displayLabel: l.display_label }))
        })
      });
      if (response.ok) {
        const newItem: WorkItem = {
          id: `local-${Date.now()}`,
          item_type: workItemType,
          title: null,
          body: messageInput.trim(),
          status: 'open',
          priority: 'normal',
          assigned_profile_id: workItemAssignee || null,
          created_by: currentUserId,
          completed_by: null,
          completed_at: null,
          due_at: workItemDueAt || null,
          created_at: new Date().toISOString(),
          links: [...workItemLinks]
        };
        setWorkItems((prev) => [newItem, ...prev]);
        setMessageInput('');
        setWorkItemLinks([]);
        setWorkItemDueAt('');
        setWorkItemAssignee('');
        router.refresh();
        toastSuccess(workItemType === 'task' ? '할 일이 등록되었습니다.' : '요청사항이 등록되었습니다.');
      } else {
        toastError('등록 실패', { message: '잠시 후 다시 시도해 주세요.' });
      }
    });
  };

  const toggleWorkItemDone = (itemId: string, currentStatus: WorkItem['status']) => {
    if (!organizationId) return;
    const newStatus = currentStatus === 'done' ? 'open' : 'done';
    setWorkItems((prev) => prev.map((i) => i.id === itemId ? { ...i, status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null } : i));
    fetch('/api/dashboard/work-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workItemId: itemId, status: newStatus, organizationId })
    }).then((r) => { if (!r.ok) router.refresh(); });
  };

  const addCaseLinkChip = (caseId: string, caseTitle: string) => {
    if (workItemLinks.some((l) => l.link_type === 'case' && l.target_id === caseId)) return;
    setWorkItemLinks((prev) => [...prev, { id: `chip-${caseId}`, link_type: 'case', target_id: caseId, display_label: caseTitle }]);
  };


  const approvedClientAccessCount = data.clientAccessQueue.filter((item) => item.status === 'approved').length;
  const requestByCaseId = new Map(
    data.recentRequests
      .filter((item) => item.case_id)
      .map((item) => [item.case_id as string, item])
  );
  const alertByCaseId = new Map(
    data.unreadNotificationItems
      .filter((item) => (item.entity_type ?? item.action_entity_type) === 'case' && item.entity_id)
      .map((item) => [item.entity_id as string, item])
  );
  const todayCaseFocus = data.recentCases.slice(0, 5).map((item) => {
    const request = requestByCaseId.get(item.id);
    const alert = alertByCaseId.get(item.id);
    const nextAction = request
      ? `요청 처리 · ${request.title}`
      : alert
      ? `알림 확인 · ${alert.title}`
      : '사건 상세에서 다음 단계 갱신';

    return {
      ...item,
      nextAction
    };
  });

  const plannerSourceLabel = plannerSource?.dataType ?? '-';
  const plannerSourceTimeLabel = plannerSource?.generatedAt ? formatDateTime(plannerSource.generatedAt) : '-';
  const coordinationSourceLabel = coordinationSource?.dataType ?? '-';
  const coordinationSourceTimeLabel = coordinationSource?.generatedAt ? formatDateTime(coordinationSource.generatedAt) : '-';

  const reportAiIssue = useCallback(async (payload: {
    aiFeature: 'home_ai_assistant' | 'ai_summary_card' | 'next_action_recommendation' | 'draft_assist' | 'anomaly_alert';
    question: string;
    answer: string;
    rationale?: string;
    modelVersion?: string;
    requestId?: string;
  }) => {
    if (!organizationId) return;
    const reason = window.prompt('어떤 부분이 잘못됐나요? 간단히 설명해 주세요.');
    if (!reason?.trim()) return;
    try {
      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          aiFeature: payload.aiFeature,
          screen: '/dashboard',
          question: payload.question,
          answer: payload.answer,
          rationale: payload.rationale ?? '',
          modelVersion: payload.modelVersion ?? 'unknown',
          requestId: payload.requestId ?? '',
          reason: reason.trim(),
          status: '접수'
        })
      });
      if (!response.ok) {
        toastError('AI 피드백 저장 실패', { message: '잠시 후 다시 시도해 주세요.' });
        return;
      }
      toastSuccess('AI 피드백이 접수되었습니다.', { message: '검토 후 개선에 반영합니다.' });
    } catch {
      toastError('AI 피드백 저장 실패', { message: '네트워크 상태를 확인한 뒤 다시 시도해 주세요.' });
    }
  }, [organizationId, toastError, toastSuccess]);
  const [assistantQuestion, setAssistantQuestion] = useState('');
  const [assistantPending, setAssistantPending] = useState(false);
  const [assistantResult, setAssistantResult] = useState<DashboardAiAssistantResponse | null>(null);
  const [assistantRequestId, setAssistantRequestId] = useState<string | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docAnalyzing, setDocAnalyzing] = useState(false);
  const [docResult, setDocResult] = useState<{ kind: string; description: string; guidance: string; clientVisible: boolean } | null>(null);
  const [docAnalysis, setDocAnalysis] = useState<DocAnalysisResult | null>(null);
  const [draftKind, setDraftKind] = useState<'organization_message' | 'hub_message' | 'client_invite' | 'staff_invite'>('client_invite');
  const [draftPrompt, setDraftPrompt] = useState('');
  const [draftContextTitle, setDraftContextTitle] = useState(data.recentCases[0]?.title ?? '');
  const [draftPending, setDraftPending] = useState(false);
  const [draftResult, setDraftResult] = useState<DraftAssistResponse | null>(null);
  const [draftRequestId, setDraftRequestId] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveQuery, setArchiveQuery] = useState('');
  const [nowText, setNowText] = useState(() => formatDateTime(new Date().toISOString()));
  const [activeAiDialog, setActiveAiDialog] = useState<null | 'assistant' | 'todo'>(null);
  const [aiSectionCollapsed, setAiSectionCollapsed] = useState(true);
  const [expandedNotifCard, setExpandedNotifCard] = useState<null | 'immediate' | 'confirm' | 'meeting' | 'other'>(null);
  const [conversationExpanded, setConversationExpanded] = useState(false);
  const startOfTodayIso = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }, []);
  const todayMessages = useMemo(
    () => organizationRoomMessages.filter((item) => new Date(item.created_at ?? 0).toISOString() >= startOfTodayIso),
    [organizationRoomMessages, startOfTodayIso]
  );
  const archivedMessages = useMemo(
    () => organizationRoomMessages.filter((item) => new Date(item.created_at ?? 0).toISOString() < startOfTodayIso),
    [organizationRoomMessages, startOfTodayIso]
  );
  const filteredArchivedMessages = useMemo(() => {
    const keyword = archiveQuery.trim().toLowerCase();
    if (!keyword) return archivedMessages;
    return archivedMessages.filter((item) => {
      const caseTitle = relatedTitle(item.cases) ?? '';
      return `${senderName(item)} ${item.body} ${caseTitle}`.toLowerCase().includes(keyword);
    });
  }, [archiveQuery, archivedMessages]);
  const currentViewerMembership = useMemo(
    () =>
      data.teamMembers.find((member) => {
        const profileId = profileRecord(member.profile)?.id;
        return profileId === effectiveCurrentUserId || member.id === effectiveCurrentUserId;
      }) ?? null,
    [data.teamMembers, effectiveCurrentUserId]
  );
  const canOpenArchive = Boolean(currentViewerMembership && isManagementRole(currentViewerMembership.role));
  const toggleAiDialog = (panel: 'assistant' | 'todo') => {
    setAiSectionCollapsed(false);
    setActiveAiDialog((current) => (current === panel ? null : panel));
  };
  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowText(formatDateTime(new Date().toISOString()));
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!archiveOpen && !activeAiDialog) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (archiveOpen) setArchiveOpen(false);
      if (activeAiDialog) setActiveAiDialog(null);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAiDialog, archiveOpen]);
  useEffect(() => {
    if (!messageCaseId && data.caseOptions.length) {
      setMessageCaseId(data.caseOptions[0].id);
    }
  }, [data.caseOptions, messageCaseId, setMessageCaseId]);

  const immediateNotifications = useMemo(
    () => data.actionableNotifications.filter(
      (item) => item.requires_action &&
        (item.action_entity_type === 'schedule' || item.destination_url?.includes('/calendar'))
    ),
    [data.actionableNotifications]
  );

  const confirmNotifications = useMemo(
    () => data.actionableNotifications.filter(
      (item) => item.requires_action &&
        (item.action_entity_type === 'client' || item.action_entity_type === 'collaboration' ||
          item.destination_url?.includes('/clients') || item.destination_url?.includes('/inbox'))
    ),
    [data.actionableNotifications]
  );

  const meetingNotifications = useMemo(
    () => data.actionableNotifications.filter(
      (item) => item.action_entity_type === 'schedule' &&
        (item.destination_url?.includes('meeting') || item.title?.toLowerCase().includes('미팅'))
    ),
    [data.actionableNotifications]
  );

  const summaryRows = [
    {
      label: '알림',
      detail: `즉시필요 ${immediateNotifications.length}건 · 검토필요 ${confirmNotifications.length}건 · 미팅 ${meetingNotifications.length}건`,
      href: '/notifications' as Route
    },
    {
      label: '사건',
      detail: `진행 중 사건 ${data.activeCases}건, 요청 대기 ${data.pendingRequests}건`,
      href: '/cases' as Route
    },
    {
      label: '비용',
      detail: `납부 확인 필요 ${data.pendingBillingCount}건`,
      href: '/billing' as Route
    }
  ];

  const runAssistant = async () => {
    const question = assistantQuestion.trim();
    if (!question || !organizationId) return;
    setAssistantPending(true);
    try {
      const response = await fetch('/api/ai/home-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, question })
      });
      const payload = await response.json().catch(() => null) as ({ answer?: string; actions?: DashboardAiAssistantResponse['actions']; source?: DashboardAiAssistantResponse['source']; provider?: 'rules'; requestId?: string; cause?: string; resolution?: string } | null);
      if (!response.ok || !payload?.answer || !payload.actions || !payload.source || !payload.provider) {
        toastError('AI 업무 도우미 응답 실패', { message: payload?.resolution ?? payload?.cause ?? '잠시 후 다시 시도해 주세요.' });
        return;
      }
      setAssistantResult({
        answer: payload.answer,
        actions: payload.actions,
        source: payload.source,
        provider: payload.provider
      });
      setAssistantRequestId(payload.requestId ?? null);
    } catch {
      toastError('AI 업무 도우미 응답 실패', { message: '네트워크 상태를 확인한 뒤 다시 시도해 주세요.' });
    } finally {
      setAssistantPending(false);
    }
  };

  const analyzeDocument = async (file: File) => {
    setDocAnalyzing(true);
    setDocResult(null);
    setDocAnalysis(null);
    try {
      const name = file.name.toLowerCase();
      // 하드코딩 분류표 (향후 정부24/홈텍스 확장 예정)
      const classified = classifyDocumentByName(name);
      const analysis = classifyDocumentName(name);
      await new Promise((resolve) => setTimeout(resolve, 600)); // UX 딜레이
      setDocResult(classified);
      setDocAnalysis(analysis);
    } finally {
      setDocAnalyzing(false);
    }
  };

  const runDraftAssist = async () => {
    const prompt = draftPrompt.trim();
    if (!prompt || !organizationId) return;
    setDraftPending(true);
    try {
      const response = await fetch('/api/ai/draft-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          kind: draftKind,
          prompt,
          contextTitle: draftContextTitle
        })
      });
      const payload = await response.json().catch(() => null) as ({ title?: string; body?: string; shortBody?: string; provider?: 'rules'; requestId?: string; cause?: string; resolution?: string } | null);
      if (!response.ok || !payload?.title || !payload.body || !payload.shortBody || !payload.provider) {
        toastError('작성 보조 실패', { message: payload?.resolution ?? payload?.cause ?? '잠시 후 다시 시도해 주세요.' });
        return;
      }
      setDraftResult({
        title: payload.title,
        body: payload.body,
        shortBody: payload.shortBody,
        provider: payload.provider
      });
      setDraftRequestId(payload.requestId ?? null);
    } catch {
      toastError('작성 보조 실패', { message: '네트워크 상태를 확인한 뒤 다시 시도해 주세요.' });
    } finally {
      setDraftPending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 알림-일정 연동 요약 스트립 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setExpandedNotifCard(expandedNotifCard === 'immediate' ? null : 'immediate')}
          className={`rounded-xl border px-3 py-2 text-center transition ${expandedNotifCard === 'immediate' ? 'border-rose-400 bg-rose-100 ring-2 ring-rose-300' : 'border-rose-200 bg-rose-50 hover:bg-rose-100'}`}
          aria-label={`즉시필요 알림 ${immediateNotifications.length}건`}
          aria-expanded={expandedNotifCard === 'immediate'}
        >
          <p className="text-xs font-semibold text-rose-700">즉시필요</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-rose-800">{immediateNotifications.length}</p>
          <p className="mt-1 text-[10px] text-rose-600">업무일정 임박</p>
        </button>
        <button
          type="button"
          onClick={() => setExpandedNotifCard(expandedNotifCard === 'confirm' ? null : 'confirm')}
          className={`rounded-xl border px-3 py-2 text-center transition ${expandedNotifCard === 'confirm' ? 'border-blue-400 bg-blue-100 ring-2 ring-blue-300' : 'border-blue-200 bg-blue-50 hover:bg-blue-100'}`}
          aria-label={`검토필요 알림 ${confirmNotifications.length}건`}
          aria-expanded={expandedNotifCard === 'confirm'}
        >
          <p className="text-xs font-semibold text-blue-700">검토필요</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-blue-800">{confirmNotifications.length}</p>
          <p className="mt-1 text-[10px] text-blue-600">요청·협업 알림</p>
        </button>
        <button
          type="button"
          onClick={() => setExpandedNotifCard(expandedNotifCard === 'meeting' ? null : 'meeting')}
          className={`rounded-xl border px-3 py-2 text-center transition ${expandedNotifCard === 'meeting' ? 'border-violet-400 bg-violet-100 ring-2 ring-violet-300' : 'border-violet-200 bg-violet-50 hover:bg-violet-100'}`}
          aria-label={`미팅알림 ${meetingNotifications.length}건`}
          aria-expanded={expandedNotifCard === 'meeting'}
        >
          <p className="text-xs font-semibold text-violet-700">미팅알림</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-violet-800">{meetingNotifications.length}</p>
          <p className="mt-1 text-[10px] text-violet-600">미팅 일정</p>
        </button>
        <button
          type="button"
          onClick={() => setExpandedNotifCard(expandedNotifCard === 'other' ? null : 'other')}
          className={`rounded-xl border px-3 py-2 text-center transition ${expandedNotifCard === 'other' ? 'border-slate-400 bg-slate-100 ring-2 ring-slate-300' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
          aria-label={`기타알림 ${Math.max(0, data.unreadNotifications - immediateNotifications.length - confirmNotifications.length - meetingNotifications.length)}건`}
          aria-expanded={expandedNotifCard === 'other'}
        >
          <p className="text-xs font-semibold text-slate-700">기타알림</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-800">{Math.max(0, data.unreadNotifications - immediateNotifications.length - confirmNotifications.length - meetingNotifications.length)}</p>
          <p className="mt-1 text-[10px] text-slate-500">비용·기타</p>
        </button>
      </div>

      {expandedNotifCard === 'immediate' && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold text-rose-800">즉시필요 알림</p>
            <Link href={'/notifications?section=immediate' as Route} className="text-xs text-rose-600 underline hover:text-rose-800">전체보기 →</Link>
          </div>
          <div className="space-y-2">
            {immediateNotifications.slice(0, 5).map(item => (
              <div key={item.id} className="rounded-xl border border-white bg-white p-3 text-sm">
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.destination_url ? '열기 가능' : '확인 필요'}</p>
                <a href={item.destination_url ?? '/notifications'} className="mt-2 inline-flex text-xs text-rose-700 underline">열기</a>
              </div>
            ))}
            {immediateNotifications.length === 0 && <p className="py-4 text-center text-sm text-slate-500">현재 표시할 알림이 없습니다.</p>}
          </div>
        </div>
      )}

      {expandedNotifCard === 'confirm' && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold text-blue-800">검토필요 알림</p>
            <Link href={'/notifications?section=confirm' as Route} className="text-xs text-blue-600 underline hover:text-blue-800">전체보기 →</Link>
          </div>
          <div className="space-y-2">
            {confirmNotifications.slice(0, 5).map(item => (
              <div key={item.id} className="rounded-xl border border-white bg-white p-3 text-sm">
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.destination_url ? '열기 가능' : '확인 필요'}</p>
                <a href={item.destination_url ?? '/notifications'} className="mt-2 inline-flex text-xs text-blue-700 underline">열기</a>
              </div>
            ))}
            {confirmNotifications.length === 0 && <p className="py-4 text-center text-sm text-slate-500">현재 표시할 알림이 없습니다.</p>}
          </div>
        </div>
      )}

      {expandedNotifCard === 'meeting' && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold text-violet-800">미팅알림</p>
            <Link href={'/notifications' as Route} className="text-xs text-violet-600 underline hover:text-violet-800">전체보기 →</Link>
          </div>
          <div className="space-y-2">
            {meetingNotifications.slice(0, 5).map(item => (
              <div key={item.id} className="rounded-xl border border-white bg-white p-3 text-sm">
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.destination_url ? '열기 가능' : '확인 필요'}</p>
                <a href={item.destination_url ?? '/notifications'} className="mt-2 inline-flex text-xs text-violet-700 underline">열기</a>
              </div>
            ))}
            {meetingNotifications.length === 0 && <p className="py-4 text-center text-sm text-slate-500">현재 표시할 알림이 없습니다.</p>}
          </div>
        </div>
      )}

      {expandedNotifCard === 'other' && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold text-slate-800">기타알림</p>
            <Link href={'/notifications' as Route} className="text-xs text-slate-600 underline hover:text-slate-800">전체보기 →</Link>
          </div>
          <p className="py-4 text-center text-sm text-slate-500">알림센터에서 확인하세요.</p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'assistant' as const, title: 'AI 업무질의', badge: '질의' },
              { key: 'todo' as const, title: 'AI 스케줄도우미', badge: String(initialAiOverview.recommendations.length) }
            ].map((panel) => {
              const active = activeAiDialog === panel.key && !aiSectionCollapsed;
              return (
                <button
                  key={panel.key}
                  type="button"
                  onClick={() => toggleAiDialog(panel.key)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                    active
                      ? 'border-amber-500 bg-[linear-gradient(180deg,#fff7e7,#ffe9bf)] text-slate-950 shadow-[0_10px_20px_rgba(180,120,0,0.16)]'
                      : 'border-amber-200 bg-[linear-gradient(180deg,#fffdf7,#fff6de)] text-slate-900 hover:border-amber-300'
                  }`}
                >
                  <span>{panel.title}</span>
                  <Badge tone="blue">{panel.badge}</Badge>
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="h-10 w-10 rounded-xl p-0"
            aria-label={aiSectionCollapsed ? 'AI 섹션 펼치기' : 'AI 섹션 접기'}
            onClick={() => {
              setAiSectionCollapsed((current) => {
                const next = !current;
                if (next) setActiveAiDialog(null);
                return next;
              });
            }}
          >
            {aiSectionCollapsed ? <Plus className="size-4" /> : <Minus className="size-4" />}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{communicationTitle}</CardTitle>
                <p className="mt-1 text-xs text-slate-500">현재 시각: {nowText}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {scenarioMode ? <Badge tone="blue">가상 조직간 협업방</Badge> : null}
                {!scenarioMode ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 w-10 rounded-xl p-0"
                    aria-label={conversationExpanded ? '대화방 높이 줄이기' : '대화방 높이 늘리기'}
                    onClick={() => setConversationExpanded((current) => !current)}
                  >
                    {conversationExpanded ? <Minus className="size-4" /> : <Plus className="size-4" />}
                  </Button>
                ) : null}
                {!scenarioMode ? (
                  <Button className="bg-sky-600 text-white hover:bg-sky-700" onClick={summarizeThread} disabled={coordinationPending || !visibleMessages.length}>
                    <Bot className="mr-2 size-4" />대화정리 AI
                  </Button>
                ) : null}
                {!scenarioMode && canOpenArchive ? (
                  <Button variant="secondary" onClick={() => setArchiveOpen(true)}>
                    지난 대화로그
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {scenarioMode ? (
            <div className="flex h-[42rem] flex-col rounded-2xl border border-slate-200 bg-white p-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <label htmlFor="scenario-conversation-id" className="text-xs font-medium text-slate-500">
                    대화방 선택
                  </label>
                  <select
                    id="scenario-conversation-id"
                    value={selectedScenarioConversationId}
                    onChange={(event) => setSelectedScenarioConversationId(event.target.value)}
                    className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                  >
                    {scenarioConversationRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.partner_organization_name} · {room.topic}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{activeScenarioConversation?.partner_organization_name ?? '조직 대화방'}</p>
                    <p className="mt-1 text-sm text-slate-500">{activeScenarioConversation?.topic ?? '협업 흐름'} · {activeScenarioConversation?.case_title ?? '공통 협업'}</p>
                  </div>
                  <Badge tone="slate">조직간 스레드</Badge>
                </div>

                <div className="mt-3 flex-1 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-3">
                  {activeScenarioConversation?.messages.length ? activeScenarioConversation.messages.map((message) => {
                    const mine = message.sender_organization_name !== activeScenarioConversation.partner_organization_name;
                    return (
                      <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] rounded-[1.35rem] px-4 py-3 text-sm shadow-sm ${mine ? 'bg-slate-950 text-white' : 'bg-white text-slate-800'}`}>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] opacity-80">
                            <span>{message.sender_organization_name}</span>
                            <span>{message.sender_name}</span>
                            <span>{formatDateTime(message.created_at)}</span>
                            {message.case_title ? <Badge tone="slate">{message.case_title}</Badge> : null}
                          </div>
                          <p className="mt-2 whitespace-pre-wrap leading-6">{message.body}</p>
                        </div>
                      </div>
                    );
                  }) : <p className="px-2 py-12 text-center text-sm text-slate-500">선택한 조직 대화방 기록이 없습니다.</p>}
                </div>

                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  시나리오 모드에서는 조직간 협업 흐름을 읽기 전용으로 제공합니다. 이 방들을 기준으로 사건, 의뢰인, 일정, 문서가 서로 연결된 상태를 점검할 수 있습니다.
                </div>
            </div>
          ) : (
            <div className={`flex ${conversationExpanded ? 'h-[42rem]' : 'h-[28rem]'} flex-col rounded-2xl border border-slate-200 bg-white p-4`}>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <Badge tone="slate">오늘 대화 {todayMessages.length}건</Badge>
              </div>

                <div className="mt-3 flex-1 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-3">
                  {todayMessages.length ? (
                    todayMessages.map((item) => {
                      const mine = item.sender_profile_id === effectiveCurrentUserId;
                      return (
                        <div key={item.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[88%] rounded-[1.35rem] px-4 py-3 text-sm shadow-sm ${mine ? 'bg-slate-950 text-white' : 'bg-white text-slate-800'}`}>
                            <div className="flex items-center gap-2 text-[11px] opacity-80">
                              <span>{senderName(item)}</span>
                              <span>{formatDateTime(item.created_at)}</span>
                              {item.is_internal ? <Badge tone="slate">내부</Badge> : null}
                            </div>
                            <p className="mt-2 whitespace-pre-wrap leading-6">{item.body}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="px-2 py-12 text-center text-sm text-slate-500">오늘 작성된 조직소통 대화가 없습니다.</p>
                  )}
                </div>

                <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                  {/* 항목 유형 토글 */}
                  <div className="mb-2 flex gap-1.5">
                    {(['message', 'task', 'request'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setWorkItemType(type)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${workItemType === type ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        aria-pressed={workItemType === type}
                      >
                        {type === 'message' ? '💬 메시지' : type === 'task' ? '☑️ 할 일' : '📋 요청사항'}
                      </button>
                    ))}
                  </div>
                  {/* 사건 태그 칩 (task/request 전용) */}
                  {workItemType !== 'message' && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {workItemLinks.map((link) => (
                        <span
                          key={link.id}
                          className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-800"
                        >
                          {link.link_type === 'case' ? '사건' : link.link_type === 'client' ? '의뢰인' : '허브'}: {link.display_label ?? link.target_id.slice(0, 8)}
                          <button
                            type="button"
                            onClick={() => setWorkItemLinks((prev) => prev.filter((l) => l.id !== link.id))}
                            className="ml-0.5 text-blue-500 hover:text-blue-900"
                            aria-label={`${link.display_label} 태그 제거`}
                          >✕</button>
                        </span>
                      ))}
                      {/* 사건 검색 드롭다운 */}
                      {data.caseOptions.length > 0 && (
                        <details className="relative">
                          <summary className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-500 hover:border-slate-500 hover:text-slate-700">
                            + 사건 연결
                          </summary>
                          <div className="absolute left-0 top-7 z-30 max-h-48 w-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
                            {data.caseOptions.slice(0, 10).map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => { addCaseLinkChip(c.id, c.title ?? c.id.slice(0, 8)); }}
                                className="w-full px-4 py-2.5 text-left text-xs text-slate-800 hover:bg-slate-50"
                              >
                                {c.title ?? '(제목 없음)'}
                              </button>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                  {/* 기한 + 담당자 (task/request 전용) */}
                  {workItemType !== 'message' && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <label htmlFor="work-item-due-at" className="text-xs text-slate-500 whitespace-nowrap">기한</label>
                        <input
                          id="work-item-due-at"
                          type="datetime-local"
                          value={workItemDueAt}
                          onChange={(e) => setWorkItemDueAt(e.target.value)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
                        />
                      </div>
                      {data.teamMembers.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <label htmlFor="work-item-assignee" className="text-xs text-slate-500 whitespace-nowrap">담당자</label>
                          <select
                            id="work-item-assignee"
                            value={workItemAssignee}
                            onChange={(e) => setWorkItemAssignee(e.target.value)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
                          >
                            <option value="">미지정</option>
                            {data.teamMembers.map((member) => {
                              const profile = profileRecord(member.profile);
                              const profileId = profile?.id ?? member.id;
                              const name = profile?.full_name ?? profile?.email ?? '(이름 없음)';
                              return (
                                <option key={profileId} value={profileId}>{name}</option>
                              );
                            })}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-end gap-3">
                    <Textarea
                      id="organization-message-input"
                      value={messageInput}
                      onChange={(event) => setMessageInput(event.target.value)}
                      placeholder={workItemType === 'message' ? '조직소통 대화방에 메시지를 입력하세요.' : workItemType === 'task' ? '할 일 내용을 입력하세요.' : '요청사항 내용을 입력하세요.'}
                      className="min-h-24 flex-1"
                    />
                    <Button
                      onClick={sendWorkItem}
                      disabled={(workItemType === 'message' ? messagePending : workItemPending) || !messageInput.trim()}
                      className="min-h-24 rounded-2xl px-5"
                    >
                      {(workItemType === 'message' ? messagePending : workItemPending) ? '처리 중...' : workItemType === 'message' ? '대화 보내기' : workItemType === 'task' ? '할 일 등록' : '요청 등록'}
                    </Button>
                  </div>
                </div>

                {/* 업무 항목 목록 (task/request/instruction) */}
                {workItems.filter((i) => ['task', 'request', 'instruction'].includes(i.item_type) && i.status !== 'canceled').length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-500">할 일 · 요청사항</p>
                    {workItems
                      .filter((i) => ['task', 'request', 'instruction'].includes(i.item_type) && i.status !== 'canceled')
                      .slice(0, 8)
                      .map((item) => (
                        <label
                          key={item.id}
                          className={`flex cursor-pointer gap-3 rounded-2xl border px-4 py-3 transition ${item.status === 'done' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                        >
                          <input
                            type="checkbox"
                            checked={item.status === 'done'}
                            onChange={() => toggleWorkItemDone(item.id, item.status)}
                            className="mt-0.5 size-4 accent-emerald-600"
                            aria-label={`완료 체크: ${item.body.slice(0, 40)}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-sm font-medium ${item.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                {item.body.slice(0, 120)}
                              </span>
                              <Badge tone={item.item_type === 'request' ? 'amber' : 'blue'}>
                                {item.item_type === 'task' ? '할 일' : item.item_type === 'request' ? '요청' : '지시'}
                              </Badge>
                              {item.due_at && <span className="text-xs text-slate-500">{formatDate(item.due_at)}</span>}
                            </div>
                            {item.links.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {item.links.map((l) => (
                                  <span key={l.id} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">
                                    {l.link_type === 'case' ? '사건' : l.link_type === 'client' ? '의뢰인' : '허브'}: {l.display_label ?? l.target_id.slice(0, 8)}
                                  </span>
                                ))}
                              </div>
                            )}
                            {item.status === 'done' && item.completed_at && (
                              <p className="mt-0.5 text-xs text-emerald-600">완료 {formatDateTime(item.completed_at)}</p>
                            )}
                          </div>
                        </label>
                      ))}
                  </div>
                )}

                {coordinationPreview ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">대화정리 AI 제안</p>
                        <p className="mt-1 text-sm text-slate-600">{coordinationPreview.summary}</p>
                        <p className="mt-1 text-xs text-slate-500">필요한 내용을 할 일로 분류하고, 일정으로 등록할 만한 항목도 함께 제안합니다.</p>
                        {coordinationSource ? <p className="mt-1 text-xs text-slate-500">출처: {coordinationSourceLabel} · {coordinationSourceTimeLabel}</p> : null}
                        {coordinationEstimate ? <p className="mt-1 text-xs text-amber-700">표기: 추정 (자동 실행 금지)</p> : null}
                      </div>
                      <Badge tone={providerTone(coordinationPreview.provider)}>{providerLabel(coordinationPreview.provider)}</Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      {coordinationPreview.checklist.map((item) => {
                        const checked = selectedChecklistIds.includes(item.id);
                        return (
                          <label key={item.id} className="flex gap-3 rounded-2xl border border-emerald-200 bg-white px-3 py-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                setSelectedChecklistIds((current) => event.target.checked ? [...current, item.id] : current.filter((value) => value !== item.id));
                              }}
                              className="mt-1 size-4 rounded border-slate-300"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-slate-900">{item.label}</p>
                                <Badge tone={priorityTone(item.priority)}>{priorityLabel(item.priority)}</Badge>
                                {item.dueAt ? <span className="text-xs text-slate-500">{formatDateTime(item.dueAt)}</span> : null}
                              </div>
                              <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {coordinationPreview.setupHint ? <p className="mt-3 text-xs text-amber-700">{coordinationPreview.setupHint}</p> : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button onClick={commitCoordination} disabled={coordinationPending || !selectedChecklistIds.length}>정리 내용 반영</Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600"
                        aria-label="AI 대화 분석이 잘못됐나요? 피드백 보내기"
                        onClick={() => {
                          if (!coordinationPreview) return;
                          reportAiIssue({
                            aiFeature: 'ai_summary_card',
                            question: visibleMessages.slice(-8).map((item) => `${senderName(item)}: ${item.body}`).join('\n'),
                            answer: `${coordinationPreview.summary}\n${coordinationPreview.checklist.map((item) => `- ${item.label}`).join('\n')}`,
                            rationale: coordinationPreview.reason,
                            modelVersion: coordinationPreview.provider,
                            requestId: `coordination:${coordinationSource?.generatedAt ?? Date.now()}`
                          });
                        }}
                      >
                        <ThumbsDown className="size-3.5" />
                        AI 결과가 틀렸나요?
                      </Button>
                      <Button variant="secondary" onClick={() => setCoordinationPreview(null)}>닫기</Button>
                    </div>
                  </div>
                ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {archiveOpen && canOpenArchive ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_64px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">지난 대화로그</p>
                <p className="text-xs text-slate-500">최근 지난 대화를 다시 확인하는 공간입니다.</p>
              </div>
              <Button variant="secondary" onClick={() => setArchiveOpen(false)}>닫기</Button>
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="min-w-[16rem] flex-1 space-y-2">
                <label htmlFor="archive-query" className="text-sm font-medium text-slate-700">
                  지난 대화 검색
                </label>
                <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="archive-query"
                  value={archiveQuery}
                  onChange={(event) => setArchiveQuery(event.target.value)}
                  placeholder="날짜, 작성자, 내용 검색"
                  className="h-10 w-full pl-9"
                />
              </div>
              </div>
            </div>

            <div className="mt-3 max-h-[26rem] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {filteredArchivedMessages.length ? filteredArchivedMessages.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>{senderName(item)}</span>
                    <span>{formatDateTime(item.created_at)}</span>
                    {relatedTitle(item.cases) ? <Badge tone="slate">{relatedTitle(item.cases)}</Badge> : null}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{item.body}</p>
                </div>
              )) : (
                <p className="py-10 text-center text-sm text-slate-500">조건에 맞는 지난 대화가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {!aiSectionCollapsed && activeAiDialog === 'assistant' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-5xl rounded-2xl border border-amber-200 bg-white p-4 shadow-[0_24px_64px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bot className="size-5 text-amber-600" />
                <div>
                  <p className="text-lg font-semibold text-slate-900">AI 업무질의</p>
                  <p className="text-xs text-slate-500">문서를 올리거나 질문을 입력하면 바로 처리합니다.</p>
                </div>
              </div>
              <Button variant="secondary" onClick={() => setActiveAiDialog(null)}>닫기</Button>
            </div>
            <div className="mt-4 max-h-[72vh] space-y-4 overflow-y-auto pr-1">
            {/* AI 문서 분석 */}
            <div className="flex items-center gap-3">
              <label htmlFor="dashboard-doc-upload" className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100">
                <Upload className="size-3.5" aria-hidden="true" />
                {docFile ? docFile.name.substring(0, 20) + (docFile.name.length > 20 ? '...' : '') : '문서 분석'}
                <input
                  id="dashboard-doc-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.hwp,.png,.jpg,.jpeg"
                  aria-label="문서 파일 업로드"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setDocFile(file);
                    if (file) void analyzeDocument(file);
                  }}
                />
              </label>
              {docFile ? (
                <button
                  type="button"
                  onClick={() => { setDocFile(null); setDocAnalysis(null); }}
                  className="text-xs text-slate-400 hover:text-rose-600"
                  aria-label="선택 문서 삭제"
                >
                  ✕ 선택 취소
                </button>
              ) : null}
              {docAnalyzing ? <span className="text-xs text-sky-500">분석 중...</span> : null}
            </div>
            {docAnalysis ? (
              <div className="rounded-xl border border-sky-200 bg-white p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Bot className="size-4 text-sky-600 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-semibold text-sky-700">AI 분석 결과</span>
                  <Badge tone="blue">{docAnalysis.label}</Badge>
                </div>
                <p className="text-sm text-slate-800">{docAnalysis.description}</p>
                {docAnalysis.clientHint ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    <span className="font-semibold">의뢰인 서류 안내 방법: </span>{docAnalysis.clientHint}
                  </div>
                ) : null}
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  <span className="font-semibold">문서 업데이트: </span>{docAnalysis.updateHint}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                <span className="text-red-500" aria-hidden="true">*</span> 질문을 입력하면 바로 이동할 화면과 이유를 함께 알려드립니다.
              </p>
              <label htmlFor="dashboard-ai-question" className="text-sm font-medium text-slate-700">질문</label>
              <div className="flex flex-col gap-2 lg:flex-row">
                <Input
                  id="dashboard-ai-question"
                  value={assistantQuestion}
                  onChange={(event) => setAssistantQuestion(event.target.value)}
                  aria-required="true"
                  placeholder="예: 오늘 미읽음 많은 허브 보여줘 / 의뢰인 초대 어디서 해?"
                  className="h-11 bg-white"
                />
                <Button onClick={runAssistant} disabled={assistantPending || !assistantQuestion.trim() || !organizationId}>
                  {assistantPending ? '정리 중...' : '바로 찾기'}
                </Button>
              </div>
            </div>

            {/* AI 문서 분류 */}
            <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50/60 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-2">
                <Bot className="size-4 text-amber-600" />
                <p className="text-sm font-semibold text-slate-900">AI 문서 분류</p>
                <Badge tone="amber">AI</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">법원 문서 또는 의뢰인이 가져온 서류를 올리면 문서 종류와 처리 방법을 안내합니다.</p>
              <div className="mt-3">
                <label
                  htmlFor="doc-upload"
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-white px-4 py-6 text-sm text-slate-600 transition hover:border-amber-400 hover:bg-amber-50"
                  aria-label="문서 파일 업로드"
                >
                  <Search className="size-6 text-amber-500" />
                  <span className="font-medium text-slate-700">여기에 문서를 올려주세요</span>
                  <span className="text-xs text-slate-400">PDF, 이미지, Word 등 지원 · 클릭 또는 드래그</span>
                  {docFile ? <span className="mt-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">{docFile.name}</span> : null}
                  <input
                    id="doc-upload"
                    type="file"
                    className="sr-only"
                    accept=".pdf,.doc,.docx,.hwp,.hwpx,.png,.jpg,.jpeg,.gif,.webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setDocFile(file);
                      if (file) { void analyzeDocument(file); }
                    }}
                  />
                </label>
              </div>
              {docAnalyzing ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm text-slate-500">
                  <span className="inline-block animate-pulse">AI가 문서를 분석 중입니다...</span>
                </div>
              ) : null}
              {docResult ? (
                <div className="mt-3 space-y-2 rounded-xl border border-amber-200 bg-white px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Badge tone="amber">{docResult.kind}</Badge>
                    {docResult.clientVisible ? <Badge tone="blue">의뢰인 공개 가능</Badge> : <Badge tone="slate">조직 내부</Badge>}
                  </div>
                  <p className="text-sm leading-6 text-slate-700">{docResult.description}</p>
                  <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                    <span className="font-semibold">처리 방법 안내: </span>{docResult.guidance}
                  </div>
                  <p className="text-[10px] text-slate-400">* AI 자동 분류입니다. 사건 페이지에서 정확한 종류를 지정해주세요.</p>
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.4rem] border border-emerald-200 bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">초안 작성</p>
                  <p className="mt-1 text-sm text-slate-500">초대, 허브 안내, 조직 공지 초안을 바로 만듭니다.</p>
                </div>
                <Badge tone="green">초안</Badge>
              </div>
              <div className="mt-4 space-y-2">
                <label htmlFor="draft-context" className="text-sm font-medium text-slate-700">관련 제목</label>
                <Input
                  id="draft-context"
                  value={draftContextTitle}
                  onChange={(event) => setDraftContextTitle(event.target.value)}
                  placeholder="예: 베인 사건 보정 안내"
                  className="h-11 bg-white"
                />
              </div>
              <div className="mt-3 space-y-2">
                <label htmlFor="draft-prompt" className="text-sm font-medium text-slate-700">초안 요청</label>
                <Textarea
                  id="draft-prompt"
                  value={draftPrompt}
                  onChange={(event) => setDraftPrompt(event.target.value)}
                  placeholder="예: 보정기한이 이번 주 금요일이고, 재산관계 확인 서류를 꼭 보내 달라는 안내문을 부드럽게 작성해 줘"
                  className="min-h-28 border-emerald-200 bg-white"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={runDraftAssist} disabled={draftPending || !draftPrompt.trim() || !organizationId}>
                  {draftPending ? '초안 만드는 중...' : '초안 만들기'}
                </Button>
                {draftResult ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      reportAiIssue({
                        aiFeature: 'draft_assist',
                        question: draftPrompt,
                        answer: `${draftResult.title}\n${draftResult.body}`,
                        rationale: draftResult.shortBody,
                        modelVersion: draftResult.provider,
                        requestId: draftRequestId ?? undefined
                      });
                    }}
                  >
                    AI 결과가 틀렸나요?
                  </Button>
                ) : null}
              </div>
              {draftResult ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{draftResult.title}</p>
                    <Badge tone="green">{providerLabel(draftResult.provider)}</Badge>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{draftResult.body}</p>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                    짧은 문구 · {draftResult.shortBody}
                  </div>
                </div>
              ) : null}
            </div>
            {assistantResult ? (
              <div className="rounded-[1.4rem] border border-emerald-200 bg-[linear-gradient(180deg,#ffffff,#f3fff8)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">질문 답변</p>
                    <p className="mt-1 text-sm text-slate-600">{assistantResult.answer}</p>
                  </div>
                  <Badge tone="green">{providerLabel(assistantResult.provider)}</Badge>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {assistantResult.actions.map((action) => (
                    <Link
                      key={`${action.href}:${action.label}`}
                      href={action.href as Route}
                      className="rounded-2xl border border-emerald-200 bg-white px-3 py-3 text-sm shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-emerald-300"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{action.label}</p>
                          <p className="mt-1 leading-6 text-slate-600">{action.reason}</p>
                        </div>
                        <ChevronRight className="mt-0.5 size-4 shrink-0 text-slate-400" />
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>기준 시각 · {formatDateTime(assistantResult.source.generatedAt)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600"
                    aria-label="AI 답변이 잘못됐나요? 피드백 보내기"
                    onClick={() => {
                      reportAiIssue({
                        aiFeature: 'home_ai_assistant',
                        question: assistantQuestion,
                        answer: assistantResult.answer,
                        rationale: assistantResult.actions.map((item) => `${item.label}: ${item.reason}`).join(' / '),
                        modelVersion: assistantResult.provider,
                        requestId: assistantRequestId ?? undefined
                      });
                    }}
                  >
                    <ThumbsDown className="size-3.5" />
                    AI 결과가 틀렸나요?
                  </Button>
                </div>
              </div>
            ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {!aiSectionCollapsed && activeAiDialog === 'todo' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-amber-200 bg-white p-4 shadow-[0_24px_64px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bot className="size-5 text-amber-600" />
                <div>
                  <p className="text-lg font-semibold text-slate-900">AI 스케줄도우미</p>
                  <p className="text-xs text-slate-500">업무 우선순위와 다음 처리 순서를 정리합니다.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="blue">{initialAiOverview.recommendations.length}</Badge>
                <Button variant="secondary" onClick={() => setActiveAiDialog(null)}>닫기</Button>
              </div>
            </div>
            <div className="mt-4 max-h-[72vh] space-y-3 overflow-y-auto pr-1">
              {initialAiOverview.recommendations.map((item) => (
                <Link
                  key={`${item.href}:${item.title}`}
                  href={item.href as Route}
                  className="block rounded-2xl border border-violet-200 bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-violet-300"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <Badge tone={recommendationTone(item.priority)}>{item.priority === 'high' ? '우선' : item.priority === 'medium' ? '권장' : '여유'}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                </Link>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600"
                aria-label="AI 추천 항목이 잘못됐나요? 피드백 보내기"
                onClick={() => {
                  reportAiIssue({
                    aiFeature: 'next_action_recommendation',
                    question: 'AI 스케줄도우미',
                    answer: initialAiOverview.recommendations.map((item) => item.title).join(' / '),
                    rationale: initialAiOverview.recommendations.map((item) => item.detail).join(' / '),
                    modelVersion: 'rules',
                    requestId: `recommendation:${initialAiOverview.summary.source.generatedAt}`
                  });
                }}
              >
                <ThumbsDown className="size-3.5" />
                AI 결과가 틀렸나요?
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {false ? (
      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="border-amber-200 bg-[linear-gradient(180deg,#fffdf2,#fff8da)]">
          <CardHeader className="border-amber-200/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>다가오는 일정보기</CardTitle>
              </div>
              <Badge tone="amber">우선 확인</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.monthlyHighlights.length ? (
              data.monthlyHighlights.slice(0, 6).map((item) => (
                <Link
                  key={item.id}
                  href={(item.case_id ? `/cases/${item.case_id}` : '/calendar') as Route}
                  className="block rounded-2xl border border-amber-200/80 bg-white/80 px-4 py-4 transition hover:border-amber-300 hover:bg-white"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{relatedTitle(item.cases) ?? '공통 일정'} · {formatDateTime(item.scheduled_start)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.is_important ? <Badge tone="amber">중요</Badge> : null}
                      <Badge tone="blue">{item.schedule_kind}</Badge>
                    </div>
                  </div>
                  {item.location ? <p className="mt-2 text-sm text-slate-500">장소 · {item.location}</p> : null}
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-500">다가오는 일정이 없습니다.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-sky-200 bg-[linear-gradient(180deg,#eef8ff,#dff3ff)]">
          <CardHeader className="border-sky-200/80">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>AI 일정 도우미</CardTitle>
              </div>
              <div className="inline-flex rounded-full bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setPlannerEnabled(true)}
                  className={segmentStyles({ active: plannerEnabled, className: 'min-w-20 px-3 py-1.5' })}
                >
                  AI 켜짐
                </button>
                <button
                  type="button"
                  onClick={() => setPlannerEnabled(false)}
                  className={segmentStyles({ active: !plannerEnabled, className: 'min-w-20 px-3 py-1.5' })}
                >
                  AI 꺼짐
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {plannerEnabled ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="planner-case-id" className="text-sm font-medium text-slate-700">
                    대상 사건 <span className="text-rose-600">*</span>
                  </label>
                <select
                  id="planner-case-id"
                  value={plannerCaseId}
                  onChange={(event) => setPlannerCaseId(event.target.value)}
                  aria-required="true"
                  className="h-10 w-full rounded-xl border border-sky-200 bg-white px-3 text-sm text-slate-900"
                >
                  {data.caseOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="planner-input" className="text-sm font-medium text-slate-700">
                    일정 요청 내용 <span className="text-rose-600">*</span>
                  </label>
                <Textarea
                  id="planner-input"
                  value={plannerInput}
                  onChange={(event) => setPlannerInput(event.target.value)}
                  aria-required="true"
                  placeholder="예: 내일 오전 10시에 베인 사건 답변서 제출 일정 잡고, 담당자에게 알림까지 남겨줘"
                  className="min-h-28 border-sky-200 bg-white"
                />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={generatePlannerPreview} disabled={plannerPending || !organizationId || !plannerInput.trim()}>
                    {plannerPending ? 'AI 정리 중...' : '일정 초안 만들기'}
                  </Button>
                  <div className="min-w-56 space-y-2">
                    <label htmlFor="planner-recipient-membership-id" className="text-sm font-medium text-slate-700">
                      알림 대상
                    </label>
                    <select
                      id="planner-recipient-membership-id"
                      value={plannerRecipientMembershipId}
                      onChange={(event) => setPlannerRecipientMembershipId(event.target.value)}
                      className="h-10 w-full rounded-xl border border-sky-200 bg-white px-3 text-sm text-slate-900"
                    >
                      <option value="">알림 없이 저장</option>
                      {memberOptions.map((item) => (
                        <option key={item.membershipId} value={item.membershipId}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {plannerPreview ? (
                  <div className="rounded-2xl border border-sky-300 bg-white/88 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">이렇게 바꿀까요?</p>
                      <Badge tone={providerTone(plannerPreview!.provider)}>{plannerPreview!.provider}</Badge>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <p><span className="font-medium text-slate-900">대상 사건</span> · {selectedPlannerCase?.title ?? '미지정'}</p>
                      <p><span className="font-medium text-slate-900">제목</span> · {plannerPreview!.title}</p>
                      <p><span className="font-medium text-slate-900">설명</span> · {plannerPreview!.summary}</p>
                      <p><span className="font-medium text-slate-900">예정 시각</span> · {plannerPreview!.dueAt ? formatDateTime(plannerPreview!.dueAt) : '직접 확인 필요'}</p>
                      <p><span className="font-medium text-slate-900">판단 근거</span> · {plannerPreview!.reason}</p>
                      {plannerSource ? <p><span className="font-medium text-slate-900">출처</span> · {plannerSourceLabel} · {plannerSourceTimeLabel}</p> : null}
                      {plannerEstimate ? <p className="text-amber-700"><span className="font-medium">표기</span> · 추정 (자동 실행 금지)</p> : null}
                    </div>
                    {plannerPreview!.setupHint ? <p className="mt-3 text-xs text-amber-700">{plannerPreview!.setupHint}</p> : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button onClick={commitPlanner} disabled={plannerPending || !plannerCaseId || !organizationId}>초안 등록</Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600"
                        aria-label="AI 일정 초안이 잘못됐나요? 피드백 보내기"
                        onClick={() => {
                          if (!plannerPreview) return;
                          reportAiIssue({
                            aiFeature: 'home_ai_assistant',
                            question: plannerInput,
                            answer: `${plannerPreview.title}\n${plannerPreview.summary}`,
                            rationale: plannerPreview.reason,
                            modelVersion: plannerPreview.provider,
                            requestId: `planner:${plannerSource?.generatedAt ?? Date.now()}`
                          });
                        }}
                      >
                        <ThumbsDown className="size-3.5" />
                        AI 결과가 틀렸나요?
                      </Button>
                      <Button variant="secondary" onClick={() => setPlannerPreview(null)}>다시 작성</Button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-sky-300 bg-white/75 px-4 py-6 text-sm text-slate-600">AI 도우미를 다시 켜면 자연어 일정 초안과 요청 생성이 다시 보입니다.</div>
            )}
          </CardContent>
        </Card>
      </div>
      ) : null}
      {false ? (
      <Card className="border-slate-200 bg-white">
        <CardHeader className="border-slate-100">
          <CardTitle>보조 이동</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link
            href={'/notifications' as Route}
            className="inline-flex items-center rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition hover:border-sky-300 hover:bg-sky-50"
          >
            확인할 알림 {data.unreadNotifications}개
          </Link>
          <Link
            href={'/cases' as Route}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:bg-slate-50"
          >
            확인할 사건 {data.activeCases}개
          </Link>
          <Link
            href={'/calendar' as Route}
            className="inline-flex items-center rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition hover:border-amber-300 hover:bg-amber-50"
          >
            일정 확인
          </Link>
        </CardContent>
      </Card>
      ) : null}

    </div>
  );
}
