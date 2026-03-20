import { addCollectionCompensationPlanAction } from '@/lib/actions/collection-actions';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function CompensationPlanForm({
  cases,
  membershipOptions
}: {
  cases: Array<{ id: string; title: string }>;
  membershipOptions: Array<{ id: string; label: string }>;
}) {
  return (
    <ClientActionForm action={addCollectionCompensationPlanAction} successTitle="보수 규칙이 등록되었습니다." className="grid gap-3">
      <select name="caseId" required className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="">사건 선택</option>
        {cases.map((item) => (
          <option key={item.id} value={item.id}>{item.title}</option>
        ))}
      </select>
      <select name="targetKind" defaultValue="membership" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="membership">개인(채권관리사)</option>
        <option value="organization">조직</option>
      </select>
      <select name="beneficiaryMembershipId" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="">수익 귀속 직원 선택</option>
        {membershipOptions.map((item) => (
          <option key={item.id} value={item.id}>{item.label}</option>
        ))}
      </select>
      <Input name="title" placeholder="보수 규칙명" required />
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="fixedAmount" type="number" step="0.01" placeholder="고정 보수(선택)" />
        <Input name="rate" type="number" step="0.01" placeholder="퍼센티지(선택)" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="baseMetric" placeholder="기준 항목 (예: recovered_amount)" />
        <select name="settlementCycle" defaultValue="monthly" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
          <option value="daily">일별</option>
          <option value="weekly">주별</option>
          <option value="monthly">월별</option>
          <option value="quarterly">분기별</option>
          <option value="yearly">연별</option>
        </select>
      </div>
      <Input name="effectiveFrom" type="date" />
      <Textarea name="description" placeholder="설명" rows={3} />
      <Textarea name="ruleJson" placeholder='추가 규칙 JSON (예: {"cap":1000000})' rows={3} />
      <SubmitButton pendingLabel="저장 중...">보수 규칙 등록</SubmitButton>
    </ClientActionForm>
  );
}
