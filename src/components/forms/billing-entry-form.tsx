import { addBillingEntryAction } from '@/lib/actions/case-actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';
import { ClientActionForm } from '@/components/ui/client-action-form';

export function BillingEntryForm({ caseId }: { caseId: string }) {
  const action = addBillingEntryAction.bind(null, caseId);
  return (
    <ClientActionForm action={action} successTitle="청구 항목이 등록되었습니다." className="grid gap-3 md:grid-cols-2">
      <select name="entryType" defaultValue="service_fee" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="retainer_fee">착수금</option>
        <option value="flat_fee">정액 보수</option>
        <option value="success_fee">성공보수</option>
        <option value="expense">실비</option>
        <option value="court_fee">인지대/송달료</option>
        <option value="service_fee">서비스 수수료</option>
        <option value="discount">할인</option>
        <option value="adjustment">조정</option>
        <option value="internal_settlement">내부 정산</option>
      </select>
      <select name="billToPartyKind" defaultValue="case_client" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="case_client">의뢰인 청구</option>
        <option value="case_organization">참여 조직 청구</option>
      </select>
      <Input name="billToCaseClientId" placeholder="의뢰인 ID" />
      <Input name="billToCaseOrganizationId" placeholder="조직 참여 ID" />
      <Input name="title" placeholder="항목명" required className="md:col-span-2" />
      <Input name="amount" type="number" min="0" step="0.01" placeholder="공급가액" required />
      <Input name="taxAmount" type="number" min="0" step="0.01" placeholder="세액" defaultValue={0} />
      <Input name="dueOn" type="date" />
      <Textarea name="notes" placeholder="비고" className="md:col-span-2" />
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="등록 중...">청구 항목 등록</SubmitButton>
      </div>
    </ClientActionForm>
  );
}
