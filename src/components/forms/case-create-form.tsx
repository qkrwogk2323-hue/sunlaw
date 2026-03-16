import { createCaseAction } from '@/lib/actions/case-actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';

export function CaseCreateForm({
  organizations,
  defaultOrganizationId
}: {
  organizations: Array<{ id: string; name: string }>;
  defaultOrganizationId?: string | null;
}) {
  if (!organizations.length) {
    return <p className="text-sm text-slate-500">사건을 생성하려면 먼저 조직에 속해야 합니다.</p>;
  }

  return (
    <form action={createCaseAction} className="grid gap-3 md:grid-cols-2">
      <select
        name="organizationId"
        defaultValue={defaultOrganizationId ?? organizations[0]?.id}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
      >
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name}
          </option>
        ))}
      </select>
      <select name="caseType" defaultValue="civil" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="civil">민사</option>
        <option value="debt_collection">채권회수</option>
        <option value="execution">집행</option>
        <option value="injunction">가압류/가처분</option>
        <option value="criminal">형사</option>
        <option value="advisory">자문</option>
        <option value="other">기타</option>
      </select>
      <Input name="title" placeholder="사건 제목" required className="md:col-span-2" />
      <Input name="principalAmount" type="number" step="0.01" min="0" placeholder="원금" />
      <Input name="openedOn" type="date" />
      <Input name="courtName" placeholder="법원명" />
      <Input name="caseNumber" placeholder="사건번호" />
      <Textarea name="summary" placeholder="사건 개요" className="md:col-span-2" />
      <Textarea name="billingPlanSummary" placeholder="초기 비용 계획/약정 메모 예: 착수금 300만원, 4월 말까지 확인" className="md:col-span-2" />
      <Input name="billingFollowUpDueOn" type="date" placeholder="비용 확인 예정일" />
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="사건 생성 중...">사건 생성</SubmitButton>
      </div>
    </form>
  );
}
