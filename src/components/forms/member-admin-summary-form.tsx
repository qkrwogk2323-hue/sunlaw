import { updateMembershipAdminSummaryAction } from '@/lib/actions/organization-actions';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

export function MemberAdminSummaryForm({
  organizationId,
  membershipId,
  actorCategory,
  status,
  title
}: {
  organizationId: string;
  membershipId: string;
  actorCategory?: string | null;
  status?: string | null;
  title?: string | null;
}) {
  return (
    <form action={updateMembershipAdminSummaryAction} className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-4">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="membershipId" value={membershipId} />
      <label className="text-xs text-slate-500">구분
        <select name="actorCategory" defaultValue={actorCategory ?? 'staff'} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
          <option value="admin">조직관리자</option>
          <option value="staff">조직원</option>
        </select>
      </label>
      <label className="text-xs text-slate-500">활성 상태
        <select name="status" defaultValue={status ?? 'active'} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
          <option value="active">활성</option>
          <option value="suspended">비활성</option>
        </select>
      </label>
      <label className="text-xs text-slate-500 md:col-span-2">직책
        <Input name="title" defaultValue={title ?? ''} placeholder="직책명" className="mt-1" />
      </label>
      <div className="md:col-span-4">
        <SubmitButton variant="secondary" pendingLabel="저장 중...">관리자 상태 저장</SubmitButton>
      </div>
    </form>
  );
}
