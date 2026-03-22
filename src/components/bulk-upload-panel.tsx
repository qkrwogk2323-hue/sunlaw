'use client';

import { useRef, useState, useTransition } from 'react';
import { useToast } from '@/components/ui/toast-provider';
import type { BulkUploadResult } from '@/lib/actions/bulk-upload-actions';

interface Props {
  mode: 'clients' | 'cases';
  organizationId: string;
  action: (orgId: string, csvText: string) => Promise<BulkUploadResult>;
}

const CLIENT_TEMPLATE = `이름,이메일,연락처,사건제목,관계,특이사항
홍길동,hong@example.com,010-1234-5678,2024 민사사건,의뢰인,협의 중
김영희,kim@example.com,010-9876-5432,,의뢰인,`;

const CASE_TEMPLATE = `제목,사건유형,원금,법원,사건번호,접수일,의뢰인,의뢰인이메일,요약
2024 손해배상 청구,civil,5000000,서울중앙지방법원,2024가합12345,2024-01-15,홍길동,hong@example.com,교통사고 손해배상
2024 대여금 청구,debt_collection,3000000,,,2024-02-01,,, `;

export function BulkUploadPanel({ mode, organizationId, action }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [csvText, setCsvText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();

  const label = mode === 'clients' ? '의뢰인' : '사건';
  const template = mode === 'clients' ? CLIENT_TEMPLATE : CASE_TEMPLATE;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText((ev.target?.result as string) ?? '');
    reader.readAsText(file, 'utf-8');
  }

  function handleSubmit() {
    if (!csvText.trim()) {
      toastError('파일 없음', { message: 'CSV 파일을 먼저 선택하거나 직접 붙여넣어 주세요.' });
      return;
    }
    startTransition(async () => {
      try {
        const res = await action(organizationId, csvText);
        setResult(res);
        if (res.ok) {
          success(`${label} ${res.created}건 등록 완료`, {
            message: res.skipped > 0 ? `${res.skipped}건 건너뜀` : '전체 처리 완료'
          });
        } else {
          toastError('업로드 실패', { message: res.userMessage });
        }
      } catch (err: any) {
        toastError('업로드 오류', { message: err?.message ?? '알 수 없는 오류가 발생했습니다.' });
      }
    });
  }

  function downloadTemplate() {
    const bom = '\uFEFF';
    const blob = new Blob([bom + template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${label}_일괄등록_양식.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={downloadTemplate}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          📄 양식 다운로드
        </button>
        <label className="cursor-pointer rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800 hover:bg-blue-100">
          📂 CSV 파일 선택
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={handleFileChange}
            aria-label={`${label} CSV 파일 선택`}
          />
        </label>
        {csvText && (
          <span className="text-xs text-slate-500">
            {csvText.split('\n').filter(Boolean).length - 1}행 감지됨
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500">또는 CSV 내용을 직접 붙여넣기</p>
      <textarea
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
        rows={5}
        placeholder={`헤더 포함 CSV 내용 붙여넣기\n예) ${template.split('\n')[0]}`}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
        aria-label={`${label} CSV 직접 입력`}
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !csvText.trim()}
        aria-label={`${label} CSV 일괄 등록 실행`}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? '처리 중...' : `${label} 일괄 등록`}
      </button>

      {result?.ok && (
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-semibold text-emerald-900">✅ {result.created}건 등록 완료{result.skipped > 0 ? ` / ${result.skipped}건 건너뜀` : ''}</p>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="mb-2 text-sm font-semibold text-amber-900">⚠️ 처리 중 발생한 문제</p>
              <ul className="space-y-1">
                {result.errors.map((e) => (
                  <li key={`${e.row}-${e.reason}`} className="text-xs text-amber-800">
                    {e.row}행: {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.aiSuggestions.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="mb-2 text-sm font-semibold text-blue-900">🤖 AI 도우미 제안</p>
              <ul className="space-y-2">
                {result.aiSuggestions.map((s) => (
                  <li key={s.name} className="text-xs text-blue-800">
                    <span className="font-medium">{s.name}</span> — {s.suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
