'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { useToast } from '@/components/ui/toast-provider';
import { createClientBulkInvitationBatchAction, type ClientInvitationBatchResult } from '@/lib/actions/organization-actions';

type CaseOption = { id: string; title: string; referenceNo?: string | null };
type ClientInviteRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  relationLabel: string;
  secondaryContact: string;
};

const CLIENT_INVITE_TEMPLATE = `이름,이메일,휴대폰,관계,보조연락처
홍길동,hong@example.com,010-1234-5678,의뢰인,카카오 우선
김영희,kim@example.com,010-7777-8888,보호자,평일 오후 연락`;

const defaultRow = (): ClientInviteRow => ({
  id: crypto.randomUUID(),
  name: '',
  email: '',
  phone: '',
  relationLabel: '',
  secondaryContact: ''
});

function parseCSVLine(line: string) {
  const fields: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuote && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuote = !inQuote;
      }
      continue;
    }

    if (char === ',' && !inQuote) {
      fields.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  fields.push(current.trim());
  return fields;
}

function parseInviteCSV(text: string): ClientInviteRow[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((header) => header.replace(/^\uFEFF/, '').trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));

    return {
      id: crypto.randomUUID(),
      name: `${row['이름'] || row['name'] || ''}`.trim(),
      email: `${row['이메일'] || row['email'] || ''}`.trim(),
      phone: `${row['휴대폰'] || row['연락처'] || row['phone'] || ''}`.trim(),
      relationLabel: `${row['관계'] || row['relation'] || ''}`.trim(),
      secondaryContact: `${row['보조연락처'] || row['secondarycontact'] || row['메모'] || row['note'] || ''}`.trim()
    };
  });
}

