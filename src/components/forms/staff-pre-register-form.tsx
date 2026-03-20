import { createStaffPreRegisteredInvitationAction } from '@/lib/actions/organization-actions';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

export function StaffPreRegisterForm({ organizationId }: { organizationId: string }) {
  return (
    <ClientActionForm action={createStaffPreRegisteredInvitationAction} successTitle="임시 계정이 발급되었습니다." className="space-y-3">
      <input type="hidden" name="organizationId" value={organizationId} />
      <Input name="name" placeholder="이름" required />
      <Input name="email" type="email" placeholder="연락 이메일(선택)" />
      <Input name="phone" placeholder="연락처(선택)" />
      <label className="block text-sm text-slate-600">
        구분
        <select name="actorCategory" defaultValue="staff" className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
          <option value="admin">조직관리자</option>
          <option value="staff">조직원</option>
        </select>
      </label>
      <Input name="membershipTitle" placeholder="표시용 직책명(선택)" />
      <textarea
        name="note"
        rows={2}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
        placeholder="메모(선택)"
      />
      <SubmitButton pendingLabel="발급 중...">임시 아이디/비밀번호 발급</SubmitButton>
    </ClientActionForm>
  );
}
