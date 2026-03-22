import { sanitizeAiChecklist, sanitizeAiText } from '@/lib/ai/guardrails';

export type PlannerTask = {
  title: string;
  summary: string;
  dueAt: string | null;
  scheduleKind: 'deadline' | 'meeting' | 'hearing' | 'reminder' | 'other';
  isImportant: boolean;
  reason: string;
  provider: 'openai' | 'gemini' | 'rules';
  setupHint: string | null;
};

type PlannerCase = {
  id: string;
  title: string;
};

export type CoordinationChecklistItem = {
  id: string;
  label: string;
  detail: string;
  dueAt: string | null;
  priority: 'high' | 'medium' | 'low';
  notifyTarget: 'self' | 'manager' | 'assignee' | 'team';
};

export type CoordinationPlan = {
  summary: string;
  reason: string;
  provider: 'openai' | 'gemini' | 'rules';
  setupHint: string | null;
  recommendedRecipientMode: 'self' | 'managers' | 'all' | 'one';
  checklist: CoordinationChecklistItem[];
};

function normalizeDueAt(value?: string | null) {
  if (!value) return null;

  try {
    return new Date(value).toISOString();
  } catch {
    return null;
  }
}

function inferScheduleKind(text: string): PlannerTask['scheduleKind'] {
  if (/변론|기일|재판|출석/.test(text)) return 'hearing';
  if (/회의|미팅|콜|통화|면담/.test(text)) return 'meeting';
  if (/마감|제출|회신|송부|전달/.test(text)) return 'deadline';
  if (/확인|체크|정리|검토/.test(text)) return 'reminder';
  return 'other';
}

function inferDueAt(text: string) {
  const now = new Date();
  const explicitDate = text.match(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (explicitDate) {
    const [, year, month, day, hour = '9', minute = '0'] = explicitDate;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).toISOString();
  }

  const koreanDate = text.match(/(\d{1,2})월\s*(\d{1,2})일(?:\s*(\d{1,2})시)?/);
  if (koreanDate) {
    const [, month, day, hour = '9'] = koreanDate;
    const year = now.getFullYear();
    const candidate = new Date(year, Number(month) - 1, Number(day), Number(hour), 0);
    if (candidate.getTime() < now.getTime()) {
      candidate.setFullYear(year + 1);
    }
    return candidate.toISOString();
  }

  if (/내일/.test(text)) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + 1);
    candidate.setHours(9, 0, 0, 0);
    return candidate.toISOString();
  }

  if (/오늘/.test(text)) {
    const candidate = new Date(now);
    candidate.setHours(Math.max(now.getHours() + 1, 9), 0, 0, 0);
    return candidate.toISOString();
  }

  if (/이번주/.test(text)) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + 3);
    candidate.setHours(10, 0, 0, 0);
    return candidate.toISOString();
  }

  return null;
}

function buildRuleBasedPlan(input: string, cases: PlannerCase[]): PlannerTask {
  const normalized = sanitizeAiText(input).replace(/\s+/g, ' ');
  const matchedCase = cases.find((item) => normalized.includes(item.title));
  const casePrefix = matchedCase ? `[${matchedCase.title}] ` : '';
  const rawTitle = normalized.length > 54 ? `${normalized.slice(0, 54)}...` : normalized;
  const title = `${casePrefix}${rawTitle}`;
  const scheduleKind = inferScheduleKind(normalized);
  const dueAt = inferDueAt(normalized);
  const isImportant = /긴급|중요|필수|기한|마감|변론|출석|제출/.test(normalized) || scheduleKind === 'hearing' || scheduleKind === 'deadline';

  return {
    title: sanitizeAiText(title),
    summary: sanitizeAiText(normalized),
    dueAt,
    scheduleKind,
    isImportant,
    reason: dueAt ? '문장에서 일정 표현을 감지해 일정 후보를 만들었습니다.' : '문장을 기준으로 작업 요청을 정리했고, 일정은 수동 확인이 필요합니다.',
    provider: 'rules',
    setupHint: '정교한 AI 추론을 쓰려면 OPENAI_API_KEY 또는 GEMINI_API_KEY를 설정하세요.'
  };
}