export function ClientStructuredInviteForm({
  organizationId,
  cases
}: {
  organizationId: string;
  cases: CaseOption[];
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id ?? '');
  const [expiresHours, setExpiresHours] = useState(72);
  const [rows, setRows] = useState<ClientInviteRow[]>(() => Array.from({ length: 3 }, defaultRow));
  const [result, setResult] = useState<ClientInvitationBatchResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();

  const selectedCase = cases.find((item) => item.id === selectedCaseId) ?? null;
  const populatedRows = useMemo(
    () => rows.filter((row) => row.name.trim() || row.email.trim() || row.phone.trim() || row.relationLabel.trim() || row.secondaryContact.trim()),
    [rows]
  );

  function updateRow(id: string, field: keyof Omit<ClientInviteRow, 'id'>, value: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((current) => [...current, defaultRow()]);
  }

  function canAdvanceFromInput() {
    return Boolean(
      populatedRows.length
      && populatedRows.every((row) => row.name.trim().length >= 2 && row.email.trim())
    );
  }

  function downloadTemplate() {
    const blob = new Blob([`\uFEFF${CLIENT_INVITE_TEMPLATE}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '의뢰인_초대_양식.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadInviteLinks() {
    if (!result?.ok || !result.created.length) return;

    const header = '이름,이메일,관계,초대링크\n';
    const body = result.created
      .map((entry) => `"${entry.name}","${entry.email}","${entry.relationLabel ?? '의뢰인'}","${entry.url}"`)
      .join('\n');
    const blob = new Blob([`\uFEFF${header}${body}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '의뢰인_카카오톡_전달용_초대링크.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function handlePendingKakaoFeature() {
    success('구현중입니다.', {
      message: '카카오 고유 버튼, 알림톡, 채널 자동 발송은 추후 연동 예정입니다.'
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const text = `${loadEvent.target?.result ?? ''}`;
      const importedRows = parseInviteCSV(text).filter((row) => (
        row.name.trim() || row.email.trim() || row.phone.trim() || row.relationLabel.trim() || row.secondaryContact.trim()
      ));

      if (!importedRows.length) {
        toastError('CSV 확인 필요', { message: '양식 파일에 이름과 이메일이 있는 데이터가 필요합니다.' });
        return;
      }

      setRows(importedRows);
      success(`의뢰인 ${importedRows.length}명 불러옴`, {
        message: '연결 설정 검토로 넘어가면 초대 링크를 한 번에 만들 수 있습니다.'
      });
    };
    reader.readAsText(file, 'utf-8');
  }

  function handleCreateInvitations() {
    if (!selectedCaseId || !populatedRows.length) return;

    startTransition(async () => {
      const response = await createClientBulkInvitationBatchAction({
        organizationId,
        caseId: selectedCaseId,
        expiresHours,
        entries: populatedRows.map((row) => ({
          name: row.name,
          email: row.email,
          phone: row.phone,
          relationLabel: row.relationLabel,
          secondaryContact: row.secondaryContact
        }))
      });

      setResult(response);
      if (response.ok) {
        success(`의뢰인 초대 ${response.created.length}건 준비 완료`, {
          message: response.failed.length ? `${response.failed.length}건은 확인이 필요합니다.` : '카카오톡 전달용 초대 링크 CSV를 내려받을 수 있습니다.'
        });
      } else {
        toastError('초대 생성 실패', { message: response.message });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-4">
        {[
          { index: 1, label: '문맥 고정', active: step === 1 },
          { index: 2, label: '대상 입력', active: step === 2 },
          { index: 3, label: '연결 검토', active: step === 3 },
          { index: 4, label: '완료 카드', active: false }
        ].map((item) => (
          <div
            key={item.index}
            className={`rounded-xl border px-3 py-2 text-sm ${
              item.active
                ? 'border-sky-300 bg-sky-50 text-sky-950'
                : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Step {item.index}</p>
            <p className="mt-1 font-medium">{item.label}</p>
          </div>
        ))}
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">문맥 고정</p>
            <p className="mt-2 text-sm text-slate-700">의뢰인 초대는 사건 문맥을 먼저 고정한 뒤, 카카오톡으로 전달할 초대 링크를 한 번에 준비하는 흐름으로 진행합니다.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">연결 사건</span>
              <select
                value={selectedCaseId}
                onChange={(event) => setSelectedCaseId(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                aria-label="의뢰인 초대 연결 사건 선택"
              >
                {cases.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">전달 방식</span>
              <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                카카오톡 전달용 초대 링크
              </div>
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!selectedCaseId}
              className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              대상 입력 계속
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            {rows.map((row, index) => (
              <div key={row.id} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 md:grid-cols-4">
                <Input
                  value={row.name}
                  onChange={(event) => updateRow(row.id, 'name', event.target.value)}
                  placeholder={`이름 ${index + 1}`}
                  aria-label={`의뢰인 ${index + 1} 이름`}
                />
                <Input
                  type="email"
                  value={row.email}
                  onChange={(event) => updateRow(row.id, 'email', event.target.value)}
                  placeholder="연락 이메일"
                  aria-label={`의뢰인 ${index + 1} 연락 이메일`}
                />
                <Input
                  value={row.phone}
                  onChange={(event) => updateRow(row.id, 'phone', event.target.value)}
                  placeholder="휴대폰(선택)"
                  aria-label={`의뢰인 ${index + 1} 휴대폰`}
                />
                <Input
                  value={row.relationLabel}
                  onChange={(event) => updateRow(row.id, 'relationLabel', event.target.value)}
                  placeholder="관계(선택)"
                  aria-label={`의뢰인 ${index + 1} 관계`}
                />
                <div className="md:col-span-4">
                  <Input
                    value={row.secondaryContact}
                    onChange={(event) => updateRow(row.id, 'secondaryContact', event.target.value)}
                    placeholder="보조 연락처 또는 전달 메모(선택)"
                    aria-label={`의뢰인 ${index + 1} 보조 연락처`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs text-slate-500">직접 입력 명수 제한은 두지 않습니다. 여러 명이면 CSV 양식을 내려받아 한 번에 불러오는 방식이 더 빠릅니다.</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={downloadTemplate}>
                  CSV 양식 내려받기
                </Button>
                <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  CSV 불러오기
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={handleFileChange}
                    aria-label="의뢰인 초대 CSV 불러오기"
                  />
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addRow}
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                다른 의뢰인 추가
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!canAdvanceFromInput()}
                className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                연결 설정 검토
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">연결 문맥</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">조직</p>
                <p className="mt-1 text-sm font-medium text-slate-900">현재 조직</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">사건</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{selectedCase?.title ?? '미선택'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">전달</p>
                <p className="mt-1 text-sm font-medium text-slate-900">카카오톡 전달용 링크</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">연결 대상 {populatedRows.length}명</p>
            <div className="mt-3 space-y-2">
              {populatedRows.map((row) => (
                <div key={row.id} className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm md:grid-cols-[1.2fr_1.2fr_0.9fr]">
                  <div>
                    <p className="font-medium text-slate-900">{row.name}</p>
                    <p className="text-slate-500">{row.email}</p>
                  </div>
                  <div className="text-slate-500">
                    <p>{row.relationLabel.trim() || '의뢰인'}</p>
                    <p>{row.phone.trim() || '전화번호 미입력'}</p>
                  </div>
                  <div className="text-slate-500">
                    <p>사건 연결: 완료 예정</p>
                    <p>초대 링크: 생성 예정</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">링크 만료 시간</span>
              <Input
                type="number"
                min="1"
                max="336"
                value={String(expiresHours)}
                onChange={(event) => setExpiresHours(Math.max(1, Number(event.target.value) || 72))}
                aria-label="의뢰인 초대 링크 만료 시간"
              />
            </label>
            <div className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">다운로드</span>
              <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                생성 후 카카오톡 전달용 링크 CSV 제공
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            초대 링크를 만든 뒤 CSV로 내려받아 카카오톡 전달 작업에 바로 활용할 수 있습니다.
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              입력 단계로 돌아가기
            </button>
            <SubmitButton
              onClick={handleCreateInvitations}
              pendingLabel="초대 준비 중..."
              disabled={isPending || !populatedRows.length}
            >
              의뢰인 초대 생성
            </SubmitButton>
          </div>

          {result?.ok ? (
            <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-emerald-950">초대 링크 {result.created.length}건 준비 완료</p>
                  <p className="mt-1 text-sm text-emerald-900">{result.caseTitle} 기준으로 연결됐고, 카카오톡 전달용 초대 링크 CSV를 바로 내려받을 수 있습니다.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={downloadInviteLinks}>
                    초대 링크 CSV 내려받기
                  </Button>
                  <Button type="button" variant="secondary" onClick={handlePendingKakaoFeature}>
                    카카오 발송
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 text-sm md:grid-cols-3">
                <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                  <p className="text-xs text-emerald-700">생성 완료</p>
                  <p className="mt-1 font-semibold text-slate-900">{result.created.length}건</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                  <p className="text-xs text-emerald-700">실패</p>
                  <p className="mt-1 font-semibold text-slate-900">{result.failed.length}건</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                  <p className="text-xs text-emerald-700">링크 만료</p>
                  <p className="mt-1 font-semibold text-slate-900">{result.expiresHours}시간</p>
                </div>
              </div>

              <div className="space-y-2">
                {result.created.slice(0, 10).map((entry) => (
                  <div key={`${entry.email}:${entry.url}`} className="rounded-xl border border-emerald-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{entry.name}</p>
                        <p className="text-sm text-slate-500">{entry.email}</p>
                      </div>
                      <p className="text-xs font-medium text-emerald-800">{entry.relationLabel ?? '의뢰인'}</p>
                    </div>
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <code className="select-all text-xs text-slate-800">{entry.url}</code>
                    </div>
                  </div>
                ))}
                {result.created.length > 10 ? (
                  <p className="text-xs text-emerald-900">처음 10건만 화면에 보여주고, 전체 링크는 CSV 내려받기로 제공합니다.</p>
                ) : null}
              </div>

              {result.failed.length ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="mb-2 font-semibold">확인이 필요한 대상</p>
                  {result.failed.map((entry) => (
                    <p key={`${entry.email}:${entry.reason}`}>{entry.name} · {entry.email} · {entry.reason}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
