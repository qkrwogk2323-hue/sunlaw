import { reviewDocumentAction } from '@/lib/actions/case-actions';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';

export function DocumentReviewForm({ documentId }: { documentId: string }) {
  const action = reviewDocumentAction.bind(null, documentId);

  return (
    <form action={action} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <select name="decision" defaultValue="approved" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="approved">승인</option>
        <option value="rejected">반려</option>
      </select>
      <Textarea name="reviewNote" placeholder="검토 의견" />
      <SubmitButton pendingLabel="처리 중...">결재 처리</SubmitButton>
    </form>
  );
}
