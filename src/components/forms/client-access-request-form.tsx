'use client';

import { submitClientAccessRequestAction } from '@/lib/actions/organization-actions';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';

export function ClientAccessRequestForm({
  organizationId,
  organizationKey,
  disabled,
  disabledLabel
}: {
  organizationId: string;
  organizationKey: string;
  disabled?: boolean;
  disabledLabel?: string;
}) {
  return (
    <ClientActionForm action={submitClientAccessRequestAction} successTitle="조직 가입 신청을 보냈습니다." className="space-y-3">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="organizationKey" value={organizationKey} />
      <textarea
        name="requestNote"
        rows={3}
        placeholder="조직에 전달할 메모가 있다면 입력해 주세요."
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
      />
      {disabled ? (
        <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-500">{disabledLabel ?? '현재 요청을 보낼 수 없습니다.'}</div>
      ) : (
        <SubmitButton variant="secondary" pendingLabel="요청 전송 중..." className="w-full justify-center rounded-[1.2rem]">
          조직가입신청 보내기
        </SubmitButton>
      )}
    </ClientActionForm>
  );
}
