import { addDocumentAction } from '@/lib/actions/case-actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';
import { ClientActionForm } from '@/components/ui/client-action-form';

export function DocumentCreateForm({ caseId }: { caseId: string }) {
  const action = addDocumentAction.bind(null, caseId);

  return (
    <ClientActionForm action={action} successTitle="문서가 등록되었습니다." className="grid gap-3 md:grid-cols-2">
      <Input name="title" placeholder="문서 제목" required className="md:col-span-2" />
      <select name="documentKind" defaultValue="brief" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="complaint">소장</option>
        <option value="answer">답변서</option>
        <option value="brief">준비서면</option>
        <option value="evidence">증거</option>
        <option value="contract">계약서</option>
        <option value="order">명령/결정문</option>
        <option value="notice">안내문</option>
        <option value="opinion">의견서</option>
        <option value="internal_memo">내부메모</option>
        <option value="other">기타</option>
      </select>
      <select name="clientVisibility" defaultValue="internal_only" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="internal_only">내부 전용</option>
        <option value="client_visible">의뢰인 공개</option>
      </select>
      <input name="file" type="file" className="md:col-span-2 block w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600" />
      <Textarea name="summary" placeholder="문서 요약" className="md:col-span-2" />
      <Textarea name="contentMarkdown" placeholder="텍스트 본문 또는 메모" className="md:col-span-2" />
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="문서 저장 중...">문서 등록</SubmitButton>
      </div>
    </ClientActionForm>
  );
}
