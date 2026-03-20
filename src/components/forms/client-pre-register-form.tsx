import { createClientPreRegisteredInvitationAction } from '@/lib/actions/organization-actions';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { ClientActionForm } from '@/components/ui/client-action-form';

type CaseOption = { id: string; title: string };

export function ClientPreRegisterForm({ organizationId, cases }: { organizationId: string; cases: CaseOption[] }) {
  return (
    <ClientActionForm action={createClientPreRegisteredInvitationAction} successTitle="의뢰인 임시 계정이 발급되었습니다." successMessage="생성된 아이디와 비밀번호를 의뢰인에게 전달해 주세요." className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      <Input name="name" placeholder="이름" required />
      <Input name="email" type="email" placeholder="연락 이메일(선택)" />
      <Input name="phone" placeholder="연락처(선택)" />
      <Input name="relationLabel" placeholder="관계(선택)" />
      <div className="md:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-500">연결 예정 사건(선택)</label>
        <select name="caseId" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
          <option value="">미연결 상태로 선등록</option>
          {cases.map((item) => (
            <option key={item.id} value={item.id}>{item.title}</option>
          ))}
        </select>
      </div>
      <Input name="note" placeholder="메모(선택)" className="md:col-span-2" />
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="발급 중...">의뢰인 임시 아이디/비밀번호 발급</SubmitButton>
      </div>
    </ClientActionForm>
  );
}
