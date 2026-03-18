import { createStaffInvitationAction } from '@/lib/actions/organization-actions';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

export function StaffInvitationCreateForm({ organizationId }: { organizationId: string }) {
  return (
    <form action={createStaffInvitationAction} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      <Input name="email" type="email" placeholder="직원 이메일" required className="md:col-span-2" />
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">구조 역할</label>
        <select name="actorCategory" defaultValue="staff" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
          <option value="admin">조직관리자</option>
          <option value="staff">조직원</option>
        </select>
      </div>
      <Input name="membershipTitle" placeholder="직책 예: 사무장, 변호사, 팀장" />
      <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        구조 역할은 조직관리자/조직원 2단으로 운영합니다. 직책은 표시용으로만 관리합니다.
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">권한 템플릿</label>
        <select name="roleTemplateKey" defaultValue="org_staff" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
          <option value="org_staff">조직원</option>
          <option value="admin_general">조직관리자</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">사건 범위</label>
        <select name="caseScopePolicy" defaultValue="assigned_cases_only" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
          <option value="all_org_cases">조직 전체 사건</option>
          <option value="assigned_cases_only">배정 사건만</option>
          <option value="read_only_assigned">배정 사건 읽기전용</option>
        </select>
      </div>
      <Input name="expiresHours" type="number" min="1" max="336" defaultValue={72} placeholder="만료 시간" />
      <Input name="note" placeholder="초대 메모" className="md:col-span-2" />
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="생성 중...">직원 초대 링크 생성</SubmitButton>
      </div>
    </form>
  );
}
