import { createStaffPreRegisteredInvitationAction } from '@/lib/actions/organization-actions';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

export function StaffPreRegisterForm({ organizationId }: { organizationId: string }) {
  return (
    <form action={createStaffPreRegisteredInvitationAction} className="space-y-3">
      <input type="hidden" name="organizationId" value={organizationId} />
      <Input name="name" placeholder="이름" required />
      <Input name="email" type="email" placeholder="이메일" required />
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
      <input type="hidden" name="roleTemplateKey" value="org_staff" />
      <input type="hidden" name="caseScopePolicy" value="assigned_cases_only" />
      <SubmitButton pendingLabel="저장 중...">선등록 후 초대 링크 생성</SubmitButton>
    </form>
  );
}
