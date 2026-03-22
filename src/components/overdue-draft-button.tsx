'use client';

import { useState } from 'react';
import { Bot, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/toast-provider';
import type { OverdueNoticeType, OverdueNoticeDraft } from '@/lib/ai/overdue-notice';

type Props = {
  organizationId: string;
  orgName: string;
  clientName: string;
  caseTitle: string;
  overdueAmount: number;
  dueDaysAgo: number;
  contactPhone?: string;
  accountInfo?: string;
  lawyerName?: string;
};

const NOTICE_TYPES: { key: OverdueNoticeType; label: string }[] = [
  { key: 'sms', label: '문자' },
  { key: 'kakao', label: '카카오' },
  { key: 'email', label: '이메일' },
];

export function OverdueDraftButton(props: Props) {
  const { success, error } = useToast();
  const [open, setOpen] = useState(false);
  const [noticeType, setNoticeType] = useState<OverdueNoticeType>('sms');
  const [draft, setDraft] = useState<OverdueNoticeDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setDraft(null);
    try {
      const response = await fetch('/api/ai/overdue-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...props,
          noticeType,
        }),
      });
      const json = await response.json() as
        | { ok: true; draft: OverdueNoticeDraft }
        | { ok: false; userMessage: string };

      if (!json.ok) {
        error('초안 생성 실패', { message: json.userMessage });
        return;
      }
      setDraft(json.draft);
    } catch {
      error('초안 생성 실패', { message: '네트워크 오류가 발생했습니다. 연결 상태를 확인해 주세요.' });
    } finally {
      setLoading(false);
    }
  };

  const copyDraft = async () => {
    if (!draft) return;
    const text = draft.subject ? `제목: ${draft.subject}\n\n${draft.body}` : draft.body;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    success('복사됨', { message: '클립보드에 복사되었습니다.' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100"
        aria-expanded={open}
        aria-label={`${props.clientName} 납부 안내 초안 생성`}
      >
        <Bot className="size-3.5" aria-hidden="true" />
        AI 납부 안내 초안
      </button>

      {open && (
        <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
          <p className="mb-3 text-xs font-semibold text-violet-700">
            {props.clientName} · {props.caseTitle}
          </p>

          {/* Type select */}
          <div className="mb-3 flex gap-2">
            {NOTICE_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => { setNoticeType(t.key); setDraft(null); }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${noticeType === t.key ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
                aria-pressed={noticeType === t.key}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={generate}
              disabled={loading}
              className="ml-auto inline-flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              aria-label="초안 생성"
            >
              {loading ? '생성 중...' : '초안 생성'}
            </button>
          </div>

          {draft && (
            <div className="space-y-2">
              {draft.subject && (
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs font-medium text-slate-500">제목</p>
                  <p className="mt-1 text-sm text-slate-900">{draft.subject}</p>
                </div>
              )}
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs font-medium text-slate-500">내용</p>
                <pre className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-900">
                  {draft.body}
                </pre>
              </div>
              <button
                type="button"
                onClick={copyDraft}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                aria-label="초안 복사"
              >
                {copied ? <Check className="size-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                {copied ? '복사됨' : '클립보드에 복사'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