function splitChecklistParts(input: string) {
  return input
    .split(/\n|\.|\?|!|그리고|,\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function inferPriority(text: string): CoordinationChecklistItem['priority'] {
  if (/긴급|즉시|오늘|당장|마감|기일|변론|출석|필수/.test(text)) return 'high';
  if (/이번주|확인|검토|정리|전달|공유/.test(text)) return 'medium';
  return 'low';
}

function inferNotifyTarget(text: string): CoordinationChecklistItem['notifyTarget'] {
  if (/담당자|배정|지정/.test(text)) return 'assignee';
  if (/조직|팀|공유|전체/.test(text)) return 'team';
  if (/승인|검토|관리자|책임자/.test(text)) return 'manager';
  return 'self';
}

function buildRuleBasedCoordinationPlan(input: string, cases: PlannerCase[]): CoordinationPlan {
  const normalized = sanitizeAiText(input).replace(/\s+/g, ' ');
  const parts = splitChecklistParts(normalized);
  const matchedCase = cases.find((item) => normalized.includes(item.title));
  const checklist = sanitizeAiChecklist((parts.length ? parts : [normalized]).map((part, index) => ({
    id: `coord-${index + 1}`,
    label: `${matchedCase ? `[${matchedCase.title}] ` : ''}${part.slice(0, 36)}`,
    detail: part,
    dueAt: inferDueAt(part),
    priority: inferPriority(part),
    notifyTarget: inferNotifyTarget(part)
  })));
  const highPriorityCount = checklist.filter((item) => item.priority === 'high').length;

  return {
    summary: sanitizeAiText(matchedCase ? `${matchedCase.title} 관련 조직간 소통을 실행 항목으로 정리했습니다.` : '조직간 소통 내용을 실행 항목으로 정리했습니다.'),
    reason: highPriorityCount ? '긴급성 높은 표현을 감지해 바로 알림과 일정으로 옮기기 쉽게 정리했습니다.' : '문장을 기준으로 공유, 확인, 전달 항목을 분리했습니다.',
    provider: 'rules',
    setupHint: '정교한 AI 추론을 쓰려면 OPENAI_API_KEY 또는 GEMINI_API_KEY를 설정하세요.',
    recommendedRecipientMode: highPriorityCount ? 'managers' : 'self',
    checklist
  };
}

async function planWithOpenAi(input: string, cases: PlannerCase[]): Promise<PlannerTask | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            '당신은 한국어 법률/법무 조직의 업무 코디네이터입니다. 사용자의 자연어 요청을 일정 후보 JSON으로 변환하세요. JSON keys: title, summary, dueAt, scheduleKind, isImportant, reason. dueAt은 ISO8601 또는 null, scheduleKind는 deadline|meeting|hearing|reminder|other만 허용.'
        },
        {
          role: 'user',
          content: JSON.stringify({ input: sanitizeAiText(input), cases }, null, 2)
        }
      ]
    })
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content);
    return {
      title: sanitizeAiText(String(parsed.title || input).slice(0, 120)),
      summary: sanitizeAiText(String(parsed.summary || input)),
      dueAt: parsed.dueAt ? new Date(parsed.dueAt).toISOString() : null,
      scheduleKind: ['deadline', 'meeting', 'hearing', 'reminder', 'other'].includes(parsed.scheduleKind) ? parsed.scheduleKind : 'other',
      isImportant: Boolean(parsed.isImportant),
      reason: sanitizeAiText(String(parsed.reason || 'AI가 일정 후보를 정리했습니다.')),
      provider: 'openai',
      setupHint: null
    };
  } catch {
    return null;
  }
}

async function planCoordinationWithOpenAi(input: string, cases: PlannerCase[]): Promise<CoordinationPlan | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            '당신은 한국어 법률/법무 조직의 협업 코디네이터입니다. 조직간 업무소통 문장을 실행 체크리스트 JSON으로 변환하세요. JSON keys: summary, reason, recommendedRecipientMode, checklist. recommendedRecipientMode는 self|managers|all|one만 허용. checklist는 최대 4개이며 각 item은 label, detail, dueAt, priority(high|medium|low), notifyTarget(self|manager|assignee|team)만 포함하세요.'
        },
        {
          role: 'user',
          content: JSON.stringify({ input: sanitizeAiText(input), cases }, null, 2)
        }
      ]
    })
  });

  if (!response.ok) return null;

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content);
    const checklist: CoordinationChecklistItem[] = Array.isArray(parsed.checklist) ? sanitizeAiChecklist<CoordinationChecklistItem>(parsed.checklist.slice(0, 4).map((item: any, index: number) => ({
      id: `coord-${index + 1}`,
      label: String(item.label || input).slice(0, 80),
      detail: String(item.detail || item.label || input),
      dueAt: normalizeDueAt(item.dueAt),
      priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
      notifyTarget: ['self', 'manager', 'assignee', 'team'].includes(item.notifyTarget) ? item.notifyTarget : 'self'
    }))) : [];

    return {
      summary: sanitizeAiText(String(parsed.summary || '조직간 소통 내용을 AI가 정리했습니다.')),
      reason: sanitizeAiText(String(parsed.reason || 'AI가 알림과 액션 포인트를 정리했습니다.')),
      provider: 'openai',
      setupHint: null,
      recommendedRecipientMode: ['self', 'managers', 'all', 'one'].includes(parsed.recommendedRecipientMode) ? parsed.recommendedRecipientMode : 'self',
      checklist: checklist.length ? checklist : buildRuleBasedCoordinationPlan(input, cases).checklist
    };
  } catch {
    return null;
  }
}

