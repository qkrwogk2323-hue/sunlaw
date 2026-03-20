import { recordPaymentAction } from '@/lib/actions/case-actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';
import { ClientActionForm } from '@/components/ui/client-action-form';

export function PaymentRecordForm({ caseId }: { caseId: string }) {
  const action = recordPaymentAction.bind(null, caseId);
  return (
    <ClientActionForm action={action} successTitle="입금이 기록되었습니다." className="grid gap-3 md:grid-cols-2">
      <select name="payerPartyKind" defaultValue="case_client" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="case_client">의뢰인</option>
        <option value="case_organization">참여 조직</option>
      </select>
      <select name="paymentMethod" defaultValue="bank_transfer" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="bank_transfer">계좌이체</option>
        <option value="card">카드</option>
        <option value="cash">현금</option>
        <option value="offset">상계</option>
        <option value="other">기타</option>
      </select>
      <Input name="payerCaseClientId" placeholder="입금자 의뢰인 ID" />
      <Input name="payerCaseOrganizationId" placeholder="입금자 조직 참여 ID" />
      <Input name="amount" type="number" min="0" step="0.01" placeholder="입금액" required />
      <Input name="receivedAt" type="datetime-local" required />
      <Input name="referenceText" placeholder="입금자명/참조문구" className="md:col-span-2" />
      <Textarea name="note" placeholder="비고" className="md:col-span-2" />
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="기록 중...">입금 기록</SubmitButton>
      </div>
    </ClientActionForm>
  );
}
