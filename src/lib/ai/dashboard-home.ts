import { buildAiSourceMeta, sanitizeAiText, type AiResponseSourceMeta } from '@/lib/ai/guardrails';
import { getAiFeaturePolicy, getAiOperationDomainSpec, type AiOperationDomainId } from '@/lib/ai/feature-catalog';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// ai-guardrail-exempt: 공통 대시보드 AI 유틸과 타입 정의 파일이며, requestId/modelVersion/source는 실제 API route 응답에서 보장한다

type DashboardSnapshot = {
  activeCases: number;
  pendingDocuments: number;
  pendingRequests: number;
  recentMessages: number;
  pendingBillingCount: number;
  unreadNotifications: number;
  urgentSchedules: Array<{ id: string; title: string | null; scheduled_start?: string | null; case_id?: string | null }>;
  recentCases: Array<{ id: string; title: string | null }>;
  recentRequests: Array<{ id: string; title: string | null; status: string | null; case_id?: string | null }>;
  upcomingBilling: Array<{ id: string; title: string | null; due_on?: string | null; case_id?: string | null; status: string | null }>;
  unreadNotificationItems: Array<{ id: string; title: string | null; destination_url?: string | null; status?: string | null; priority?: string | null }>;
  clientAccessQueue: Array<{ id: string; requester_name: string | null; status: string | null }>;
  actionableNotifications: Array<{ id: string; title: string | null; action_href?: string | null; destination_url?: string | null }>;
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
  allowedAnswerTypes?: string[];
  questionDomain?: AiOperationDomainId;
};

type BillingGuidanceRecord = {
  agreementId: string;
  title: string;
  caseId?: string | null;
  caseTitle?: string | null;
  targetLabel: string;
  fixedAmount: number;
  paidAmount: number;
  shortageAmount: number;
  isInstallmentPending: boolean;
  installmentStartMode?: string | null;
  recentPaymentAt?: string | null;
};

export type BillingGuidanceSnapshot = {
  records: BillingGuidanceRecord[];
  totalInstallmentPendingCount: number;
  totalInstallmentShortageCount: number;
  totalInstallmentShortageAmount: number;
};

export type DraftAssistResponse = {
  title: string;
  body: string;
  shortBody: string;
  provider: 'rules';
  allowedAnswerTypes?: string[];
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
  allowedAnswerTypes?: string[];
};

const PLATFORM_AI_BLOCK_PATTERN = /(플랫폼|구독|조직\s*(승인|신청|삭제|비활성화|정지|해지)|운영\s*(권한|승인|삭제|정지)|감사\s*로그|고객센터|지원\s*접속)/;

export function classifyDashboardQuestionDomain(question: string): AiOperationDomainId {
  const normalized = question.toLowerCase();
  if (PLATFORM_AI_BLOCK_PATTERN.test(normalized)) return 'platform';
  if (/비용|청구|분납|납부|입금|계약|서명|약정|회차/.test(normalized)) return 'billing_contract';
  if (/일정|기한|마감|기일|오늘 할 일|스케줄|캘린더/.test(normalized)) return 'schedule';
  if (/문서|서류|업로드|계약서|제출자료|체크리스트/.test(normalized)) return 'document';
  if (/허브|대화|소통|협업|메시지|인박스/.test(normalized)) return 'hub';
  if (/의뢰인|초대|연결|포털/.test(normalized)) return 'client';
  return 'case';
}