async function planWithGemini(input: string, cases: PlannerCase[]): Promise<PlannerTask | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text:
                '한국어 법률/법무 조직의 업무 코디네이터로 동작하세요. 자연어 요청을 일정 후보 JSON으로 바꾸세요. JSON keys: title, summary, dueAt, scheduleKind, isImportant, reason. dueAt은 ISO8601 또는 null, scheduleKind는 deadline|meeting|hearing|reminder|other만 허용.'
            },
            {
              text: JSON.stringify({ input: sanitizeAiText(input), cases }, null, 2)
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const content = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content);
    return {
      title: sanitizeAiText(String(parsed.title || input).slice(0, 120)),
      summary: sanitizeAiText(String(parsed.summary || input)),
      dueAt: parsed.dueAt ? new Date(parsed.dueAt).toISOString() : null,
      scheduleKind: ['deadline', 'meeting', 'hearing', 'reminder', 'other'].includes(parsed.scheduleKind) ? parsed.scheduleKind : 'other',
      isImportant: Boolean(parsed.isImportant),
      reason: sanitizeAiText(String(parsed.reason || 'AI가 일정 후보를 정리했습니다.')),
      provider: 'gemini',
      setupHint: null
    };
  } catch {
    return null;
  }
}

async function planCoordinationWithGemini(input: string, cases: PlannerCase[]): Promise<CoordinationPlan | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text:
                '당신은 한국어 법률/법무 조직의 협업 코디네이터입니다. 조직간 업무소통 문장을 실행 체크리스트 JSON으로 바꾸세요. JSON keys: summary, reason, recommendedRecipientMode, checklist. recommendedRecipientMode는 self|managers|all|one만 허용. checklist는 최대 4개이며 각 item은 label, detail, dueAt, priority(high|medium|low), notifyTarget(self|manager|assignee|team)만 포함하세요.'
            },
            {
              text: JSON.stringify({ input: sanitizeAiText(input), cases }, null, 2)
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) return null;

  const payload = await response.json();
  const content = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content);
    const checklist: CoordinationChecklistItem[] = Array.isArray(parsed.checklist) ? sanitizeAiChecklist<CoordinationChecklistItem>(parsed.checklist.slice(0, 4).map((item: any, index: number) => ({
      id: `coord-${index + 1}`,
      label: String(item.label || input).slice(0, 80),
      detail: String(item.detail || item.label || input),
      dueAt: normalizeDueAt(item.dueAt),
      priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
      notifyTarget: ['self', 'manager', 'assignee', 'team'].includes(item.notifyTarget) ? item.notifyTarget : 'self'
    }))) : [];

    return {
      summary: sanitizeAiText(String(parsed.summary || '조직간 소통 내용을 AI가 정리했습니다.')),
      reason: sanitizeAiText(String(parsed.reason || 'AI가 알림과 액션 포인트를 정리했습니다.')),
      provider: 'gemini',
      setupHint: null,
      recommendedRecipientMode: ['self', 'managers', 'all', 'one'].includes(parsed.recommendedRecipientMode) ? parsed.recommendedRecipientMode : 'self',
      checklist: checklist.length ? checklist : buildRuleBasedCoordinationPlan(input, cases).checklist
    };
  } catch {
    return null;
  }
}

export async function buildTaskPlan(input: string, cases: PlannerCase[]) {
  const trimmed = sanitizeAiText(input);
  if (!trimmed) {
    throw new Error('요청 내용을 입력해 주세요.');
  }

  const geminiPlan = await planWithGemini(trimmed, cases);
  if (geminiPlan) return geminiPlan;

  const openAiPlan = await planWithOpenAi(trimmed, cases);
  if (openAiPlan) return openAiPlan;

  return buildRuleBasedPlan(trimmed, cases);
}

export async function buildCoordinationPlan(input: string, cases: PlannerCase[]) {
  const trimmed = sanitizeAiText(input);
  if (!trimmed) {
    throw new Error('요청 내용을 입력해 주세요.');
  }

  const geminiPlan = await planCoordinationWithGemini(trimmed, cases);
  if (geminiPlan) return geminiPlan;

  const openAiPlan = await planCoordinationWithOpenAi(trimmed, cases);
  if (openAiPlan) return openAiPlan;

  return buildRuleBasedCoordinationPlan(trimmed, cases);
}
