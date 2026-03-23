'use client';

import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

export function HubPinGateForm({
  action,
  hubId,
  organizationId,
  title,
  description
}: {
  action: (formData: FormData) => Promise<void>;
  hubId: string;
  organizationId?: string | null;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <ClientActionForm
        action={action}
        successTitle="입장 확인이 완료되었습니다."
        errorCause="비밀번호를 다시 확인해 주세요."
        errorResolution="4자리 숫자를 입력한 뒤 다시 시도해 주세요."
        className="mt-5 flex flex-wrap items-end gap-3"
      >
        <input type="hidden" name="hubId" value={hubId} />
        {organizationId ? <input type="hidden" name="organizationId" value={organizationId} /> : null}
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor={`pin-${hubId}`}>
            허브 비밀번호
          </label>
          <Input
            id={`pin-${hubId}`}
            name="pin"
            inputMode="numeric"
            maxLength={4}
            pattern="[0-9]{4}"
            placeholder="4자리 숫자"
            required
          />
        </div>
        <SubmitButton>확인</SubmitButton>
      </ClientActionForm>
    </div>
  );
}