function buildDomainActions(domain: AiOperationDomainId, snapshot: DashboardSnapshot): DashboardAiAction[] {
  if (domain === 'billing_contract') {
    return [
      {
        label: '비용 관리 열기',
        href: '/billing',
        reason: `현재 비용 대기 ${snapshot.pendingBillingCount}건과 분납·입금 흐름을 먼저 확인할 수 있습니다.`
      },
      {
        label: '계약 관리 열기',
        href: '/contracts',
        reason: '계약 원문, 체결 상태, 금액 약정을 같이 확인할 수 있습니다.'
      },
      {
        label: '사건 목록 열기',
        href: '/cases',
        reason: '특정 사건의 비용 탭으로 바로 이어서 들어갈 수 있습니다.'
      }
    ];
  }

  if (domain === 'schedule') {
    return [
      {
        label: '일정 확인',
        href: '/calendar',
        reason: `가까운 중요 일정 ${snapshot.urgentSchedules.length}건과 오늘 할 일을 먼저 볼 수 있습니다.`
      },
      {
        label: '업무일지 보기',
        href: '/calendar/worklog',
        reason: '완료한 일정과 체크 기록을 시간순으로 다시 확인할 수 있습니다.'
      }
    ];
  }

  if (domain === 'document') {
    return [
      {
        label: '문서 화면 열기',
        href: '/documents',
        reason: '문서 등록, 검토, 공유 상태를 바로 확인할 수 있습니다.'
      },
      {
        label: '사건 목록 열기',
        href: '/cases',
        reason: '특정 사건 문서와 요청 흐름으로 이어서 확인할 수 있습니다.'
      }
    ];
  }

  if (domain === 'hub') {
    return [
      {
        label: '사건허브 보기',
        href: '/case-hubs',
        reason: '허브별 상태와 최근 공유 흐름을 먼저 확인할 수 있습니다.'
      },
      {
        label: '조직 협업 열기',
        href: '/inbox',
        reason: '대화와 협업 요청을 한 번에 이어서 처리할 수 있습니다.'
      }
    ];
  }

  if (domain === 'client') {
    return [
      {
        label: '의뢰인 관리 열기',
        href: '/clients',
        reason: '초대, 연결, 포털 상태를 같은 화면에서 확인할 수 있습니다.'
      },
      {
        label: '사건 목록 열기',
        href: '/cases',
        reason: '의뢰인이 연결된 사건과 후속 작업을 이어서 볼 수 있습니다.'
      }
    ];
  }

  return [
    {
      label: '사건 목록 열기',
      href: '/cases',
      reason: `진행 중 사건 ${snapshot.activeCases}건과 요청 대기 ${snapshot.pendingRequests}건을 먼저 정리할 수 있습니다.`
    },
    {
      label: '알림 센터 열기',
      href: '/notifications?section=immediate',
      reason: '바로 처리할 알림과 후속 요청을 함께 확인할 수 있습니다.'
    },
    {
      label: '문서 화면 열기',
      href: '/documents',
      reason: '사건과 연결된 문서 흐름까지 이어서 점검할 수 있습니다.'
    }
  ];
}

function buildDomainAnswer(domain: AiOperationDomainId, snapshot: DashboardSnapshot): string {
  if (domain === 'billing_contract') {
    return `비용·계약 질문으로 보고 답합니다. 현재 비용 대기 ${snapshot.pendingBillingCount}건을 기준으로 계약과 분납 흐름을 먼저 확인하는 편이 맞습니다.`;
  }
  if (domain === 'schedule') {
    return `일정 질문으로 보고 답합니다. 가까운 중요 일정 ${snapshot.urgentSchedules.length}건과 오늘 할 일을 먼저 확인하세요.`;
  }
  if (domain === 'document') {
    return `문서 질문으로 보고 답합니다. 문서 등록, 검토, 제출 흐름을 문서 화면과 사건 화면에서 함께 확인하는 편이 맞습니다.`;
  }
  if (domain === 'hub') {
    return '허브·협업 질문으로 보고 답합니다. 사건허브와 조직 협업 화면에서 대화와 공유 흐름을 같이 확인하세요.';
  }
  if (domain === 'client') {
    return '의뢰인 질문으로 보고 답합니다. 의뢰인 관리에서 초대·연결 상태를 확인하고, 필요하면 사건 화면으로 이어서 확인하세요.';
  }
  return `사건 질문으로 보고 답합니다. 진행 중 사건 ${snapshot.activeCases}건과 요청 대기 ${snapshot.pendingRequests}건을 먼저 정리하는 편이 맞습니다.`;
}

