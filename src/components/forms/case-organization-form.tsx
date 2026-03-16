import { addCaseOrganizationAction } from '@/lib/actions/case-actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';

export function CaseOrganizationForm({ caseId }: { caseId: string }) {
  const action = addCaseOrganizationAction.bind(null, caseId);
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <Input name="organizationId" placeholder="참여 조직 ID" required />
      <select name="role" defaultValue="partner_org" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="principal_client_org">주고객조직</option>
        <option value="collection_org">추심조직</option>
        <option value="legal_counsel_org">법률수행조직</option>
        <option value="co_counsel_org">공동수행조직</option>
        <option value="partner_org">기타 파트너조직</option>
      </select>
      <select name="accessScope" defaultValue="read_only" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="full">전체 접근</option>
        <option value="collection_only">추심 전용</option>
        <option value="legal_only">법률 전용</option>
        <option value="billing_only">청구 전용</option>
        <option value="read_only">읽기 전용</option>
      </select>
      <select name="billingScope" defaultValue="none" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="none">Billing 없음</option>
        <option value="direct_client_billing">의뢰인 직접 청구</option>
        <option value="upstream_settlement">상위 조직 정산</option>
        <option value="internal_settlement_only">내부 정산만</option>
      </select>
      <select name="communicationScope" defaultValue="cross_org_only" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="internal_only">내부 전용</option>
        <option value="cross_org_only">조직간 공유</option>
        <option value="client_visible">의뢰인 커뮤니케이션 포함</option>
      </select>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="isLead" className="size-4 rounded border-slate-300" /> 리드 조직</label>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="canSubmitLegalRequests" className="size-4 rounded border-slate-300" /> 법률 요청 생성 가능</label>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="canReceiveLegalRequests" className="size-4 rounded border-slate-300" /> 법률 요청 수신 가능</label>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="canManageCollection" className="size-4 rounded border-slate-300" /> 추심 운영 가능</label>
      <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2"><input type="checkbox" name="canViewClientMessages" className="size-4 rounded border-slate-300" /> 의뢰인 메시지 열람 가능</label>
      <Textarea name="agreementSummary" placeholder="조직간 위임/협업 메모" className="md:col-span-2" />
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="추가 중...">참여 조직 추가</SubmitButton>
      </div>
    </form>
  );
}
