import { createStaffInvitationAction } from '@/lib/actions/organization-actions';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

export function StaffDirectInviteForm({ organizationId }: { organizationId: string }) {
  return (
    <form action={createStaffInvitationAction} className="space-y-3">
      <input type="hidden" name="organizationId" value={organizationId} />
      <Input name="email" type="email" placeholder="직원 이메일" required />
      <label className="block text-sm text-slate-600">
        구분
        <select name="actorCategory" defaultValue="staff" className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
          <option value="admin">조직관리자</option>
          <option value="staff">조직원</option>
        </select>
      </label>
      <Input name="membershipTitle" placeholder="직책(선택)" />
      <input type="hidden" name="roleTemplateKey" value="org_staff" />
      <input type="hidden" name="caseScopePolicy" value="assigned_cases_only" />
      <SubmitButton pendingLabel="생성 중...">직접 초대 링크 생성</SubmitButton>
    </form>
  );
}
