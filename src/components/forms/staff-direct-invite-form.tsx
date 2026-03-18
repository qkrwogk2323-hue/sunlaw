import { createStaffInvitationAction } from '@/lib/actions/organization-actions';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

export function StaffDirectInviteForm({ organizationId, returnPath }: { organizationId: string; returnPath?: string }) {
  return (
    <form action={createStaffInvitationAction} className="space-y-3">
      <input type="hidden" name="organizationId" value={organizationId} />
      {returnPath ? <input type="hidden" name="returnPath" value={returnPath} /> : null}
      <Input name="email" type="email" placeholder="직원 이메일" required />
      <label className="block text-sm text-slate-600">
        구분
        <select name="actorCategory" defaultValue="staff" className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
          <option value="admin">조직관리자</option>
          <option value="staff">조직원</option>
        </select>
      </label>
      <Input name="membershipTitle" placeholder="직책(선택)" />
      <SubmitButton pendingLabel="생성 중...">직접 초대 링크 생성</SubmitButton>
    </form>
  );
}
