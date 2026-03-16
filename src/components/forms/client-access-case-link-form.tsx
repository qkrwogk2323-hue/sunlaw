'use client';

import { attachClientAccessRequestToCaseAction } from '@/lib/actions/organization-actions';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

type CaseOption = {
  id: string;
  title: string;
  reference_no?: string | null;
};

export function ClientAccessCaseLinkForm({
  requestId,
  organizationId,
  cases
}: {
  requestId: string;
  organizationId: string;
  cases: CaseOption[];
}) {
  return (
    <form action={attachClientAccessRequestToCaseAction} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/85 p-4">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">연결할 사건</label>
        <select
          name="caseId"
          required
          defaultValue=""
          className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900"
        >
          <option value="" disabled>
            사건을 선택해 주세요
          </option>
          {cases.map((caseItem) => (
            <option key={caseItem.id} value={caseItem.id}>
              {caseItem.reference_no ? `${caseItem.reference_no} · ` : ''}
              {caseItem.title}
            </option>
          ))}
        </select>
      </div>
      <Input name="relationLabel" placeholder="관계 표기 예: 의뢰인, 실무 담당자" />
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="portalEnabled" defaultChecked className="size-4 rounded border-slate-300" />
        포털에서 사건 진행을 바로 볼 수 있게 연결
      </label>
      <SubmitButton variant="secondary" pendingLabel="연결 중..." className="w-full justify-center rounded-[1.2rem]">
        사건에 연결하기
      </SubmitButton>
    </form>
  );
}