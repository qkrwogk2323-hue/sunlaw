'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { createStaffBulkInvitationAction } from '@/lib/actions/organization-actions';

type StaffInviteRow = {
  id: string;
  name: string;
  email: string;
  secondaryEmail: string;
  membershipTitle: string;
};

const defaultRow = (): StaffInviteRow => ({
  id: crypto.randomUUID(),
  name: '',
  email: '',
  secondaryEmail: '',
  membershipTitle: ''
});

export function StaffBulkInviteForm({ organizationId }: { organizationId: string }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [rows, setRows] = useState<StaffInviteRow[]>(() => Array.from({ length: 3 }, defaultRow));
  const [actorCategory, setActorCategory] = useState<'admin' | 'staff'>('staff');
  const [expiresHours, setExpiresHours] = useState(72);
  const populatedRows = useMemo(
    () => rows.filter((row) => row.name.trim() || row.email.trim() || row.secondaryEmail.trim() || row.membershipTitle.trim()),
    [rows]
  );

  function updateRow(id: string, field: keyof Omit<StaffInviteRow, 'id'>, value: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((current) => (current.length >= 5 ? current : [...current, defaultRow()]));
  }

  function continueToSettings() {
    const hasInvalid = populatedRows.some((row) => row.name.trim().length < 2 || !row.email.trim());
    if (!populatedRows.length || hasInvalid) return;
    setStep(2);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-3">
        {[
          { index: 1, label: '입력', active: step === 1 },
          { index: 2, label: '권한 설정', active: step === 2 },
          { index: 3, label: '완료 카드', active: false }
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

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">목록 → 입력 → 완료</p>
        <p className="mt-2 text-sm text-slate-700">구성원 목록은 페이지에서 유지하고, 여기서는 3행 기본 입력 후 권한 설정 단계로 넘어갑니다.</p>
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            {rows.map((row, index) => (
              <div key={row.id} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 md:grid-cols-4">
                <Input
                  value={row.name}
                  onChange={(event) => updateRow(row.id, 'name', event.target.value)}
                  placeholder={`이름 ${index + 1}`}
                  aria-label={`초대 대상 ${index + 1} 이름`}
                />
                <Input
                  type="email"
                  value={row.email}
                  onChange={(event) => updateRow(row.id, 'email', event.target.value)}
                  placeholder="업무 이메일"
                  aria-label={`초대 대상 ${index + 1} 업무 이메일`}
                />
                <Input
                  type="email"
                  value={row.secondaryEmail}
                  onChange={(event) => updateRow(row.id, 'secondaryEmail', event.target.value)}
                  placeholder="보조 이메일(선택)"
                  aria-label={`초대 대상 ${index + 1} 보조 이메일`}
                />
                <Input
                  value={row.membershipTitle}
                  onChange={(event) => updateRow(row.id, 'membershipTitle', event.target.value)}
                  placeholder="직책(선택)"
                  aria-label={`초대 대상 ${index + 1} 직책`}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">기본 3행, 최대 5행까지 직접 입력할 수 있습니다.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addRow}
                disabled={rows.length >= 5}
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                다른 구성원 추가
              </button>
              <button
                type="button"
                onClick={continueToSettings}
                disabled={!populatedRows.length || populatedRows.some((row) => row.name.trim().length < 2 || !row.email.trim())}
                className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                권한 설정 계속
              </button>
            </div>
          </div>
        </div>
      ) : (
        <ClientActionForm
          action={createStaffBulkInvitationAction}
          successTitle="구성원 초대가 준비되었습니다."
          successMessage="완료 카드에서 링크와 실패 사유를 함께 확인할 수 있습니다."
          className="space-y-4"
        >
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="actorCategory" value={actorCategory} />
          <input type="hidden" name="expiresHours" value={String(expiresHours)} />
          <input type="hidden" name="entries" value={JSON.stringify(populatedRows)} />

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">초대 대상 {populatedRows.length}명</p>
            <div className="mt-3 space-y-2">
              {populatedRows.map((row) => (
                <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-900">{row.name}</span>
                  <span className="text-slate-500">{row.email}</span>
                  <span className="text-slate-500">{row.membershipTitle.trim() || '직책 미지정'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">권한 템플릿</span>
              <select
                value={actorCategory}
                onChange={(event) => setActorCategory(event.target.value as 'admin' | 'staff')}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                <option value="staff">조직원</option>
                <option value="admin">조직관리자</option>
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium">링크 만료 시간</span>
              <Input
                type="number"
                min="1"
                max="336"
                value={String(expiresHours)}
                onChange={(event) => setExpiresHours(Math.max(1, Number(event.target.value) || 72))}
                aria-label="직원 초대 링크 만료 시간"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            완료 카드에서 생성 여부, 안내 링크, 실패 사유를 한 번에 확인합니다. 비밀번호는 이 기본 초대 플로우에서 노출하지 않습니다.
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              입력 단계로 돌아가기
            </button>
            <SubmitButton pendingLabel="초대 준비 중...">구성원 초대 생성</SubmitButton>
          </div>
        </ClientActionForm>
      )}
    </div>
  );
}
