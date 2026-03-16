'use client';

import { createClientServiceRequestAction } from '@/lib/actions/client-account-actions';
import { SubmitButton } from '@/components/ui/submit-button';

export function ClientServiceRequestForm({
  organizationId,
  requestKind,
  defaultTitle,
  description
}: {
  organizationId?: string | null;
  requestKind: 'status_help' | 'reapproval_help' | 'access_issue';
  defaultTitle: string;
  description: string;
}) {
  return (
    <form action={createClientServiceRequestAction} className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-white p-4">
      <input type="hidden" name="organizationId" value={organizationId ?? ''} />
      <input type="hidden" name="requestKind" value={requestKind} />
      <div>
        <p className="text-sm font-medium text-slate-900">고객센터 문의하기</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <input
        type="text"
        name="title"
        defaultValue={defaultTitle}
        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900"
        required
      />
      <textarea
        name="body"
        rows={4}
        placeholder="현재 상태에서 막히는 점과 확인이 필요한 내용을 적어 주세요."
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        required
      />
      <SubmitButton variant="secondary" pendingLabel="문의 접수 중..." className="w-full justify-center rounded-[1.2rem]">
        문의 접수하기
      </SubmitButton>
    </form>
  );
}