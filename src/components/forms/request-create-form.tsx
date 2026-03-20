import { addRequestAction } from '@/lib/actions/case-actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';
import { ClientActionForm } from '@/components/ui/client-action-form';

export function RequestCreateForm({ caseId }: { caseId: string }) {
  const action = addRequestAction.bind(null, caseId);
  return (
    <ClientActionForm action={action} successTitle="요청이 등록되었습니다." className="grid gap-3 md:grid-cols-2">
      <select name="kind" defaultValue="question" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="question">문의</option>
        <option value="document_request">자료 요청</option>
        <option value="document_submission">자료 제출</option>
        <option value="schedule_request">일정 요청</option>
        <option value="call_request">통화 요청</option>
        <option value="meeting_request">미팅 요청</option>
        <option value="status_check">진행 문의</option>
        <option value="signature_request">서명 요청</option>
        <option value="other">기타</option>
      </select>
      <Input name="dueAt" type="datetime-local" />
      <Input name="title" placeholder="요청 제목" required className="md:col-span-2" />
      <Textarea name="body" placeholder="요청 내용" className="md:col-span-2" />
      <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2">
        <input type="checkbox" name="clientVisible" defaultChecked className="size-4 rounded border-slate-300" />
        의뢰인에게 표시
      </label>
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="등록 중...">요청 등록</SubmitButton>
      </div>
    </ClientActionForm>
  );
}
