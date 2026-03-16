import { linkClientAction } from '@/lib/actions/case-actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';

export function ClientLinkForm({ caseId }: { caseId: string }) {
  const action = linkClientAction.bind(null, caseId);

  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <Input name="email" type="email" placeholder="클라이언트 이메일" required />
      <Input name="clientName" placeholder="표시명(선택)" />
      <Input name="relationLabel" placeholder="관계 라벨 예: 의뢰인, 담당자" className="md:col-span-2" />
      <Textarea name="feeAgreementTitle" placeholder="비용 약정 제목 예: 착수금 약정" className="md:col-span-2" />
      <select name="feeAgreementType" defaultValue="retainer" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="retainer">착수금</option>
        <option value="flat_fee">정액 수임료</option>
        <option value="success_fee">성공보수</option>
        <option value="expense_reimbursement">비용 실비</option>
        <option value="installment_plan">분할 납부</option>
        <option value="internal_settlement">내부 정산</option>
      </select>
      <Input name="feeAgreementAmount" type="number" min="0" step="0.01" placeholder="약정 금액(선택)" />
      <Input name="billingEntryTitle" placeholder="첫 비용 항목 제목 예: 착수금 1차" />
      <Input name="billingEntryAmount" type="number" min="0" step="0.01" placeholder="첫 비용 금액(선택)" />
      <Input name="billingEntryDueOn" type="date" placeholder="입금 기한" className="md:col-span-2" />
      <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2">
        <input type="checkbox" name="portalEnabled" defaultChecked className="size-4 rounded border-slate-300" />
        로그인 가능한 사용자인 경우 포털 접근 허용
      </label>
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="연결 중...">클라이언트 연결</SubmitButton>
      </div>
    </form>
  );
}
