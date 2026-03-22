import { buildAiSourceMeta, sanitizeAiText, type AiResponseSourceMeta } from '@/lib/ai/guardrails';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type DashboardSnapshot = {
  activeCases: number;
  pendingDocuments: number;
  pendingRequests: number;
  recentMessages: number;
  pendingBillingCount: number;
  unreadNotifications: number;
  urgentSchedules: Array<{ id: string; title: string; scheduled_start?: string | null; case_id?: string | null }>;
  recentCases: Array<{ id: string; title: string }>;
  recentRequests: Array<{ id: string; title: string; status: string; case_id?: string | null }>;
  upcomingBilling: Array<{ id: string; title: string; due_on?: string | null; case_id?: string | null; status: string }>;
  unreadNotificationItems: Array<{ id: string; title: string; destination_url?: string | null; status?: string | null; priority?: string | null }>;
  clientAccessQueue: Array<{ id: string; requester_name: string; status: string }>;
  actionableNotifications: Array<{ id: string; title: string; action_href?: string | null; destination_url?: string | null }>;
  organizationConversations: Array<{ id: string }>;
};

export type DashboardAiAction = {
  label: string;
  href: string;
  reason: string;
};

export type DashboardAiSummary = {
  headline: string;
  bullets: string[];
  actions: DashboardAiAction[];
  source: AiResponseSourceMeta;
};

export type DashboardAiRecommendation = {
  title: string;
  detail: string;
  href: string;
  priority: 'high' | 'medium' | 'low';
};

export type DashboardAiAnomaly = {
  title: string;
  detail: string;
  href: string;
  severity: 'warning' | 'notice';
};

export type DashboardAiOverview = {
  summary: DashboardAiSummary;
  recommendations: DashboardAiRecommendation[];
  anomalies: DashboardAiAnomaly[];
};

export type DashboardAiAssistantResponse = {
  answer: string;
  actions: DashboardAiAction[];
  source: AiResponseSourceMeta;
  provider: 'rules';
};

export type DraftAssistResponse = {
  title: string;
  body: string;
  shortBody: string;
  provider: 'rules';
};

export type AdminCopilotRow = {
  organizationId: string;
  organizationName: string;
  participationRate: number;
  recentMessages: number;
  pendingRequests: number;
};

export type AdminCopilotResponse = {
  answer: string;
  table: AdminCopilotRow[];
  actions: DashboardAiAction[];
  source: AiResponseSourceMeta;
  provider: 'rules';
};

function pushRecommendation(
  rows: DashboardAiRecommendation[],
  recommendation: DashboardAiRecommendation
) {
  if (rows.length < 3) rows.push(recommendation);
}

function buildSummaryHeadline(snapshot: DashboardSnapshot) {
  if (snapshot.actionableNotifications.length) {
    return `긴급 알림 ${snapshot.actionableNotifications.length}건과 확인 대기 ${snapshot.pendingRequests}건이 있습니다.`;
  }
  if (snapshot.pendingDocuments || snapshot.pendingRequests) {
    return `오늘 처리할 문서 ${snapshot.pendingDocuments}건, 요청 ${snapshot.pendingRequests}건이 남아 있습니다.`;
  }
  if (snapshot.urgentSchedules.length) {
    return `이번 주 안에 확인할 중요 일정 ${snapshot.urgentSchedules.length}건이 잡혀 있습니다.`;
  }
  return '오늘 처리 흐름은 비교적 안정적입니다. 먼저 최신 알림과 다음 일정부터 확인하세요.';
}

