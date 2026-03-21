'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { createClientBulkInvitationAction } from '@/lib/actions/organization-actions';

type CaseOption = { id: string; title: string; referenceNo?: string | null };
type ClientInviteRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  relationLabel: string;
  secondaryContact: string;
};

const defaultRow = (): ClientInviteRow => ({
  id: crypto.randomUUID(),
  name: '',
  email: '',
  phone: '',
  relationLabel: '',
  secondaryContact: ''
});

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
  const selectedCase = cases.find((item) => item.id === selectedCaseId) ?? null;
  const populatedRows = useMemo(
    () => rows.filter((row) => row.name.trim() || row.email.trim() || row.phone.trim() || row.relationLabel.trim() || row.secondaryContact.trim()),
    [rows]
  );

  function updateRow(id: string, field: keyof Omit<ClientInviteRow, 'id'>, value: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((current) => (current.length >= 5 ? current : [...current, defaultRow()]));
  }

  function canAdvanceFromInput() {
    return Boolean(
      populatedRows.length
      && populatedRows.every((row) => row.name.trim().length >= 2 && row.email.trim())
    );
  }

  return (
    <div className="space-y-4">
      {step === 1 ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">문맥 고정</p>
            <p className="mt-2 text-sm text-slate-700">의뢰인 초대는 사건 문맥이 먼저 고정되어야 합니다. 미연결 의뢰인은 이 기본 플로우에 남기지 않습니다.</p>
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
              <span className="font-medium">초대 방식</span>
              <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                이메일 매직링크
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
            <p className="text-xs text-slate-500">기본 3행, 최대 5행까지 직접 입력합니다. 5행을 넘으면 CSV 등록으로 전환합니다.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addRow}
                disabled={rows.length >= 5}
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
        <ClientActionForm
          action={createClientBulkInvitationAction}
          successTitle="의뢰인 초대가 준비되었습니다."
          successMessage="완료 카드에서 사건 연결, 발송 준비, 실패 사유를 함께 확인할 수 있습니다."
          className="space-y-4"
        >
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="caseId" value={selectedCaseId} />
          <input type="hidden" name="expiresHours" value={String(expiresHours)} />
          <input type="hidden" name="entries" value={JSON.stringify(populatedRows)} />

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
                <p className="text-xs text-slate-500">인증</p>
                <p className="mt-1 text-sm font-medium text-slate-900">매직링크</p>
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
              <span className="font-medium">허브 연결</span>
              <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                사건 연결 후 허브에서 추가 연결
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            표준 플로우에서는 사건에 연결되지 않은 의뢰인을 남기지 않습니다. 비밀번호는 노출하지 않고 매직링크만 생성합니다.
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              입력 단계로 돌아가기
            </button>
            <SubmitButton pendingLabel="초대 준비 중...">의뢰인 초대 생성</SubmitButton>
          </div>
        </ClientActionForm>
      ) : null}
    </div>
  );
}
