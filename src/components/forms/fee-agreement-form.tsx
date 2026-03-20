import { addFeeAgreementAction } from '@/lib/actions/case-actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';
import { ClientActionForm } from '@/components/ui/client-action-form';

export function FeeAgreementForm({ caseId }: { caseId: string }) {
  const action = addFeeAgreementAction.bind(null, caseId);
  return (
    <ClientActionForm action={action} successTitle="비용 약정이 등록되었습니다." className="grid gap-3 md:grid-cols-2">
      <select name="agreementType" defaultValue="retainer" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="retainer">착수금</option>
        <option value="flat_fee">정액 보수</option>
        <option value="success_fee">성공보수</option>
        <option value="expense_reimbursement">실비 정산</option>
        <option value="installment_plan">분납 약정</option>
        <option value="internal_settlement">내부 정산</option>
      </select>
      <select name="billToPartyKind" defaultValue="case_client" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="case_client">의뢰인</option>
        <option value="case_organization">참여 조직</option>
      </select>
      <Input name="billToCaseClientId" placeholder="청구 대상 의뢰인 ID" />
      <Input name="billToCaseOrganizationId" placeholder="청구 대상 조직 참여 ID" />
      <Input name="title" placeholder="약정명" required className="md:col-span-2" />
      <Input name="fixedAmount" type="number" min="0" step="0.01" placeholder="고정 금액" />
      <Input name="rate" type="number" min="0" max="100" step="0.01" placeholder="비율(%)" />
      <Input name="effectiveFrom" type="date" />
      <Input name="effectiveTo" type="date" />
      <Textarea name="description" placeholder="약정 설명" className="md:col-span-2" />
      <Textarea name="termsJson" placeholder='추가 조건(JSON), 예: {"installments":3}' className="md:col-span-2" />
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="등록 중...">약정 등록</SubmitButton>
      </div>
    </ClientActionForm>
  );
}