function findBillingGuidanceTarget(question: string, billingGuidance?: BillingGuidanceSnapshot | null) {
  if (!billingGuidance?.records.length) return null;
  const normalized = question.toLowerCase();
  const matched = billingGuidance.records.find((record) => {
    const haystack = [
      record.targetLabel,
      record.title,
      record.caseTitle ?? ''
    ].join(' ').toLowerCase();
    return haystack && normalized.split(/\s+/).some((token) => token.length >= 2 && haystack.includes(token));
  });

  if (matched) return matched;
  return billingGuidance.records
    .filter((record) => record.isInstallmentPending)
    .sort((a, b) => b.shortageAmount - a.shortageAmount)[0] ?? billingGuidance.records[0] ?? null;
}

function buildBillingAssistantAnswer(
  question: string,
  billingGuidance?: BillingGuidanceSnapshot | null
): { answer: string; actions: DashboardAiAction[] } | null {
  const normalized = question.toLowerCase();
  const target = findBillingGuidanceTarget(question, billingGuidance);
  const targetCaseHref = target?.caseId ? `/cases/${target.caseId}` : '/cases';

  if (/비용입금.*되었|입금.*되었|입금.*확인/.test(normalized) && /분납|나머지/.test(normalized)) {
    if (target) {
      const remaining = Math.max(target.shortageAmount, 0);
      return {
        answer: `${target.targetLabel} 관련 약정 금액은 ${target.fixedAmount.toLocaleString('ko-KR')}원이고, 현재 확인된 입금은 ${target.paidAmount.toLocaleString('ko-KR')}원입니다. 남은 금액 ${remaining.toLocaleString('ko-KR')}원을 기준으로 분납 계획을 이어서 잡을 수 있습니다. 지금 받은 금액을 먼저 확인하고, 남은 금액을 다음 회차로 둘지 바로 청구할지 정하면 됩니다.`,
        actions: [
          {
            label: '비용 관리 열기',
            href: '/billing',
            reason: `${target.targetLabel}의 입금 기록과 남은 금액을 바로 확인할 수 있습니다.`
          },
          {
            label: '계약 관리 열기',
            href: '/contracts',
            reason: '현재 약정 금액과 분납 기준을 다시 확인할 수 있습니다.'
          },
          {
            label: '해당 사건 열기',
            href: targetCaseHref,
            reason: '사건 화면에서 비용 후속 조치를 바로 이어서 정리할 수 있습니다.'
          }
        ]
      };
    }

    return {
      answer: '입금이 확인되면 비용 관리에서 받은 금액으로 먼저 기록하고, 남은 금액은 분납 계획으로 이어서 볼 수 있습니다. 아래 화면에서 받은 금액 처리와 남은 회차 계획을 함께 확인하세요.',
      actions: [
        {
          label: '비용 관리 열기',
          href: '/billing',
          reason: '입금 기록과 남은 분납 계획을 같은 화면에서 이어서 확인할 수 있습니다.'
        },
        {
          label: '계약 관리 열기',
          href: '/contracts',
          reason: '해당 의뢰인의 비용 약정 원문과 분납 기준을 다시 확인할 수 있습니다.'
        }
      ]
    };
  }

  if (/분납.*부족|약정.*부족|분납.*어긋|부족합니다|회차.*늘릴/.test(normalized)) {
    if (target) {
      const shortage = Math.max(target.shortageAmount, 0);
      return {
        answer: `${target.targetLabel}의 분납 약정 기준 금액은 ${target.fixedAmount.toLocaleString('ko-KR')}원인데, 현재 기준으로 ${shortage.toLocaleString('ko-KR')}원이 부족합니다. 이 경우 남은 금액을 다음 청구에 합산할지, 회차를 늘려서 나눌지 먼저 정하는 편이 맞습니다.`,
        actions: [
          {
            label: '비용 관리에서 합산 청구 보기',
            href: '/billing',
            reason: '부족분을 다음 청구에 합칠지 바로 판단할 수 있습니다.'
          },
          {
            label: '계약 관리에서 회차 기준 확인',
            href: '/contracts',
            reason: '현재 분납 약정 기준과 시작 시점을 다시 확인할 수 있습니다.'
          },
          {
            label: '해당 사건 열기',
            href: targetCaseHref,
            reason: '사건 화면에서 의뢰인 안내와 후속 요청을 바로 이어갈 수 있습니다.'
          }
        ]
      };
    }

    return {
      answer: '분납 약정보다 적게 들어온 경우에는 비용 관리에서 부족 금액을 다음 청구에 합칠지, 회차를 늘릴지 먼저 정해야 합니다. 아래 화면에서 미입금 분납 계약과 연체 항목을 같이 보면서 조정하세요.',
      actions: [
        {
          label: '비용 관리 열기',
          href: '/billing',
          reason: '비용입금 미확인 분납 계약, 연체 청구, 최근 입금 기록을 한 번에 볼 수 있습니다.'
        },
        {
          label: '사건 목록 열기',
          href: '/cases',
          reason: '특정 사건의 비용 탭으로 바로 들어가 분납 회차와 청구 일정을 조정할 수 있습니다.'
        }
      ]
    };
  }

  if (/분납.*계획|플랜.*세울|청구할까요/.test(normalized)) {
    if (target) {
      const shortage = Math.max(target.shortageAmount, 0);
      const startModeLabel = target.installmentStartMode === 'first_due' ? '나중에 받는 회차부터 시작' : '오늘부터 바로 시작';
      return {
        answer: `${target.targetLabel}의 현재 약정은 ${startModeLabel} 기준으로 잡혀 있습니다. 남은 금액 ${shortage.toLocaleString('ko-KR')}원을 기준으로 새 회차를 잡거나, 다음 청구에 합산하는 두 방향으로 정리할 수 있습니다. 어느 쪽으로 갈지 정하면 비용 관리와 계약 관리에서 바로 이어서 맞출 수 있습니다.`,
        actions: [
          {
            label: '계약 관리 열기',
            href: '/contracts',
            reason: '현재 약정 원문과 시작 기준을 다시 확인할 수 있습니다.'
          },
          {
            label: '비용 관리 열기',
            href: '/billing',
            reason: '남은 금액과 미입금 계약을 기준으로 실제 계획을 잡을 수 있습니다.'
          },
          {
            label: '해당 사건 열기',
            href: targetCaseHref,
            reason: '사건 화면에서 의뢰인 설명과 후속 작업을 바로 연결할 수 있습니다.'
          }
        ]
      };
    }

    return {
      answer: '분납 계획을 새로 세우거나 조정할 때는 계약 금액, 이미 받은 금액, 남은 회차를 먼저 확인해야 합니다. 아래 화면에서 계약 약정과 비용 현황을 같이 열어 두고 결정하는 편이 안전합니다.',
      actions: [
        {
          label: '계약 관리 열기',
          href: '/contracts',
          reason: '계약 원문과 약정 금액, 동의 이력을 다시 확인할 수 있습니다.'
        },
        {
          label: '비용 관리 열기',
          href: '/billing',
          reason: '실제 청구, 입금, 분납 미이행 여부를 바로 이어서 점검할 수 있습니다.'
        }
      ]
    };
  }

  return null;
}

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
        label: isPlatformAdmin ? '조직 신청 관리 열기' : '대시보드 유지',
        href: isPlatformAdmin ? '/admin/organization-requests' : '/dashboard',
        reason: isPlatformAdmin
          ? '플랫폼 조직은 조직 신청 관리에서 운영 큐를 먼저 확인하는 편이 빠릅니다.'
          : '현재 질문은 홈 요약과 추천 카드에서 먼저 확인하는 편이 빠릅니다.'
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
  billingGuidance?: BillingGuidanceSnapshot | null;
}): DashboardAiAssistantResponse {
  const question = sanitizeAiText(input.question);
  const featurePolicy = getAiFeaturePolicy('home_ai_assistant');
  const questionDomain = classifyDashboardQuestionDomain(question);
  if (questionDomain === 'platform') {
    return {
      answer: input.isPlatformAdmin
        ? '플랫폼 운영 관련 질문은 AI가 답하지 않습니다. 아래 운영 메뉴에서 직접 확인해 주세요.'
        : '플랫폼 운영 관련 질문은 AI가 답하지 않습니다. 필요한 경우 고객센터로 문의해 주세요.',
      actions: input.isPlatformAdmin
        ? [
            {
              label: '조직 신청 관리',
              href: '/admin/organization-requests',
              reason: '조직 신청, 승인, 탈퇴 요청은 이 화면에서 직접 확인합니다.'
            },
            {
              label: '조직 관리',
              href: '/admin/organizations',
              reason: '조직 비활성화, 삭제, 상태 변경은 이 화면에서 직접 처리합니다.'
            },
            {
              label: '고객센터',
              href: '/admin/support',
              reason: '문의, 오류, 지원 요청은 고객센터 화면에서 직접 확인합니다.'
            }
          ]
        : [
            {
              label: '고객센터',
              href: '/support',
              reason: '플랫폼 운영 관련 문의는 고객센터로 전달해 주세요.'
            },
            {
              label: '알림 센터',
              href: '/notifications',
              reason: '현재 계정에서 처리할 일반 알림과 요청은 여기서 확인합니다.'
            }
          ],
      provider: 'rules',
      allowedAnswerTypes: featurePolicy.allowedAnswerTypes,
      questionDomain,
      source: buildAiSourceMeta({
        feature: 'home_ai_assistant',
        dataType: 'platform_ai_block',
        scope: { organizationId: input.organizationId },
        filters: { question }
      })
    };
  }
  const billingAnswer = buildBillingAssistantAnswer(question, input.billingGuidance);
  if (billingAnswer) {
    return {
      answer: billingAnswer.answer,
      actions: billingAnswer.actions,
      provider: 'rules',
      allowedAnswerTypes: featurePolicy.allowedAnswerTypes,
      questionDomain,
      source: buildAiSourceMeta({
        feature: 'home_ai_assistant',
        dataType: 'billing_follow_up',
        scope: { organizationId: input.organizationId },
        filters: { question }
      })
    };
  }
  const domainSpec = getAiOperationDomainSpec(questionDomain);
  const actions = buildDomainActions(questionDomain, input.snapshot).filter((action) => domainSpec.allowedRoutes.includes(action.href)).slice(0, 3);
  const answer = buildDomainAnswer(questionDomain, input.snapshot);

  return {
    answer,
    actions,
    provider: 'rules',
    allowedAnswerTypes: domainSpec.allowedAnswerTypes,
    questionDomain,
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
  const featurePolicy = getAiFeaturePolicy('draft_assist');

  return {
    title: `${context}${subjectPrefix}`,
    body: `${context}${cleanedPrompt}\n\n필요한 확인 사항이 있으면 이 메시지에 바로 답장해 주세요.`,
    shortBody: `${context}${cleanedPrompt}`,
    provider: 'rules',
    allowedAnswerTypes: featurePolicy.allowedAnswerTypes
  };
}

export async function runAdminCopilot(input: {
  question: string;
}): Promise<AdminCopilotResponse> {
  const featurePolicy = getAiFeaturePolicy('admin_copilot');
  if (PLATFORM_AI_BLOCK_PATTERN.test(sanitizeAiText(input.question))) {
    return {
      answer: '플랫폼 운영 관련 판단과 조정은 AI가 답하지 않습니다. 운영 메뉴에서 직접 확인해 주세요.',
      table: [],
      actions: [
        {
          label: '조직 신청 관리',
          href: '/admin/organization-requests',
          reason: '신청, 승인, 반려는 이 화면에서 직접 확인합니다.'
        },
        {
          label: '조직 관리',
          href: '/admin/organizations',
          reason: '조직 상태 변경은 이 화면에서 직접 처리합니다.'
        },
        {
          label: '구독 관리',
          href: '/settings/subscription',
          reason: '구독 상태는 AI가 아니라 이 화면에서 직접 확인합니다.'
        }
      ],
      provider: 'rules',
      allowedAnswerTypes: featurePolicy.allowedAnswerTypes,
      source: buildAiSourceMeta({
        feature: 'admin_copilot',
        dataType: 'platform_ai_block',
        scope: { window: 'none', organizationCount: 0 },
        filters: { question: sanitizeAiText(input.question) }
      })
    };
  }

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
    allowedAnswerTypes: featurePolicy.allowedAnswerTypes,
    source: buildAiSourceMeta({
      feature: 'admin_copilot',
      dataType: 'platform_organization_metrics',
      scope: { window: '7d', organizationCount: rows.length },
      filters: { question: sanitizeAiText(input.question) }
    })
  };
}
