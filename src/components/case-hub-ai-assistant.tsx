'use client';

import { useMemo, useState } from 'react';
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
    const reason = window.prompt('오답 신고 사유를 입력해 주세요.');
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
        throw new Error(payload?.error ?? '오답 신고 저장에 실패했습니다.');
      }
      setSuccess('오답 신고가 접수되었습니다.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '오답 신고 저장에 실패했습니다.');
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">AI 비서</p>
          <p className="mt-1 text-xs text-slate-500">대화를 분석해 일정·할일 등록 여부를 제안합니다.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setOpen((prev) => !prev)}>
          {open ? '닫기' : '열기'}
        </Button>
      </div>

      {open ? (
        <div className="mt-3 space-y-3">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="예: 베인이 내일 오후 3시까지 확인서를 제출하고, 의뢰인은 오늘 안에 신분증 사본을 업로드하기로 했습니다."
            className="min-h-28"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={analyze} isLoading={loading}>
              분석
            </Button>
            {caseOptions.length ? (
              <select
                value={selectedCaseId}
                onChange={(event) => setSelectedCaseId(event.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800"
              >
                {caseOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            ) : null}
          </div>

          {preview ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-900">{preview.summary}</p>
              <p className="mt-1 text-xs text-slate-500">{preview.reason}</p>
              {source ? <p className="mt-1 text-xs text-slate-500">출처: {source.dataType} · {source.generatedAt}</p> : null}
              {estimate ? <p className="mt-1 text-xs text-amber-700">표기: 추정 (자동 실행 금지)</p> : null}
              <div className="mt-3 space-y-2">
                {preview.checklist.map((item) => (
                  <label key={item.id} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={(event) => {
                        setSelectedIds((prev) => event.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id));
                      }}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{item.label}</p>
                      <p className="mt-0.5 text-slate-600">{item.detail}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <Badge tone={item.priority === 'high' ? 'amber' : 'slate'}>{item.priority}</Badge>
                        {item.dueAt ? <Badge tone="blue">{item.dueAt.slice(0, 10)}</Badge> : null}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={commit} isLoading={committing} disabled={!selectedItems.length}>
                  일정/할일 등록할까요?
                </Button>
                <Button size="sm" variant="secondary" onClick={reportIssue}>
                  오답 신고
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>
                  취소
                </Button>
              </div>
            </div>
          ) : null}

          {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
          {success ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
