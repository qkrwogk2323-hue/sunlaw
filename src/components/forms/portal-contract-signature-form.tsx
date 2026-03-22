'use client';

import { useState } from 'react';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { confirmPortalContractSignatureAction } from '@/lib/actions/client-account-actions';

export function PortalContractSignatureForm({
  caseId,
  agreementId,
  requestId,
  buttonLabel = '계약 내용에 동의하고 완료 처리',
}: {
  caseId: string;
  agreementId: string;
  requestId?: string | null;
  buttonLabel?: string;
}) {
  const [agreed, setAgreed] = useState(false);

  return (
    <ClientActionForm
      action={confirmPortalContractSignatureAction}
      successTitle="계약 동의가 기록되었습니다."
      successMessage="담당 조직이 계약 체결 현황에서 바로 확인할 수 있습니다."
      className="space-y-3"
    >
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="agreementId" value={agreementId} />
      <input type="hidden" name="requestId" value={requestId ?? ''} />

      <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
        <input
          type="checkbox"
          name="agreed"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          className="mt-0.5 size-4 rounded border-slate-300"
        />
        <span>계약서를 확인했고, 안내된 방식에 따라 계약 체결에 동의합니다.</span>
      </label>

      <SubmitButton disabled={!agreed} pendingLabel="동의 기록 저장 중...">
        {buttonLabel}
      </SubmitButton>
    </ClientActionForm>
  );
}
