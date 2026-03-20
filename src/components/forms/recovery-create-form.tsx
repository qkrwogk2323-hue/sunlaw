import { addRecoveryActivityAction } from '@/lib/actions/case-actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';
import { ClientActionForm } from '@/components/ui/client-action-form';

export function RecoveryCreateForm({ caseId }: { caseId: string }) {
  const action = addRecoveryActivityAction.bind(null, caseId);

  return (
    <ClientActionForm action={action} successTitle="회수 활동이 등록되었습니다." className="grid gap-3 md:grid-cols-2">
      <select name="activityKind" defaultValue="call" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="call">전화</option>
        <option value="letter">내용증명/안내문</option>
        <option value="visit">방문</option>
        <option value="negotiation">협상</option>
        <option value="payment">수납</option>
        <option value="asset_check">재산조회</option>
        <option value="legal_action">법적조치</option>
        <option value="other">기타</option>
      </select>
      <select name="clientVisibility" defaultValue="internal_only" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="internal_only">내부 전용</option>
        <option value="client_visible">의뢰인 공개</option>
      </select>
      <Input name="occurredAt" type="datetime-local" required />
      <Input name="amount" type="number" step="0.01" min="0" placeholder="금액" />
      <Input name="outcomeStatus" placeholder="결과 상태" className="md:col-span-2" />
      <Textarea name="notes" placeholder="메모" className="md:col-span-2" />
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="등록 중...">회수 활동 등록</SubmitButton>
      </div>
    </ClientActionForm>
  );
}
