import { createStaffPreRegisteredInvitationAction } from '@/lib/actions/organization-actions';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

export function StaffPreRegisterForm({ organizationId }: { organizationId: string }) {
  return (
    <form action={createStaffPreRegisteredInvitationAction} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      <Input name="name" placeholder="이름" required />
      <Input name="email" type="email" placeholder="이메일" required />
      <Input name="phone" placeholder="연락처(선택)" />
      <Input name="membershipTitle" placeholder="표시용 직책명(선택)" />
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">구조 역할</label>
        <select name="actorCategory" defaultValue="staff" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
          <option value="admin">조직관리자</option>
          <option value="staff">조직원</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">권한 템플릿</label>
        <select name="roleTemplateKey" defaultValue="org_staff" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
          <option value="org_staff">구성원(기본)</option>
          <option value="admin_general">관리자</option>
          <option value="lawyer">변호사</option>
          <option value="office_manager">사무장</option>
          <option value="collection_agent">추심직원</option>
          <option value="intern_readonly">열람전용</option>
        </select>
      </div>
      <Input name="note" placeholder="메모(선택)" className="md:col-span-2" />
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="선등록 중...">선등록 후 초대 링크 발송</SubmitButton>
      </div>
    </form>
  );
}
