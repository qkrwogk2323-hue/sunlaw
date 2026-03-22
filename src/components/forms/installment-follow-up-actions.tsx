'use client';

import { Input } from '@/components/ui/input';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { extendInstallmentPlanAction, issueInstallmentShortageBillingAction } from '@/lib/actions/case-actions';

export function InstallmentFollowUpActions({
  agreementId,
  caseId
}: {
  agreementId: string;
  caseId: string;
}) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-2 md:grid-cols-2">
      <ClientActionForm
        action={issueInstallmentShortageBillingAction}
        successTitle="부족분 청구를 만들었습니다."
        successMessage="비용 관리와 사건 비용 탭에서 바로 확인할 수 있습니다."
      >
        <input type="hidden" name="agreementId" value={agreementId} />
        <input type="hidden" name="caseId" value={caseId} />
        <SubmitButton className="w-full">부족분 합산 청구</SubmitButton>
      </ClientActionForm>

      <ClientActionForm
        action={extendInstallmentPlanAction}
        successTitle="회차 연장 결정이 기록되었습니다."
        successMessage="계약 관리와 비용 관리에서 같은 기준으로 이어집니다."
        className="space-y-2"
      >
        <input type="hidden" name="agreementId" value={agreementId} />
        <input type="hidden" name="caseId" value={caseId} />
        <div className="grid gap-2 md:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">추가 회차 수</span>
            <Input name="additionalRounds" type="number" min="1" max="60" defaultValue="1" />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">다음 기준일</span>
            <Input name="nextDueOn" type="date" defaultValue={today} />
          </label>
        </div>
        <SubmitButton className="w-full" variant="secondary">회차 늘리기</SubmitButton>
      </ClientActionForm>
    </div>
  );
}
