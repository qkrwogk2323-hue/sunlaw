import { createClientRosterEntryAction } from '@/lib/actions/client-management-actions';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

type CaseOption = { id: string; title: string };

export function ClientRosterEntryForm({ organizationId, cases }: { organizationId: string; cases: CaseOption[] }) {
  return (
    <ClientActionForm
      action={createClientRosterEntryAction}
      successTitle="의뢰인이 등록되었습니다."
      successMessage="의뢰인 목록에서 바로 확인할 수 있습니다."
      className="grid gap-3 md:grid-cols-2"
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="relationLabel" value="기타" />
      <Input name="name" placeholder="이름" required />
      <Input name="email" type="email" placeholder="이메일(또는 연락처 입력)" />
      <Input name="phone" placeholder="연락처(또는 이메일 입력)" />
      <div className="md:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-500">연결 사건(선택)</label>
        <select name="caseId" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
          <option value="">미연결 상태로 등록</option>
          {cases.map((item) => (
            <option key={item.id} value={item.id}>{item.title}</option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="등록 중...">의뢰인 등록</SubmitButton>
      </div>
    </ClientActionForm>
  );
}
