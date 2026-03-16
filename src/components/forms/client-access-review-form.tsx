'use client';

import { reviewClientAccessRequestAction } from '@/lib/actions/organization-actions';
import { SubmitButton } from '@/components/ui/submit-button';

export function ClientAccessReviewForm({ requestId, organizationId }: { requestId: string; organizationId: string }) {
  return (
    <div className="space-y-3">
      <form action={reviewClientAccessRequestAction} className="space-y-3">
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="decision" value="approved" />
        <textarea
          name="reviewNote"
          rows={3}
          placeholder="승인 또는 반려 메모를 남겨 주세요."
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        <SubmitButton variant="secondary" pendingLabel="반영 중..." className="w-full justify-center rounded-[1.2rem]">
          승인하기
        </SubmitButton>
      </form>
      <form action={reviewClientAccessRequestAction} className="space-y-3">
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="decision" value="rejected" />
        <textarea
          name="reviewNote"
          rows={2}
          placeholder="반려 사유를 남겨 주세요."
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        <SubmitButton variant="ghost" pendingLabel="반영 중..." className="w-full justify-center rounded-[1.2rem] border border-slate-200">
          반려하기
        </SubmitButton>
      </form>
    </div>
  );
}