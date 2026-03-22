'use client';

import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';
import { createPlatformSupportTicketAction } from '@/lib/actions/support-actions';

export function PlatformSupportTicketForm() {
  return (
    <ClientActionForm
      action={createPlatformSupportTicketAction}
      successTitle="고객센터 문의가 접수되었습니다."
      successMessage="플랫폼 운영팀이 내용을 확인한 뒤 상태와 답변을 남깁니다."
      className="space-y-4"
    >
      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">구분</span>
          <select
            name="category"
            defaultValue="question"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
          >
            <option value="question">문의</option>
            <option value="request">요청</option>
            <option value="bug">오류 신고</option>
            <option value="opinion">의견</option>
          </select>
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">제목</span>
          <Input name="title" required aria-required="true" placeholder="예: 조직 전환 뒤 화면이 갱신되지 않습니다" />
        </label>
      </div>
      <label className="space-y-2 text-sm text-slate-700">
        <span className="font-medium text-slate-900">내용</span>
        <Textarea
          name="body"
          required
          aria-required="true"
          className="min-h-40"
          placeholder="무엇을 요청하거나 제안하는지, 어느 화면에서 문제가 있었는지 자세히 적어 주세요."
        />
      </label>
      <SubmitButton pendingLabel="문의 접수 중..." className="rounded-[1.2rem]">
        고객센터로 보내기
      </SubmitButton>
    </ClientActionForm>
  );
}
