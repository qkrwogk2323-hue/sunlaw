'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { BellRing, Bot, ChevronRight, Link2, Search, Sparkles, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, segmentStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  if (!target.startsWith('/')) return '/dashboard' as Route;
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

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function inferConversationDueAt(content: string) {
  const now = new Date();
  const explicitDate = content.match(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (explicitDate) {
    const [, year, month, day, hour = '9', minute = '0'] = explicitDate;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).toISOString();
  }

  const koreanDate = content.match(/(\d{1,2})월\s*(\d{1,2})일(?:\s*(오전|오후))?(?:\s*(\d{1,2})시)?/);
  if (koreanDate) {
    const [, month, day, meridiem, hour = '9'] = koreanDate;
    let hourValue = Number(hour);
    if (meridiem === '오후' && hourValue < 12) hourValue += 12;
    if (meridiem === '오전' && hourValue === 12) hourValue = 0;
    const candidate = new Date(now.getFullYear(), Number(month) - 1, Number(day), hourValue, 0, 0, 0);
    if (candidate.getTime() < now.getTime()) {
      candidate.setFullYear(candidate.getFullYear() + 1);
    }
    return candidate.toISOString();
  }

  if (/내일/.test(content)) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + 1);
    candidate.setHours(9, 0, 0, 0);
    return candidate.toISOString();
  }

  if (/오늘/.test(content)) {
    const candidate = new Date(now);
    candidate.setHours(Math.max(now.getHours() + 1, 9), 0, 0, 0);
    return candidate.toISOString();
  }

  if (/이번주|금주/.test(content)) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + 3);
    candidate.setHours(10, 0, 0, 0);
    return candidate.toISOString();
  }

  return null;
}

function buildConversationSchedulePreview({
  activeTargetLabel,
  caseTitle,
  communicationView,
  content,
  messageCount
}: {
  activeTargetLabel: string;
  caseTitle: string;
  communicationView: 'organization' | 'direct';
  content: string;
  messageCount: number;
}): CoordinationPlan {
  const dueAt = inferConversationDueAt(content);
  const scheduleRelated = /일정|회의|미팅|통화|기일|재판|변론|마감|제출|회신|방문|면담|내일|오늘|이번주|\d{1,2}월|20\d{2}/.test(content);
  const counterpart = communicationView === 'organization' ? '구성원 전체 소통방' : activeTargetLabel;

  return {
    summary: `${counterpart}와 ${messageCount}건의 대화를 하였는데, 일정에 등록할까요?`,
    reason: content.slice(0, 220),
    provider: 'rules',
    setupHint: dueAt
      ? '대화에서 시간 표현을 찾아 일정 시점을 함께 제안했습니다.'
      : '대화에서 명확한 시점을 찾지 못해 우선 확인용 리마인더로 제안합니다.',
    recommendedRecipientMode: communicationView === 'direct' ? 'one' : 'self',
    checklist: [
      {
        id: 'conversation-schedule',
        label: dueAt ? `${caseTitle} 후속 일정 등록` : `${caseTitle} 후속 리마인더 등록`,
        detail: scheduleRelated
          ? `${counterpart}에서 오간 대화를 기준으로 후속 일정이 필요한 흐름을 감지했습니다.`
          : `${counterpart}에서 오간 대화는 후속 확인이 필요해 보여 기본 리마인더 일정을 제안합니다.`,
        dueAt,
        priority: scheduleRelated ? 'high' : 'medium',
        notifyTarget: communicationView === 'direct' ? 'assignee' : 'team'
      },
      {
        id: 'conversation-follow-up',
        label: `${caseTitle} 대화 메모 남기기`,
        detail: `${counterpart}와 나눈 핵심 쟁점과 다음 액션을 사건 기록으로 정리합니다.`,
        dueAt: null,
        priority: 'medium',
        notifyTarget: 'self'
      }
    ]
  };
}

