'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { BellRing, Bot, ChevronRight, Link2, Minus, Plus, Search, ShieldAlert, Sparkles, ThumbsDown } from 'lucide-react';
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
  title: string;
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
  body: string;
  is_internal: boolean;
  created_at: string;
  sender_role?: string | null;
  sender_profile_id?: string | null;
  recipient_profile_id?: string | null;
  case_id?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
  sender?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
};

type ScheduleItem = {
  id: string;
  title: string;
  schedule_kind: string;
  scheduled_start: string;
  location?: string | null;
  notes?: string | null;
  is_important?: boolean | null;
  case_id?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
};

type RequestItem = {
  id: string;
  title: string;
  status: string;
  request_kind?: string | null;
  due_at?: string | null;
  case_id?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
};

type BillingItem = {
  id: string;
  title: string;
  amount: number;
  status: string;
  due_on?: string | null;
  case_id?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
};

type NotificationItem = {
  id: string;
  title: string;
  body?: string;
  created_at: string;
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
  requester_name: string;
  requester_email?: string | null;
  status: string;
  request_note?: string | null;
  created_at: string;
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
  case_id: string;
  profile_id?: string | null;
  client_name: string;
  relation_label?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
};

type PartnerContact = {
  case_organization_id: string;
  case_id: string;
  organization_id: string;
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
  return message.body.replace(/\s+/g, ' ').trim();
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
  return message.body.replace(/\s+/g, ' ').trim();
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
    merged.sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
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
        .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
      const latestMessage = roomMessages[roomMessages.length - 1] ?? null;
      const readAt = scenarioReadState[member.profileId] ?? null;
      const unreadCount = scenarioMode
        ? roomMessages.filter((item) => item.sender_profile_id === member.profileId && (!readAt || new Date(item.created_at).getTime() > new Date(readAt).getTime())).length
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
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messageItems, orgRecipientMembershipId, scenarioMode, threadRooms]);

  const organizationRoomMessages = useMemo(() => {
    return messageItems
      .filter((item) => item.is_internal)
      .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
  }, [messageItems]);

  const communicationTitle = '조직 업무소통';
  const communicationHint = scenarioMode
    ? '버튼으로 조직 전체 흐름과 1:1 대화방을 전환해서 확인합니다.'
    : '조직 전체 소통방 하나로 운영하며 하루 지난 대화는 보관함으로 이동합니다.';
  const activeTargetLabel = '조직 전체 소통방';

  const sendMessage = () => {
    if (!messageInput.trim()) return;
    const resolvedCaseId = messageCaseId || data.caseOptions[0]?.id || '';
    if (!resolvedCaseId) return;

    const recipientMembershipIds = memberOptions.map((item) => item.membershipId);
    if (!recipientMembershipIds.length) return;

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

    if (!organizationId) return;

    startMessageTransition(async () => {
      const response = recipientMembershipIds.length === 1
        ? await fetch('/api/dashboard/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              organizationId,
              caseId: resolvedCaseId,
              content: messageInput,
              targetType: 'org',
              recipientMembershipId: recipientMembershipIds[0],
              isInternal: true
            })
          })
        : await Promise.all(recipientMembershipIds.map((membershipId) => fetch('/api/dashboard/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              organizationId,
              caseId: resolvedCaseId,
              content: messageInput,
              targetType: 'org',
              recipientMembershipId: membershipId,
              isInternal: true
            })
          })));

      if ((Array.isArray(response) && response.every((item) => item.ok)) || (!Array.isArray(response) && response.ok)) {
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
    communicationHint,
    teamMemberNameByProfileId,
    sendMessage,
    summarizeThread,
    commitCoordination
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
    communicationHint,
    teamMemberNameByProfileId,
    sendMessage,
    summarizeThread,
    commitCoordination
  } = communication;

  const pendingClientAccessCount = data.clientAccessQueue.filter((item) => item.status === 'pending').length;
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

  const summaryCards = [
    {
      label: '중요 알림',
      value: todayCaseFocus.length,
      helper: '오늘 바로 확인할 사건 기준',
      detail: '알림센터에서 즉시 처리 항목을 먼저 엽니다.',
      href: '/notifications?priority=urgent',
      className: 'border-rose-200 bg-rose-50/80',
      valueClassName: 'text-rose-950'
    },
    {
      label: '승인 요청',
      value: pendingClientAccessCount,
      helper: '검토 대기 중인 신규 요청',
      detail: '승인 또는 반려 후 연결 상태를 바로 갱신합니다.',
      href: '/notifications?section=immediate',
      className: 'border-emerald-200 bg-emerald-50/80',
      valueClassName: 'text-emerald-950'
    },
    {
      label: '후속 처리',
      value: approvedClientAccessCount,
      helper: '연결 이후 처리할 항목',
      detail: '허브, 사건, 비용 흐름으로 다음 작업을 이어갑니다.',
      href: '/notifications?section=confirm',
      className: 'border-violet-200 bg-violet-50/80',
      valueClassName: 'text-violet-950'
    }
  ];
  const plannerSourceLabel = plannerSource?.dataType ?? '-';
  const plannerSourceTimeLabel = plannerSource?.generatedAt ? formatDateTime(plannerSource.generatedAt) : '-';
  const coordinationSourceLabel = coordinationSource?.dataType ?? '-';
  const coordinationSourceTimeLabel = coordinationSource?.generatedAt ? formatDateTime(coordinationSource.generatedAt) : '-';

  const reportAiIssue = useCallback(async (payload: {
    aiFeature: 'home_ai_assistant' | 'ai_summary_card' | 'next_action_recommendation' | 'draft_assist' | 'anomaly_alert' | 'admin_copilot';
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
  const [workspaceSearch, setWorkspaceSearch] = useState('');
  const [workspaceSearchBusy, setWorkspaceSearchBusy] = useState(false);
  const [workspaceSearchHint, setWorkspaceSearchHint] = useState<string | null>(null);
  const [assistantQuestion, setAssistantQuestion] = useState('');
  const [assistantPending, setAssistantPending] = useState(false);
  const [assistantResult, setAssistantResult] = useState<DashboardAiAssistantResponse | null>(null);
  const [assistantRequestId, setAssistantRequestId] = useState<string | null>(null);
  const [draftKind, setDraftKind] = useState<'organization_message' | 'hub_message' | 'client_invite' | 'staff_invite'>('client_invite');
  const [draftPrompt, setDraftPrompt] = useState('');
  const [draftContextTitle, setDraftContextTitle] = useState(data.recentCases[0]?.title ?? '');
  const [draftPending, setDraftPending] = useState(false);
  const [draftResult, setDraftResult] = useState<DraftAssistResponse | null>(null);
  const [draftRequestId, setDraftRequestId] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveQuery, setArchiveQuery] = useState('');
  const [archiveAiHint, setArchiveAiHint] = useState<string | null>(null);
  const [nowText, setNowText] = useState(() => formatDateTime(new Date().toISOString()));
  const [aiAssistantOpen, setAiAssistantOpen] = useState(true);
  const [todoOpen, setTodoOpen] = useState(true);
  const [draftOpen, setDraftOpen] = useState(true);
  const [adminCopilotOpen, setAdminCopilotOpen] = useState(true);
  const startOfTodayIso = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }, []);
  const todayMessages = useMemo(
    () => organizationRoomMessages.filter((item) => new Date(item.created_at).toISOString() >= startOfTodayIso),
    [organizationRoomMessages, startOfTodayIso]
  );
  const archivedMessages = useMemo(
    () => organizationRoomMessages.filter((item) => new Date(item.created_at).toISOString() < startOfTodayIso),
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
  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowText(formatDateTime(new Date().toISOString()));
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!messageCaseId && data.caseOptions.length) {
      setMessageCaseId(data.caseOptions[0].id);
    }
  }, [data.caseOptions, messageCaseId, setMessageCaseId]);

  const runWorkspaceSearch = async () => {
    const keyword = workspaceSearch.trim();
    if (!keyword) return;
    setWorkspaceSearchBusy(true);
    setWorkspaceSearchHint(null);
    try {
      const response = await fetch(`/api/search/global?q=${encodeURIComponent(keyword)}&limit=5`, { cache: 'no-store' });
      if (!response.ok) {
        setWorkspaceSearchHint('검색 요청을 처리하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.');
        return;
      }
      const payload = await response.json() as {
        cases?: Array<{ id: string; title: string }>;
        clients?: Array<{ id: string; full_name: string }>;
        documents?: Array<{ id: string; case_id: string; title: string }>;
      };

      const targetCase = payload.cases?.[0];
      const targetClient = payload.clients?.[0];
      const targetDocument = payload.documents?.[0];

      if (targetCase?.id) {
        router.push(`/cases/${targetCase.id}` as Route);
        return;
      }
      if (targetClient?.id) {
        router.push(`/clients/profile-${targetClient.id}` as Route);
        return;
      }
      if (targetDocument?.case_id) {
        router.push(`/cases/${targetDocument.case_id}` as Route);
        return;
      }

      setWorkspaceSearchHint('검색 결과가 없습니다.');
    } catch {
      setWorkspaceSearchHint('검색 요청을 처리하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.');
    } finally {
      setWorkspaceSearchBusy(false);
    }
  };

  const runArchiveAiCheck = () => {
    const source = filteredArchivedMessages.slice(-120);
    if (!source.length) {
      setArchiveAiHint('보관함 대화가 없습니다.');
      return;
    }
    const lines = source.map((item) => item.body).join(' ');
    const scheduleMentions = (lines.match(/일정|기일|회의|미팅|마감|제출|캘린더/g) ?? []).length;
    const unresolvedMentions = (lines.match(/미확인|누락|재확인|보류|추가 확인/g) ?? []).length;
    setArchiveAiHint(
      `AI 점검 결과: 일정 관련 언급 ${scheduleMentions}건, 재확인 필요 언급 ${unresolvedMentions}건으로 감지되었습니다. 캘린더와 요청목록을 함께 확인하세요.`
    );
  };

  const summaryRows = [
    {
      label: '알림',
      detail: `읽지 않은 알림 ${data.unreadNotifications}건, 즉시 처리 ${data.actionableNotifications.length}건`,
      href: '/notifications?section=immediate' as Route
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
      <div className="rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f6f9fc)] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
              <Sparkles className="size-3.5 text-sky-700" />
              업무 허브
            </div>
            <h1 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">오늘 바로 처리할 일</h1>
            <p className="text-sm text-slate-600">중요 알림, 승인 요청, 후속 처리 항목을 같은 흐름에서 정리합니다.</p>
          </div>
          <div className="grid items-stretch gap-2 sm:grid-cols-3">
            {summaryCards.map((item) => (
              <Link
                key={item.label}
                href={item.href as Route}
                className={`flex h-full min-h-40 min-w-32 flex-col rounded-[1.35rem] border px-4 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(15,23,42,0.10)] ${item.className}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">{item.label}</p>
                  <ChevronRight className="size-4 shrink-0 text-slate-400" />
                </div>
                <p className={`my-4 flex flex-1 items-center justify-center text-3xl font-bold tabular-nums whitespace-nowrap ${item.valueClassName}`}>{item.value}</p>
                <p className="mt-3 text-xs font-medium text-slate-700">{item.helper}</p>
                <p className="mt-auto pt-3 text-xs leading-5 text-slate-500">{item.detail}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <div className="rounded-[1.6rem] border border-rose-200 bg-[linear-gradient(180deg,#fffafb,#fff1f4)] p-3.5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">운영 큐</p>
                <p className="mt-1 text-xs text-slate-500">알림 큐와 승인 요청을 같은 우선순위 기준으로 확인합니다.</p>
              </div>
              <Badge tone="red">우선순위</Badge>
            </div>
            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <BellRing className="size-4" />
                    조치 필요 알림
                  </div>
                  <Badge tone="blue">{data.actionableNotifications.length}</Badge>
                </div>
                {data.actionableNotifications.length ? (
                  data.actionableNotifications.slice(0, 3).map((item) => (
                    <Link
                      key={item.id}
                      href={toNotificationOpenHref(item)}
                      className="block rounded-2xl border border-rose-200 bg-white px-3 py-3 text-sm shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{item.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-600">{item.body}</p>
                          <p className="mt-2 text-[11px] font-medium text-rose-700">열면 관련 화면에서 바로 처리할 수 있습니다.</p>
                        </div>
                        <ChevronRight className="mt-0.5 size-4 shrink-0 text-slate-400" />
                      </div>
                      <p className="mt-2 text-xs font-medium text-rose-700">{notificationActionLabel(item)}</p>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-rose-200 bg-white px-3 py-6 text-sm text-slate-500">즉시 처리할 알림이 없습니다.</div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Link2 className="size-4" />
                    승인 및 연결 대기
                  </div>
                  <Badge tone="amber">{data.clientAccessQueue.length}</Badge>
                </div>
                {data.clientAccessQueue.length ? (
                  data.clientAccessQueue.slice(0, 3).map((item) => {
                    const organization = organizationRecord(item.organization);

                    return (
                      <Link
                        key={item.id}
                        href={'/clients' as Route}
                        className="block rounded-2xl border border-amber-200 bg-white px-3 py-3 text-sm shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50/40"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-slate-900">{item.requester_name}</p>
                          <Badge tone={item.status === 'pending' ? 'amber' : 'blue'}>{clientAccessStatusLabel(item.status)}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{organization?.name ?? '현재 조직'} · {formatDateTime(item.created_at)}</p>
                        {item.request_note ? <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-600">{item.request_note}</p> : null}
                        <p className="mt-2 text-[11px] font-medium text-amber-700">열면 승인 또는 연결 후속 작업으로 이어집니다.</p>
                      </Link>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-white px-3 py-6 text-sm text-slate-500">검토 중인 의뢰인 요청이 없습니다.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-sky-200 bg-[linear-gradient(180deg,#f9fdff,#eef8ff)]">
          <CardHeader className="border-sky-200/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>AI 업무 도우미</CardTitle>
                <p className="mt-1 text-sm text-slate-500">질문을 적으면 지금 어느 화면으로 가야 하는지 바로 안내합니다.</p>
              </div>
              <Badge tone="blue">홈</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                <span className="text-red-500" aria-hidden="true">*</span> 질문을 입력하면 바로 이동할 화면과 이유를 함께 알려드립니다.
              </p>
              <label htmlFor="dashboard-ai-question" className="text-sm font-medium text-slate-700">
                질문 <span className="text-red-500" aria-hidden="true">*</span>
              </label>
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

            <div className="rounded-[1.4rem] border border-sky-200 bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">오늘의 첫 확인</p>
                  <p className="mt-1 text-sm text-slate-600">{initialAiOverview.summary.headline}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600"
                  aria-label="AI 요약이 잘못됐나요? 피드백 보내기"
                  onClick={() => {
                    reportAiIssue({
                      aiFeature: 'ai_summary_card',
                      question: '오늘의 핵심 요약',
                      answer: initialAiOverview.summary.headline,
                      rationale: initialAiOverview.summary.bullets.join(' / '),
                      modelVersion: 'rules',
                      requestId: `summary:${initialAiOverview.summary.source.generatedAt}`
                    });
                  }}
                >
                  <ThumbsDown className="size-3.5" />
                  AI 결과가 틀렸나요?
                </Button>
                {summaryRows.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white"
                  >
                    <p className="font-semibold text-slate-900">{item.label}</p>
                    <p className="mt-1">{item.detail}</p>
                  </Link>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {initialAiOverview.summary.actions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href as Route}
                    className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-100"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
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
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-violet-200 bg-[linear-gradient(180deg,#fcfbff,#f5f0ff)]">
            <CardHeader className="border-violet-200/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>지금 해야 할 항목</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">역할과 현재 대기 흐름을 기준으로 우선순위를 제안합니다.</p>
                </div>
                <Badge tone="blue">{initialAiOverview.recommendations.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
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
                    question: '지금 해야 할 항목',
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
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-[linear-gradient(180deg,#fffdf7,#fff5dd)]">
            <CardHeader className="border-amber-200/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>갑자기 늘어난 항목 안내</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">평소보다 갑자기 늘었거나 한곳에 몰린 항목을 먼저 보여 줍니다.</p>
                </div>
                <Badge tone="amber">{initialAiOverview.anomalies.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {initialAiOverview.anomalies.length ? (
                initialAiOverview.anomalies.map((item) => (
                  <Link
                    key={`${item.href}:${item.title}`}
                    href={item.href as Route}
                    className="block rounded-2xl border border-amber-200 bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-amber-300"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <Badge tone={anomalyTone(item.severity)}>{item.severity === 'warning' ? '경고' : '주의'}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-white px-4 py-5 text-sm text-slate-600">지금은 눈에 띄는 급증이나 누락 흐름이 보이지 않습니다.</div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600"
                aria-label="AI 변화 알림이 잘못됐나요? 피드백 보내기"
                onClick={() => {
                  reportAiIssue({
                    aiFeature: 'anomaly_alert',
                    question: '갑자기 늘어난 항목 안내',
                    answer: initialAiOverview.anomalies.map((item) => item.title).join(' / ') || '특별히 늘어난 항목 없음',
                    rationale: initialAiOverview.anomalies.map((item) => item.detail).join(' / '),
                    modelVersion: 'rules',
                    requestId: `anomaly:${initialAiOverview.summary.source.generatedAt}`
                  });
                }}
              >
                <ThumbsDown className="size-3.5" />
                AI 결과가 틀렸나요?
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className={`grid gap-6 ${isPlatformAdmin ? 'xl:grid-cols-[0.95fr_1.05fr]' : 'xl:grid-cols-1'}`}>
        <Card className="border-emerald-200 bg-[linear-gradient(180deg,#fbfffd,#eefdf5)]">
          <CardHeader className="border-emerald-200/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>작성 보조</CardTitle>
                <p className="mt-1 text-sm text-slate-500">초대 문구, 허브 안내, 조직 공지 초안을 빠르게 만듭니다.</p>
              </div>
              <Badge tone="green">초안</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-500">
              <span className="text-red-500" aria-hidden="true">*</span> 작성 종류와 요청 내용을 입력하면 바로 초안이 만들어집니다.
            </p>
            <div className="grid gap-3 md:grid-cols-[180px_1fr]">
              <div className="space-y-2">
                <label htmlFor="draft-kind" className="text-sm font-medium text-slate-700">작성 종류</label>
                <select
                  id="draft-kind"
                  value={draftKind}
                  onChange={(event) => setDraftKind(event.target.value as typeof draftKind)}
                  className="h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="client_invite">의뢰인 초대</option>
                  <option value="staff_invite">구성원 초대</option>
                  <option value="hub_message">허브 안내</option>
                  <option value="organization_message">조직 공지</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="draft-context" className="text-sm font-medium text-slate-700">관련 제목</label>
                <Input
                  id="draft-context"
                  value={draftContextTitle}
                  onChange={(event) => setDraftContextTitle(event.target.value)}
                  placeholder="예: 베인 사건 보정 안내"
                  className="h-11 bg-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="draft-prompt" className="text-sm font-medium text-slate-700">
                초안 요청 <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <Textarea
                id="draft-prompt"
                value={draftPrompt}
                onChange={(event) => setDraftPrompt(event.target.value)}
                aria-required="true"
                placeholder="예: 보정기한이 이번 주 금요일이고, 재산관계 확인 서류를 꼭 보내 달라는 안내문을 부드럽게 작성해 줘"
                className="min-h-28 border-emerald-200 bg-white"
              />
            </div>
            <div className="flex flex-wrap gap-2">
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
              <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
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
          </CardContent>
        </Card>

        {isPlatformAdmin ? (
          <Card className="border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f6f8fb)]">
            <CardHeader className="border-slate-200/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>플랫폼 운영 직접 확인</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">플랫폼 운영 판단과 조정은 AI가 답하지 않습니다. 아래 운영 메뉴에서 직접 확인해 주세요.</p>
                </div>
                <Badge tone="amber">직접 확인</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                    <ShieldAlert className="size-4" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold">플랫폼 운영 질문은 AI가 답하지 않습니다.</p>
                    <p className="leading-6 text-amber-900">
                      조직 승인, 구독 조정, 조직 삭제, 운영 권한, 감사로그 판단 같은 항목은 AI 제안 없이 직접 확인하고 처리해야 합니다.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Link
                  href={'/admin/organization-requests' as Route}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-slate-300"
                >
                  <p className="font-semibold text-slate-900">조직 신청 관리</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">신청, 승인, 반려와 최근 기록을 직접 확인합니다.</p>
                </Link>
                <Link
                  href={'/admin/organizations' as Route}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-slate-300"
                >
                  <p className="font-semibold text-slate-900">조직 관리</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">조직 상태 변경, 비활성화, 삭제, 로그를 직접 확인합니다.</p>
                </Link>
                <Link
                  href={'/settings/subscription' as Route}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-slate-300"
                >
                  <p className="font-semibold text-slate-900">구독 관리</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">구독 상태와 제한, 변경 기록을 직접 확인합니다.</p>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
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

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{communicationTitle}</CardTitle>
                <p className="mt-1 text-sm text-slate-500">{communicationHint}</p>
                <p className="mt-1 text-xs text-slate-500">현재 시각: {nowText}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {scenarioMode ? <Badge tone="blue">가상 조직간 협업방</Badge> : null}
                {!scenarioMode ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="space-y-2">
                      <label htmlFor="workspace-search" className="text-sm font-medium text-slate-700">
                        통합 검색
                      </label>
                      <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="workspace-search"
                        value={workspaceSearch}
                        onChange={(event) => setWorkspaceSearch(event.target.value)}
                        placeholder="사건·의뢰인·문서 검색"
                        className="h-10 w-64 pl-9"
                      />
                    </div>
                    </div>
                    <Button variant="secondary" onClick={runWorkspaceSearch} disabled={workspaceSearchBusy || !workspaceSearch.trim()}>
                      {workspaceSearchBusy ? '확인 중...' : '확인'}
                    </Button>
                  </div>
                ) : null}
                <Badge tone="slate">조직 전체 소통방</Badge>
                {!scenarioMode ? (
                  <Button className="bg-sky-600 text-white hover:bg-sky-700" onClick={summarizeThread} disabled={coordinationPending || !visibleMessages.length}>
                    <Bot className="mr-2 size-4" />AI 일정 제안
                  </Button>
                ) : null}
                {!scenarioMode && canOpenArchive ? (
                  <Button variant="secondary" onClick={() => setArchiveOpen(true)}>
                    조직 업무소통 보관함
                  </Button>
                ) : null}
              </div>
              {!scenarioMode && workspaceSearchHint ? (
                <p className="text-xs text-slate-500">{workspaceSearchHint}</p>
              ) : null}
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
            <div className="flex h-[42rem] flex-col rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-base font-semibold text-slate-900">조직 전체 소통방</p>
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
                    <p className="px-2 py-12 text-center text-sm text-slate-500">오늘 작성된 조직 업무소통이 없습니다.</p>
                  )}
                </div>

                <div className="mt-3 space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="space-y-2">
                    <label htmlFor="organization-message-input" className="text-sm font-medium text-slate-700">
                      조직 소통 메시지 <span className="text-rose-600">*</span>
                    </label>
                  <Textarea
                    id="organization-message-input"
                    value={messageInput}
                    onChange={(event) => setMessageInput(event.target.value)}
                    aria-required="true"
                    placeholder="조직 전체 소통방에 메시지를 입력하세요."
                    className="min-h-24"
                  />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">하루 지난 대화는 자동으로 보관함에서 확인됩니다.</span>
                    <Button
                      onClick={sendMessage}
                      disabled={
                        messagePending
                        || !messageInput.trim()
                      }
                    >
                      {messagePending ? '전송 중...' : '대화 보내기'}
                    </Button>
                  </div>
                </div>

                {coordinationPreview ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">AI 요약 · 오늘 대화 실행 항목</p>
                        <p className="mt-1 text-sm text-slate-600">{coordinationPreview.summary}</p>
                        {coordinationSource ? <p className="mt-1 text-xs text-slate-500">출처: {coordinationSourceLabel} · {coordinationSourceTimeLabel}</p> : null}
                        {coordinationEstimate ? <p className="mt-1 text-xs text-amber-700">표기: 추정 (자동 실행 금지)</p> : null}
                      </div>
                      <Badge tone={providerTone(coordinationPreview.provider)}>{coordinationPreview.provider}</Badge>
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
                                <Badge tone={priorityTone(item.priority)}>{item.priority}</Badge>
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
                <p className="text-lg font-semibold text-slate-900">조직 업무소통 보관함</p>
                <p className="text-xs text-slate-500">하루 지난 대화만 보관됩니다. (관리자 전용)</p>
              </div>
              <Button variant="secondary" onClick={() => setArchiveOpen(false)}>닫기</Button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="space-y-2">
                <label htmlFor="archive-query" className="text-sm font-medium text-slate-700">
                  보관함 검색
                </label>
                <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="archive-query"
                  value={archiveQuery}
                  onChange={(event) => setArchiveQuery(event.target.value)}
                  placeholder="날짜, 작성자, 내용 검색"
                  className="h-10 w-72 pl-9"
                />
              </div>
              </div>
              <Button variant="secondary" onClick={runArchiveAiCheck}>
                <Bot className="mr-1 size-4" />
                AI 점검
              </Button>
            </div>
            {archiveAiHint ? <p className="mt-2 text-xs text-sky-700">{archiveAiHint}</p> : null}

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
                <p className="py-10 text-center text-sm text-slate-500">조건에 맞는 보관 대화가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