export function buildDashboardAiOverview(input: {
  organizationId: string | null;
  snapshot: DashboardSnapshot;
  isPlatformAdmin: boolean;
  roleLabel: string;
}): DashboardAiOverview {
  const { organizationId, snapshot, isPlatformAdmin, roleLabel } = input;
  const bullets = [
    `읽지 않은 알림 ${snapshot.unreadNotifications}건, 즉시 처리 알림 ${snapshot.actionableNotifications.length}건`,
    `진행 중 사건 ${snapshot.activeCases}건, 승인/응답 대기 ${snapshot.pendingRequests}건`,
    `가까운 중요 일정 ${snapshot.urgentSchedules.length}건, 미납/대기 비용 ${snapshot.pendingBillingCount}건`
  ];

  const actions: DashboardAiAction[] = [
    {
      label: '알림 먼저 보기',
      href: '/notifications?section=immediate',
      reason: '즉시 처리 알림과 읽지 않은 알림을 한 번에 확인할 수 있습니다.'
    },
    {
      label: '일정 확인',
      href: '/calendar',
      reason: '가까운 기일과 마감 일정을 바로 이어서 점검할 수 있습니다.'
    },
    {
      label: '비용 관리',
      href: '/billing',
      reason: '분납 미이행이나 납부 기한을 같은 흐름으로 추적할 수 있습니다.'
    }
  ];

  const recommendations: DashboardAiRecommendation[] = [];
  if (snapshot.actionableNotifications.length) {
    pushRecommendation(recommendations, {
      title: '긴급 알림부터 처리',
      detail: `즉시 처리 알림 ${snapshot.actionableNotifications.length}건이 남아 있습니다.`,
      href: '/notifications?section=immediate',
      priority: 'high'
    });
  }
  if (snapshot.clientAccessQueue.some((item) => item.status === 'pending')) {
    pushRecommendation(recommendations, {
      title: '의뢰인 연결 요청 검토',
      detail: `승인 대기 중인 의뢰인 요청 ${snapshot.clientAccessQueue.filter((item) => item.status === 'pending').length}건이 있습니다.`,
      href: '/clients',
      priority: 'high'
    });
  }
  if (snapshot.pendingDocuments || snapshot.pendingRequests) {
    pushRecommendation(recommendations, {
      title: '문서·요청 후속 처리',
      detail: `문서 ${snapshot.pendingDocuments}건, 요청 ${snapshot.pendingRequests}건의 후속 작업이 남아 있습니다.`,
      href: '/cases',
      priority: 'medium'
    });
  }
  if (snapshot.pendingBillingCount) {
    pushRecommendation(recommendations, {
      title: '납부 상황 확인',
      detail: `비용 대기 항목 ${snapshot.pendingBillingCount}건을 확인해 의뢰인 안내를 이어가세요.`,
      href: '/billing',
      priority: 'medium'
    });
  }
  if (!recommendations.length) {
    pushRecommendation(recommendations, {
      title: '오늘 일정 먼저 확인',
      detail: `${roleLabel} 기준으로 가까운 일정과 최근 알림을 먼저 살펴보는 것이 좋습니다.`,
      href: '/calendar',
      priority: 'low'
    });
  }

  const anomalies: DashboardAiAnomaly[] = [];
  if (snapshot.actionableNotifications.length >= 5) {
    anomalies.push({
      title: '긴급 알림이 평소보다 많습니다',
      detail: `즉시 처리 알림이 ${snapshot.actionableNotifications.length}건이라 홈에서 먼저 확인하는 편이 안전합니다.`,
      href: '/notifications?section=immediate',
      severity: 'warning'
    });
  }
  if (snapshot.pendingBillingCount >= 4) {
    anomalies.push({
      title: '납부 지연 위험이 커졌습니다',
      detail: `비용 대기 항목 ${snapshot.pendingBillingCount}건이 쌓여 있어 분납 약속 이행 여부를 같이 점검해야 합니다.`,
      href: '/billing',
      severity: 'warning'
    });
  }
  if (snapshot.urgentSchedules.length >= 4) {
    anomalies.push({
      title: '중요 일정이 몰려 있습니다',
      detail: `가까운 기일/마감 ${snapshot.urgentSchedules.length}건이 있어 일정 충돌을 확인해야 합니다.`,
      href: '/calendar',
      severity: 'notice'
    });
  }
  if (isPlatformAdmin && snapshot.clientAccessQueue.length >= 3) {
    anomalies.push({
      title: '조직 연결 요청이 빠르게 늘고 있습니다',
      detail: `플랫폼 관점에서 승인·연결 대기 ${snapshot.clientAccessQueue.length}건을 바로 확인할 필요가 있습니다.`,
      href: '/admin/organization-requests',
      severity: 'notice'
    });
  }

  return {
    summary: {
      headline: buildSummaryHeadline(snapshot),
      bullets,
      actions,
      source: buildAiSourceMeta({
        feature: 'ai_summary_card',
        dataType: 'dashboard_snapshot',
        scope: { organizationId, activeCases: snapshot.activeCases },
        filters: { snapshot: 'dashboard', role: roleLabel }
      })
    },
    recommendations,
    anomalies
  };
}

function buildRouteSuggestion(question: string, snapshot: DashboardSnapshot, isPlatformAdmin: boolean): DashboardAiAction[] {
  const normalized = question.toLowerCase();
  const actions: DashboardAiAction[] = [];

  if (/미읽음|알림|긴급/.test(normalized)) {
    actions.push({
      label: '알림센터 열기',
      href: '/notifications?section=immediate',
      reason: `지금 읽지 않은 알림 ${snapshot.unreadNotifications}건과 즉시 처리 알림 ${snapshot.actionableNotifications.length}건을 바로 볼 수 있습니다.`
    });
  }
  if (/허브|대화|소통/.test(normalized)) {
    actions.push({
      label: '사건허브 보기',
      href: '/case-hubs',
      reason: '허브별 활동량과 미확인 흐름을 먼저 비교할 수 있습니다.'
    });
    actions.push({
      label: '조직 협업 열기',
      href: '/inbox',
      reason: '허브 대화와 협업 조직 메시지를 이어서 확인할 수 있습니다.'
    });
  }
  if (/의뢰인.*초대|초대.*의뢰인|의뢰인.*연결/.test(normalized)) {
    actions.push({
      label: '의뢰인 관리 열기',
      href: '/clients',
      reason: '의뢰인 초대, 연결 요청, 포털 접근 상태를 같은 화면에서 처리합니다.'
    });
  }
  if (/비용|청구|분납|납부/.test(normalized)) {
    actions.push({
      label: '비용 관리 열기',
      href: '/billing',
      reason: '청구, 입금, 분납 이행 상황을 기간 기준으로 바로 확인할 수 있습니다.'
    });
  }
  if (/계약/.test(normalized)) {
    actions.push({
      label: '계약 관리 열기',
      href: '/contracts',
      reason: '사건별 비용 약정과 적용 기간을 따로 모아 볼 수 있습니다.'
    });
  }
  if (/일정|기한|마감|오늘 할 일/.test(normalized)) {
    actions.push({
      label: '일정 확인',
      href: '/calendar',
      reason: '오늘 할 일, 이번 주 일정, 연간 스케줄을 바로 볼 수 있습니다.'
    });
  }
  if (isPlatformAdmin && /조직|참여율|운영|승인/.test(normalized)) {
    actions.push({
      label: '운영 관리 열기',
      href: '/admin/organization-requests',
      reason: '조직 승인 현황과 플랫폼 운영 큐를 바로 확인할 수 있습니다.'
    });
  }

  if (!actions.length) {
    actions.push(
      {
        label: '대시보드 유지',
        href: '/dashboard',
        reason: '현재 질문은 홈 요약과 추천 카드에서 먼저 확인하는 편이 빠릅니다.'
      },
      {
        label: '사건 목록 열기',
        href: '/cases',
        reason: '질문이 특정 사건이나 후속 작업과 연결될 가능성이 높습니다.'
      }
    );
  }

  return actions.slice(0, 3);
}

