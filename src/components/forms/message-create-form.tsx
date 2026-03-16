import { addMessageAction } from '@/lib/actions/case-actions';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';

export function MessageCreateForm({ caseId, allowInternal = true }: { caseId: string; allowInternal?: boolean }) {
  const action = addMessageAction.bind(null, caseId);
  return (
    <form action={action} className="space-y-3">
      <Textarea name="body" placeholder="사건별 메시지를 남기세요" />
      {allowInternal ? (
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="isInternal" className="size-4 rounded border-slate-300" />
          내부 메모로 등록
        </label>
      ) : null}
      <SubmitButton pendingLabel="전송 중...">메시지 등록</SubmitButton>
    </form>
  );
}