function useDashboardPlannerState({
  organizationId,
  caseOptions,
  memberOptions,
  router
}: {
  organizationId: string | null;
  caseOptions: CaseOption[];
  memberOptions: Array<{ membershipId: string; profileId: string; label: string; roleLabel: string }>;
  router: ReturnType<typeof useRouter>;
}) {
  const [plannerEnabled, setPlannerEnabled] = useState(true);
  const [plannerInput, setPlannerInput] = useState('');
  const [plannerPreview, setPlannerPreview] = useState<PlannerTask | null>(null);
  const [plannerCaseId, setPlannerCaseId] = useState(caseOptions[0]?.id ?? '');
  const [plannerRecipientMembershipId, setPlannerRecipientMembershipId] = useState('');
  const [plannerPending, startPlannerTransition] = useTransition();

  const selectedPlannerCase = caseOptions.find((item) => item.id === plannerCaseId) ?? null;

  const commitPlanner = () => {
    if (!organizationId || !plannerPreview || !plannerCaseId) return;
    if (!window.confirm('이렇게 바꿀까요?')) return;

    startPlannerTransition(async () => {
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
          recipientMembershipId: plannerRecipientMembershipId || null
        })
      });

      if (response.ok) {
        setPlannerInput('');
        setPlannerPreview(null);
        router.refresh();
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
    });
  };

  useEffect(() => {
    if (!memberOptions.some((item) => item.membershipId === plannerRecipientMembershipId)) {
      queueMicrotask(() => {
        setPlannerRecipientMembershipId('');
      });
    }
  }, [memberOptions, plannerRecipientMembershipId]);

  return {
    plannerEnabled,
    setPlannerEnabled,
    plannerInput,
    setPlannerInput,
    plannerPreview,
    setPlannerPreview,
    plannerCaseId,
    setPlannerCaseId,
    plannerRecipientMembershipId,
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
  router
}: {
  organizationId: string | null;
  currentUserId: string;
  scenarioMode?: PlatformScenarioMode | null;
  data: DashboardSnapshot;
  router: ReturnType<typeof useRouter>;
}) {
  const [messageCaseId, setMessageCaseId] = useState(data.caseOptions[0]?.id ?? '');
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [orgRecipientMembershipId, setOrgRecipientMembershipId] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [coordinationPreview, setCoordinationPreview] = useState<CoordinationPlan | null>(null);
  const [selectedChecklistIds, setSelectedChecklistIds] = useState<string[]>([]);
  const [communicationView, setCommunicationView] = useState<'organization' | 'direct'>('organization');
  const [scenarioCurrentUserId, setScenarioCurrentUserId] = useState<string | null>(null);
  const [scenarioMessageItems, setScenarioMessageItems] = useState<MessageItem[]>(data.recentMessageItems);
  const [scenarioReadState, setScenarioReadState] = useState<Record<string, string>>({});
  const [selectedScenarioConversationId, setSelectedScenarioConversationId] = useState(data.organizationConversations[0]?.id ?? '');
  const [messagePending, startMessageTransition] = useTransition();
  const [coordinationPending, startCoordinationTransition] = useTransition();
  const effectiveCurrentUserId = scenarioCurrentUserId ?? currentUserId;
  const selectedMessageCase = data.caseOptions.find((item) => item.id === messageCaseId) ?? null;
  const normalizedCaseSearch = normalizeSearchValue(caseSearchQuery);
  const filteredCaseOptions = data.caseOptions.filter((item) => {
    if (!normalizedCaseSearch) return true;
    return `${item.title} ${item.reference_no ?? ''}`.toLowerCase().includes(normalizedCaseSearch);
  });

  const memberOptions = data.teamMembers
    .map((member) => ({
      membershipId: member.id,
      profileId: profileRecord(member.profile)?.id ?? '',
      label: profileRecord(member.profile)?.full_name || profileRecord(member.profile)?.email || '구성원',
      roleLabel: member.title || member.role || '구성원'
    }))
    .filter((item) => item.profileId && item.profileId !== effectiveCurrentUserId);

  const normalizedSearch = normalizeSearchValue(targetSearch);
  const filteredOrgMembers = memberOptions.filter((item) => {
    if (!normalizedSearch) return true;
    return `${item.label} ${item.roleLabel}`.toLowerCase().includes(normalizedSearch);
  });
  const activeOrgRecipient = filteredOrgMembers.find((item) => item.membershipId === orgRecipientMembershipId) ?? null;
  const currentMemberProfile = data.teamMembers.find((member) => (profileRecord(member.profile)?.id ?? member.id) === effectiveCurrentUserId) ?? null;
  const messageItems = scenarioMode ? scenarioMessageItems : data.recentMessageItems;
  const teamMemberNameByProfileId = useMemo(() => Object.fromEntries(data.teamMembers.map((member) => {
    const profile = profileRecord(member.profile);
    return [profile?.id ?? member.id, profile?.full_name ?? member.title ?? '구성원'];
  })), [data.teamMembers]);
  const scenarioConversationRooms = data.organizationConversations;
  const activeScenarioConversation = scenarioConversationRooms.find((room) => room.id === selectedScenarioConversationId) ?? scenarioConversationRooms[0] ?? null;

  useEffect(() => {
    queueMicrotask(() => {
      setScenarioMessageItems(data.recentMessageItems);
    });
  }, [data.recentMessageItems, scenarioMode]);

  useEffect(() => {
    if (!scenarioMode) return;

    const rawMessages = window.localStorage.getItem(scenarioMessageStorageKey(scenarioMode));
    const savedMessages = rawMessages ? JSON.parse(rawMessages) as MessageItem[] : [];
    const merged = [...savedMessages, ...data.recentMessageItems].filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index);
    merged.sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
    const rawReads = window.localStorage.getItem(scenarioReadStorageKey(scenarioMode, effectiveCurrentUserId));
    const nextReadState = rawReads ? JSON.parse(rawReads) as Record<string, string> : {};

    queueMicrotask(() => {
      setScenarioMessageItems(merged);
      setScenarioReadState(nextReadState);
    });
  }, [data.recentMessageItems, effectiveCurrentUserId, scenarioMode]);

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

  useEffect(() => {
    if (!scenarioMode) {
      queueMicrotask(() => {
        setScenarioCurrentUserId(null);
        setCommunicationView('organization');
      });
      return;
    }

    const raw = window.localStorage.getItem(PLATFORM_SCENARIO_MEMBER_STORAGE_KEY);
    const savedSelections = raw ? JSON.parse(raw) as Record<string, string> : {};
    const nextMemberId = savedSelections[scenarioMode];
    const fallbackMemberId = data.teamMembers[0] ? profileRecord(data.teamMembers[0].profile)?.id ?? data.teamMembers[0].id : null;
    const resolvedMemberId = data.teamMembers.some((member) => (profileRecord(member.profile)?.id ?? member.id) === nextMemberId)
      ? nextMemberId
      : fallbackMemberId;
    queueMicrotask(() => {
      setScenarioCurrentUserId(resolvedMemberId);
    });
  }, [data.teamMembers, scenarioMode]);

  useEffect(() => {
    if (!scenarioMode) return;

    if (!scenarioConversationRooms.some((room) => room.id === selectedScenarioConversationId)) {
      queueMicrotask(() => {
        setSelectedScenarioConversationId(scenarioConversationRooms[0]?.id ?? '');
      });
    }
  }, [scenarioConversationRooms, scenarioMode, selectedScenarioConversationId]);

  useEffect(() => {
    if (!filteredOrgMembers.length) {
      queueMicrotask(() => {
        setOrgRecipientMembershipId('');
      });
      return;
    }

    if (!filteredOrgMembers.some((member) => member.membershipId === orgRecipientMembershipId)) {
      queueMicrotask(() => {
        setOrgRecipientMembershipId(filteredOrgMembers[0].membershipId);
      });
    }
  }, [filteredOrgMembers, orgRecipientMembershipId]);

  useEffect(() => {
    if (!scenarioMode || !activeOrgRecipient?.profileId) return;
    queueMicrotask(() => {
      setScenarioReadState((current) => ({ ...current, [activeOrgRecipient.profileId]: new Date().toISOString() }));
    });
  }, [activeOrgRecipient?.profileId, scenarioMode]);

  const visibleMessages = useMemo(() => {
    if (scenarioMode) {
      return threadRooms.find((room) => room.membershipId === orgRecipientMembershipId)?.messages ?? [];
    }

    const caseMessages = messageItems
      .filter((item) => item.case_id === messageCaseId)
      .filter((item) => item.is_internal)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (communicationView === 'organization') {
      return caseMessages;
    }

    if (!activeOrgRecipient?.profileId) {
      return [] as MessageItem[];
    }

    return caseMessages.filter((item) => counterpartProfileId(item, effectiveCurrentUserId) === activeOrgRecipient.profileId);
  }, [activeOrgRecipient?.profileId, communicationView, effectiveCurrentUserId, messageCaseId, messageItems, orgRecipientMembershipId, scenarioMode, threadRooms]);

  const communicationTitle = '조직 업무소통';
  const communicationHint = scenarioMode
    ? '버튼으로 조직 전체 흐름과 1:1 대화방을 전환해서 확인합니다.'
    : '대시보드에서는 같은 조직 구성원 간 내부 협업만 지원합니다.';
    const activeTargetLabel = communicationView === 'organization'
      ? '구성원 전체 소통방'
      : activeOrgRecipient?.label ?? '상대방을 명시적으로 선택하세요.';

  const sendMessage = () => {
    if (!messageCaseId || !messageInput.trim()) return;

    const orgTargetMembershipId = communicationView === 'direct' ? activeOrgRecipient?.membershipId ?? '' : '';
    if (communicationView === 'direct' && !orgTargetMembershipId) return;

    if (scenarioMode && !organizationId) {
      startMessageTransition(async () => {
        const newMessage: MessageItem = {
          id: `scenario-message-${Date.now()}`,
          body: messageInput.trim(),
          is_internal: true,
          created_at: new Date().toISOString(),
          sender_role: 'staff',
          sender_profile_id: effectiveCurrentUserId,
          recipient_profile_id: communicationView === 'direct' ? activeOrgRecipient?.profileId ?? null : null,
          case_id: messageCaseId,
          cases: { title: selectedMessageCase?.title ?? '사건' },
          sender: { full_name: profileRecord(currentMemberProfile?.profile)?.full_name ?? '나' }
        };

        setScenarioMessageItems((current) => [newMessage, ...current]);
        setMessageInput('');
      });
      return;
    }

    if (!organizationId) return;

    startMessageTransition(async () => {
      const response = await fetch('/api/dashboard/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          caseId: messageCaseId,
          content: messageInput,
          targetType: 'org',
          recipientMembershipId: orgTargetMembershipId,
          isInternal: true
        })
      });

      if (response.ok) {
        setMessageInput('');
        router.refresh();
      }
    });
  };

  const summarizeThread = () => {
    if (!visibleMessages.length) return;

    const content = visibleMessages
      .slice(-8)
      .map((item) => `${senderName(item)}: ${item.body}`)
      .join('\n');
    const preview = buildConversationSchedulePreview({
      activeTargetLabel,
      caseTitle: selectedMessageCase?.title ?? '선택한 사건',
      communicationView,
      content,
      messageCount: visibleMessages.length
    });
    setCoordinationPreview(preview);
    setSelectedChecklistIds(preview.checklist.map((item) => item.id));
  };

  const commitCoordination = () => {
    if (!messageCaseId || !coordinationPreview) return;
    const selectedItems = coordinationPreview.checklist.filter((item) => selectedChecklistIds.includes(item.id));
    if (!selectedItems.length) return;

    if (scenarioMode && !organizationId) {
      const memoMessage: MessageItem = {
        id: `scenario-summary-${Date.now()}`,
        body: `[AI 일정 제안]\n- ${coordinationPreview.summary}\n${selectedItems.map((item) => `- ${item.label}: ${item.detail}`).join('\n')}`,
        is_internal: true,
        created_at: new Date().toISOString(),
        sender_role: 'staff',
        sender_profile_id: effectiveCurrentUserId,
        recipient_profile_id: communicationView === 'direct' ? activeOrgRecipient?.profileId ?? null : null,
        case_id: messageCaseId,
        cases: { title: selectedMessageCase?.title ?? '사건' },
        sender: { full_name: profileRecord(currentMemberProfile?.profile)?.full_name ?? '나' }
      };

      setScenarioMessageItems((current) => [memoMessage, ...current]);
      setCoordinationPreview(null);
      setSelectedChecklistIds([]);
      return;
    }

    if (!organizationId) return;
    if (!window.confirm('이렇게 바꿀까요?')) return;

    startCoordinationTransition(async () => {
      const response = await fetch('/api/dashboard-ai/coordination-commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          caseId: messageCaseId,
          title: `대화 기반 일정 제안 · ${selectedMessageCase?.title ?? '사건'}`,
          summary: coordinationPreview.summary,
          recipientMode: communicationView === 'direct' && activeOrgRecipient ? 'one' : 'self',
          recipientMembershipId: communicationView === 'direct' ? activeOrgRecipient?.membershipId ?? null : null,
          selectedItems
        })
      });

      if (response.ok) {
        setCoordinationPreview(null);
        setSelectedChecklistIds([]);
        router.refresh();
      }
    });
  };

  return {
    messageCaseId,
    setMessageCaseId,
    caseSearchQuery,
    setCaseSearchQuery,
    orgRecipientMembershipId,
    setOrgRecipientMembershipId,
    targetSearch,
    setTargetSearch,
    messageInput,
    setMessageInput,
    coordinationPreview,
    setCoordinationPreview,
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
    filteredCaseOptions,
    memberOptions,
    filteredOrgMembers,
    activeOrgRecipient,
    activeTargetLabel,
    activeConversationLabel: communicationView === 'organization' ? '조직 전체 대화' : '1:1 대화',
    currentMemberProfile,
    filteredThreadRooms,
    visibleMessages,
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
  data
}: {
  organizationId: string | null;
  currentUserId: string;
  scenarioMode?: PlatformScenarioMode | null;
  data: DashboardSnapshot;
}) {
  const router = useRouter();
  const [liveNow, setLiveNow] = useState(() => new Date());
  const communication = useDashboardCommunicationState({
    organizationId,
    currentUserId,
    scenarioMode,
    data,
    router
  });
  const planner = useDashboardPlannerState({
    organizationId,
    caseOptions: data.caseOptions,
    memberOptions: communication.memberOptions,
    router
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
    caseSearchQuery,
    setCaseSearchQuery,
    setOrgRecipientMembershipId,
    targetSearch,
    setTargetSearch,
    messageInput,
    setMessageInput,
    coordinationPreview,
    setCoordinationPreview,
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
    filteredCaseOptions,
    memberOptions,
    filteredOrgMembers,
    activeOrgRecipient,
    activeTargetLabel,
    activeConversationLabel,
    filteredThreadRooms,
    visibleMessages,
    scenarioConversationRooms,
    activeScenarioConversation,
    communicationTitle,
    communicationHint,
    teamMemberNameByProfileId,
    sendMessage,
    summarizeThread,
    commitCoordination
  } = communication;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setLiveNow(new Date());
    }, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const liveDateLabel = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(liveNow);
  const liveTimeLabel = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(liveNow);

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
    { label: '오늘 우선 확인 사건', value: todayCaseFocus.length, className: 'border-rose-200 bg-rose-50/80', valueClassName: 'text-rose-950' },
    { label: '신규 승인 요청', value: pendingClientAccessCount, className: 'border-emerald-200 bg-emerald-50/80', valueClassName: 'text-emerald-950' },
    { label: '연결 후속 처리', value: approvedClientAccessCount, className: 'border-violet-200 bg-violet-50/80', valueClassName: 'text-violet-950' }
  ];

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
            <p className="text-sm text-slate-600">사건 기준으로 우선 확인 항목을 빠르게 처리합니다.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {summaryCards.map((item) => (
              <div key={item.label} className={`min-w-28 rounded-2xl border px-3.5 py-3 shadow-[0_10px_22px_rgba(15,23,42,0.05)] ${item.className}`}>
                <p className="text-[11px] font-medium tracking-[0.16em] text-slate-500">{item.label}</p>
                <p className={`mt-1.5 text-lg font-semibold ${item.valueClassName}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <div className="rounded-[1.6rem] border border-rose-200 bg-[linear-gradient(180deg,#fffafb,#fff1f4)] p-3.5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">지금 처리해야 할 항목</p>
                <p className="mt-1 text-xs text-slate-500">알림과 승인 큐를 같은 화면에서 바로 확인합니다.</p>
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
                      className="block rounded-2xl border border-rose-200 bg-white px-3 py-3 text-sm transition hover:border-rose-300 hover:bg-rose-50/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{item.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-600">{item.body}</p>
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
                        className="block rounded-2xl border border-amber-200 bg-white px-3 py-3 text-sm transition hover:border-amber-300 hover:bg-amber-50/40"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-slate-900">{item.requester_name}</p>
                          <Badge tone={item.status === 'pending' ? 'amber' : 'blue'}>{clientAccessStatusLabel(item.status)}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{organization?.name ?? '현재 조직'} · {formatDateTime(item.created_at)}</p>
                        {item.request_note ? <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-600">{item.request_note}</p> : null}
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
                <select
                  value={plannerCaseId}
                  onChange={(event) => setPlannerCaseId(event.target.value)}
                  className="h-10 w-full rounded-xl border border-sky-200 bg-white px-3 text-sm text-slate-900"
                >
                  {data.caseOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
                <Textarea
                  value={plannerInput}
                  onChange={(event) => setPlannerInput(event.target.value)}
                  placeholder="예: 내일 오전 10시에 베인 사건 답변서 제출 일정 잡고, 담당자에게 알림까지 남겨줘"
                  className="min-h-28 border-sky-200 bg-white"
                />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={generatePlannerPreview} disabled={plannerPending || !organizationId || !plannerInput.trim()}>
                    {plannerPending ? 'AI 정리 중...' : '일정 초안 만들기'}
                  </Button>
                  <select
                    value={plannerRecipientMembershipId}
                    onChange={(event) => setPlannerRecipientMembershipId(event.target.value)}
                    className="h-10 rounded-xl border border-sky-200 bg-white px-3 text-sm text-slate-900"
                  >
                    <option value="">알림 없이 저장</option>
                    {memberOptions.map((item) => (
                      <option key={item.membershipId} value={item.membershipId}>{item.label}</option>
                    ))}
                  </select>
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
                    </div>
                    {plannerPreview!.setupHint ? <p className="mt-3 text-xs text-amber-700">{plannerPreview!.setupHint}</p> : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button onClick={commitPlanner} disabled={plannerPending || !plannerCaseId || !organizationId}>초안 등록</Button>
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
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {scenarioMode ? <Badge tone="blue">가상 조직간 협업방</Badge> : null}
                {!scenarioMode ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">현재 시각</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{liveDateLabel}</p>
                    <p className="text-xs text-slate-500">{liveTimeLabel}</p>
                  </div>
                ) : null}
                <Badge tone="slate">{scenarioMode ? '조직간 스레드' : activeConversationLabel}</Badge>
                {!scenarioMode ? (
                  <Button variant="secondary" onClick={summarizeThread} disabled={coordinationPending || !visibleMessages.length}>
                    <Bot className="mr-2 size-4" />AI 일정 제안
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className={scenarioMode ? 'grid gap-4 xl:grid-cols-[0.34fr_0.66fr]' : 'grid gap-4 xl:grid-cols-[0.3fr_0.7fr]'}>
          {scenarioMode ? (
            <>
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">조직간 대화방</p>
                  <p className="mt-1 text-sm text-slate-500">실제 조직처럼 협업한 흐름을 방 단위로 나눠서 확인합니다.</p>
                </div>
                <div className="max-h-[34rem] space-y-2 overflow-y-auto">
                  {scenarioConversationRooms.length ? scenarioConversationRooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setSelectedScenarioConversationId(room.id)}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition ${selectedScenarioConversationId === room.id ? 'border-sky-500 bg-sky-50 shadow-[0_12px_24px_rgba(14,165,233,0.12)]' : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{room.partner_organization_name}</p>
                          <p className="mt-1 text-xs text-slate-500">{room.topic} · {room.case_title ?? '공통 협업'}</p>
                          <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(room.last_message_at)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${room.unread_count > 0 ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{room.unread_count > 0 ? room.unread_count : '확인'}</span>
                      </div>
                    </button>
                  )) : <p className="px-2 py-6 text-sm text-slate-500">구성된 조직 대화방이 없습니다.</p>}
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{activeScenarioConversation?.partner_organization_name ?? '조직 대화방'}</p>
                    <p className="mt-1 text-sm text-slate-500">{activeScenarioConversation?.topic ?? '협업 흐름'} · {activeScenarioConversation?.case_title ?? '공통 협업'}</p>
                  </div>
                  <Badge tone="slate">조직간 스레드</Badge>
                </div>

                <div className="max-h-[30rem] space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-3">
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

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  시나리오 모드에서는 조직간 협업 흐름을 읽기 전용으로 제공합니다. 이 방들을 기준으로 사건, 의뢰인, 일정, 문서가 서로 연결된 상태를 점검할 수 있습니다.
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-medium text-slate-500">대화 유형</p>
                  <div className="mt-2 grid gap-2">
                    <button
                      type="button"
                      onClick={() => setCommunicationView('organization')}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition ${communicationView === 'organization' ? 'border-sky-500 bg-sky-50 shadow-[0_12px_24px_rgba(14,165,233,0.12)]' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <p className="font-medium text-slate-900">구성원 전체 소통방</p>
                      <p className="mt-1 text-xs text-slate-500">선택한 사건의 내부 대화를 전체 흐름으로 봅니다.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommunicationView('direct')}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition ${communicationView === 'direct' ? 'border-sky-500 bg-sky-50 shadow-[0_12px_24px_rgba(14,165,233,0.12)]' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <p className="font-medium text-slate-900">1:1 대화</p>
                      <p className="mt-1 text-xs text-slate-500">구성원을 선택해 1:1 업무 대화를 이어갑니다.</p>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-medium text-slate-500">구성원 검색</p>
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={targetSearch}
                      onChange={(event) => setTargetSearch(event.target.value)}
                      placeholder="구성원 검색"
                    />
                    <Button variant="secondary" onClick={() => setTargetSearch((current) => current.trim())}>
                      <Search className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="max-h-[34rem] space-y-2 overflow-y-auto">
                  {communicationView === 'organization' ? (
                    <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-4 text-sm text-slate-700">
                      선택한 사건의 전체 내부 대화를 보고 있습니다. 특정 구성원을 고르면 1:1 대화로 바로 전환됩니다.
                    </div>
                  ) : null}
                  {filteredOrgMembers.length ? filteredOrgMembers.map((member) => (
                    <button
                      key={member.membershipId}
                      type="button"
                      onClick={() => {
                        setCommunicationView('direct');
                        setOrgRecipientMembershipId(member.membershipId);
                      }}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition ${activeOrgRecipient?.membershipId === member.membershipId ? 'border-sky-500 bg-sky-50 shadow-[0_12px_24px_rgba(14,165,233,0.12)]' : 'border-transparent bg-transparent hover:border-slate-200 hover:bg-white/70'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{member.label}</p>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{member.roleLabel}</p>
                    </button>
                  )) : <p className="px-2 py-6 text-sm text-slate-500">보낼 수 있는 구성원이 없습니다.</p>}
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{selectedMessageCase?.title ?? '사건 선택'}</p>
                    <p className="mt-1 text-sm text-slate-500">대화 대상 · {activeTargetLabel}</p>
                  </div>
                  <Badge tone="slate">{activeConversationLabel}</Badge>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="grid gap-3 xl:grid-cols-[0.42fr_0.58fr]">
                    <label className="space-y-2 text-sm text-slate-700">
                      <span className="text-xs font-medium text-slate-500">사건 선택</span>
                      <select
                        value={messageCaseId}
                        onChange={(event) => setMessageCaseId(event.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                      >
                        {data.caseOptions.map((item) => (
                          <option key={item.id} value={item.id}>{item.title}</option>
                        ))}
                      </select>
                    </label>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500">사건 검색</label>
                      <div className="flex gap-2">
                        <Input
                          value={caseSearchQuery}
                          onChange={(event) => setCaseSearchQuery(event.target.value)}
                          placeholder="사건명 또는 사건번호 검색"
                        />
                        <Button variant="secondary" onClick={() => setCaseSearchQuery((current) => current.trim())}>
                          <Search className="size-4" />
                        </Button>
                        {selectedMessageCase ? (
                          <Link
                            href={`/cases/${selectedMessageCase.id}` as Route}
                            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            사건으로 이동
                          </Link>
                        ) : null}
                      </div>
                      {caseSearchQuery.trim() ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-2">
                          {filteredCaseOptions.length ? (
                            <div className="space-y-2">
                              {filteredCaseOptions.slice(0, 5).map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setMessageCaseId(item.id);
                                    setCaseSearchQuery(item.title);
                                  }}
                                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${messageCaseId === item.id ? 'border-sky-500 bg-sky-50 text-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
                                >
                                  <p className="font-medium">{item.title}</p>
                                  {item.reference_no ? <p className="mt-1 text-xs text-slate-500">{item.reference_no}</p> : null}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="px-2 py-3 text-sm text-slate-500">사건이 없습니다.</p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="max-h-[28rem] space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-3">
                  {visibleMessages.length ? (
                    visibleMessages.map((item) => {
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
                    <p className="px-2 py-12 text-center text-sm text-slate-500">선택한 조건에 맞는 대화가 아직 없습니다.</p>
                  )}
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <Textarea
                    value={messageInput}
                    onChange={(event) => setMessageInput(event.target.value)}
                    placeholder={communicationView === 'organization' ? '선택한 사건의 조직 전체 내부 대화를 남기세요.' : '구성원을 선택한 뒤 1:1 내부 대화를 남기세요.'}
                    className="min-h-28"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {communicationView === 'direct' ? (
                      <Button
                        variant="ghost"
                        onClick={() => setOrgRecipientMembershipId('')}
                      >
                        상대방 선택 해제
                      </Button>
                    ) : <span className="text-xs text-slate-500">조직 전체 대화는 선택한 사건의 내부 협업 흐름에 바로 남습니다.</span>}
                    <Button
                      onClick={sendMessage}
                      disabled={
                        messagePending
                        || !messageCaseId
                        || !messageInput.trim()
                        || (communicationView === 'direct' && !activeOrgRecipient)
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
                        <p className="font-semibold text-slate-900">AI 일정 제안</p>
                        <p className="mt-1 text-sm text-slate-600">{coordinationPreview.summary}</p>
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
                      <Button onClick={commitCoordination} disabled={coordinationPending || !selectedChecklistIds.length}>일정에 등록</Button>
                      <Button variant="secondary" onClick={() => setCoordinationPreview(null)}>닫기</Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
