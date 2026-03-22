'use client';

import { useMemo, useState } from 'react';
import { Sparkles, ThumbsDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type CaseOption = {
  id: string;
  title: string;
};

type ChecklistItem = {
  id: string;
  label: string;
  detail: string;
  dueAt: string | null;
  priority: 'high' | 'medium' | 'low';
};

type PreviewPayload = {
  summary: string;
  reason: string;
  provider?: string;
  checklist: ChecklistItem[];
};

type AiSourceMeta = {
  dataType: string;
  generatedAt: string;
  scope: Record<string, unknown>;
  filters: Record<string, unknown>;
};

export function CaseHubAiAssistant({
  organizationId,
  defaultCaseId,
  caseOptions
}: {
  organizationId: string;
  defaultCaseId?: string | null;
  caseOptions: CaseOption[];
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [source, setSource] = useState<AiSourceMeta | null>(null);
  const [estimate, setEstimate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(defaultCaseId && caseOptions.some((item) => item.id === defaultCaseId) ? defaultCaseId : (caseOptions[0]?.id ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedItems = useMemo(
    () => preview?.checklist.filter((item) => selectedIds.includes(item.id)) ?? [],
    [preview, selectedIds]
  );

  const analyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/dashboard-ai/coordination-preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          content: input.trim()
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.preview) {
        throw new Error(payload?.error ?? 'AI 분석에 실패했습니다.');
      }

      setPreview(payload.preview as PreviewPayload);
      setSource((payload.source ?? null) as AiSourceMeta | null);
      setEstimate(Boolean(payload.estimate));
      setSelectedIds((payload.preview.checklist ?? []).map((item: ChecklistItem) => item.id));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'AI 분석에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const commit = async () => {
    if (!preview || !selectedItems.length) return;
    setCommitting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/dashboard-ai/coordination-commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          caseId: selectedCaseId || null,
          title: '사건허브 AI 실행 제안',
          summary: preview.summary,
          recipientMode: 'self',
          selectedItems: selectedItems.map((item) => ({
            label: item.label,
            detail: item.detail,
            dueAt: item.dueAt ?? null,
            priority: item.priority
          }))
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'AI 실행 반영에 실패했습니다.');
      }
      setSuccess('분석 제안을 기반으로 일정/할일 등록 요청을 반영했습니다.');
      setSource(null);
      setEstimate(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'AI 실행 반영에 실패했습니다.');
    } finally {
      setCommitting(false);
    }
  };

  const reportIssue = async () => {
    if (!preview) return;
    const reason = window.prompt('어떤 부분이 잘못됐나요? 간단히 설명해 주세요.');
    if (!reason?.trim()) return;

    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          aiFeature: 'ai_summary_card',
          screen: '/inbox/[hubId]',
          question: input.trim(),
          answer: `${preview.summary}\n${preview.checklist.map((item) => `- ${item.label}`).join('\n')}`,
          rationale: preview.reason,
          modelVersion: preview.provider ?? 'unknown',
          requestId: `case-hub-ai:${source?.generatedAt ?? Date.now()}`,
          reason: reason.trim(),
          status: '접수'
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'AI 피드백 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
      setSuccess('AI 결과 피드백이 접수되었습니다. 검토 후 개선에 반영합니다.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'AI 피드백 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const priorityLabel = (priority: ChecklistItem['priority']) => {
    if (priority === 'high') return '긴급';
    if (priority === 'medium') return '보통';
    return '낮음';
  };

  return (
    <section className="rounded-2xl border border-violet-200 bg-[linear-gradient(180deg,#fdfaff,#f6f0ff)] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-xl bg-violet-100">
            <Sparkles className="size-4 text-violet-600" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">AI 대화 분석</p>
            <p className="text-xs text-slate-500">대화 내용을 붙여넣으면 일정·할 일을 자동으로 추출해 드립니다.</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setOpen((prev) => !prev)} aria-expanded={open} aria-controls="ai-assistant-panel">
          {open ? '접기 ▲' : 'AI 도움받기 ▼'}
        </Button>
      </div>

      {open ? (
        <div id="ai-assistant-panel" className="mt-3 space-y-3">
          <div className="space-y-1">
            <label htmlFor="ai-input" className="text-xs font-medium text-slate-600">
              대화 내용 입력
            </label>
            <Textarea
              id="ai-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="예: 의뢰인이 내일 오후 3시까지 확인서를 제출하기로 했고, 담당 직원은 오늘 안으로 신분증 사본을 업로드해야 합니다."
              className="min-h-28 bg-white"
              aria-describedby="ai-input-hint"
            />
            <p id="ai-input-hint" className="text-xs text-slate-400">상담 메모, 카카오톡 대화, 전화 메모 등을 그대로 붙여넣어도 됩니다.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={analyze} isLoading={loading} disabled={!input.trim()}>
              할 일 추출하기
            </Button>
            {caseOptions.length ? (
              <div className="flex items-center gap-1.5">
                <label htmlFor="ai-case-select" className="text-xs text-slate-500">등록할 사건</label>
                <select
                  id="ai-case-select"
                  value={selectedCaseId}
                  onChange={(event) => setSelectedCaseId(event.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800"
                >
                  {caseOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {preview ? (
            <div className="rounded-xl border border-violet-200 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{preview.summary}</p>
                  <p className="mt-1 text-xs text-slate-500">{preview.reason}</p>
                </div>
                {estimate ? (
                  <Badge tone="amber">추정값 — 반드시 확인 후 등록</Badge>
                ) : null}
              </div>
              <div className="mt-3 space-y-2">
                {preview.checklist.map((item) => (
                  <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs hover:border-violet-300 hover:bg-violet-50/40">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={selectedIds.includes(item.id)}
                      onChange={(event) => {
                        setSelectedIds((prev) => event.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id));
                      }}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{item.label}</p>
                      <p className="mt-0.5 text-slate-600">{item.detail}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <Badge tone={item.priority === 'high' ? 'red' : item.priority === 'medium' ? 'amber' : 'slate'}>{priorityLabel(item.priority)}</Badge>
                        {item.dueAt ? <Badge tone="blue">기한 {item.dueAt.slice(0, 10)}</Badge> : null}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={commit} isLoading={committing} disabled={!selectedItems.length} aria-describedby="commit-hint">
                  선택 항목 등록하기 ({selectedItems.length}개)
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={reportIssue}
                  aria-label="AI 결과가 잘못됐나요? 피드백 보내기"
                  title="AI 결과가 잘못됐나요?"
                  className="flex items-center gap-1 text-slate-400 hover:text-rose-600"
                >
                  <ThumbsDown className="size-3.5" />
                  <span className="text-xs">결과가 틀렸나요?</span>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>
                  다시 입력
                </Button>
              </div>
              <p id="commit-hint" className="mt-1 text-xs text-slate-400">등록하면 선택한 사건의 일정·요청 목록에 자동으로 추가됩니다.</p>
            </div>
          ) : null}

          {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
          {success ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