export function answerDashboardAssistant(input: {
  organizationId: string | null;
  question: string;
  snapshot: DashboardSnapshot;
  isPlatformAdmin: boolean;
}): DashboardAiAssistantResponse {
  const question = sanitizeAiText(input.question);
  const actions = buildRouteSuggestion(question, input.snapshot, input.isPlatformAdmin);
  const answer = `${actions[0]?.reason ?? '관련 화면으로 이동해 확인하세요.'} ${actions.length > 1 ? '필요하면 아래 관련 화면도 함께 확인하세요.' : ''}`.trim();

  return {
    answer,
    actions,
    provider: 'rules',
    source: buildAiSourceMeta({
      feature: 'home_ai_assistant',
      dataType: 'dashboard_snapshot',
      scope: { organizationId: input.organizationId },
      filters: { question }
    })
  };
}

export function buildDraftAssist(input: {
  kind: 'organization_message' | 'hub_message' | 'client_invite' | 'staff_invite';
  prompt: string;
  contextTitle?: string | null;
}): DraftAssistResponse {
  const subjectPrefix =
    input.kind === 'client_invite' ? '의뢰인 안내'
    : input.kind === 'staff_invite' ? '구성원 초대'
    : input.kind === 'hub_message' ? '허브 공유'
    : '조직 안내';
  const context = input.contextTitle ? `${input.contextTitle} 관련 ` : '';
  const cleanedPrompt = sanitizeAiText(input.prompt);

  return {
    title: `${context}${subjectPrefix}`,
    body: `${context}${cleanedPrompt}\n\n필요한 확인 사항이 있으면 이 메시지에 바로 답장해 주세요.`,
    shortBody: `${context}${cleanedPrompt}`,
    provider: 'rules'
  };
}

export async function runAdminCopilot(input: {
  question: string;
}): Promise<AdminCopilotResponse> {
  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: organizations }, { data: messages }, { data: requests }] = await Promise.all([
    admin.from('organizations').select('id, name').eq('is_active', true).limit(20),
    admin.from('case_messages').select('organization_id, created_at').gte('created_at', since).limit(500),
    admin.from('client_access_requests').select('target_organization_id, status, created_at').gte('created_at', since).limit(300)
  ]);

  const rows: AdminCopilotRow[] = (organizations ?? []).map((organization: any) => {
    const recentMessages = (messages ?? []).filter((item: any) => item.organization_id === organization.id).length;
    const pendingRequests = (requests ?? []).filter((item: any) => item.target_organization_id === organization.id && item.status === 'pending').length;
    const participationRate = Math.min(100, recentMessages * 8 + pendingRequests * 12);
    return {
      organizationId: organization.id,
      organizationName: organization.name,
      participationRate,
      recentMessages,
      pendingRequests
    };
  }).sort((left, right) => right.participationRate - left.participationRate).slice(0, 5);

  return {
    answer: `${sanitizeAiText(input.question)} 기준으로 최근 1주일 참여 흐름을 비교했습니다. 상위 조직부터 확인하세요.`,
    table: rows,
    actions: [
      {
        label: '조직 신청 관리',
        href: '/admin/organization-requests',
        reason: '조직 승인과 운영 대기 상태를 함께 확인할 수 있습니다.'
      },
      {
        label: '조직 관리',
        href: '/admin/organizations',
        reason: '조직별 기본 정보와 운영 대상을 이어서 볼 수 있습니다.'
      }
    ],
    provider: 'rules',
    source: buildAiSourceMeta({
      feature: 'admin_copilot',
      dataType: 'platform_organization_metrics',
      scope: { window: '7d', organizationCount: rows.length },
      filters: { question: sanitizeAiText(input.question) }
    })
  };
}
