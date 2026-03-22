'use client';

import { useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
        <p className="text-sm font-medium text-sky-900">대량 등록은 CSV 양식에 맞춰 올려 주세요.</p>
        <p className="mt-1 text-xs leading-6 text-sky-800">양식 다운로드 버튼으로 기본 양식을 받은 뒤 그대로 작성해서 올리면 가장 빠르게 등록됩니다.</p>
      </div>
      <p className="text-xs text-slate-500">
        <span className="text-red-500" aria-hidden="true">*</span> 파일 선택 또는 CSV 내용 입력 중 하나는 반드시 필요합니다.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={downloadTemplate}
        >
          {`${label} CSV 양식 내려받기`}
        </Button>
        <label className="cursor-pointer rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800 hover:bg-blue-100">
          CSV 파일 선택
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

      <div className="space-y-2">
        <label htmlFor={`bulk-upload-${mode}`} className="text-sm font-medium text-slate-700">
          CSV 내용 <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <p className="text-xs text-slate-500">직접 입력은 최대 5건까지 권장하며, 그 이상은 내려받은 CSV 양식 그대로 파일 업로드로 진행해 주세요.</p>
      </div>
      <Textarea
        id={`bulk-upload-${mode}`}
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
        rows={5}
        aria-required="true"
        placeholder={`헤더 포함 CSV 내용 붙여넣기\n예) ${template.split('\n')[0]}`}
        className="min-h-32 text-xs font-mono"
        aria-label={`${label} CSV 직접 입력`}
      />

      <Button
        onClick={handleSubmit}
        isLoading={isPending}
        disabled={!csvText.trim()}
        aria-label={`${label} CSV 일괄 등록 실행`}
      >
        {`${label} 일괄 등록`}
      </Button>

      {result?.ok && (
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-semibold text-emerald-900">{result.created}건 등록 완료{result.skipped > 0 ? ` / ${result.skipped}건 건너뜀` : ''}</p>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="mb-2 text-sm font-semibold text-amber-900">처리 중 확인할 내용</p>
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
              <p className="mb-2 text-sm font-semibold text-blue-900">입력 참고 안내</p>
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
