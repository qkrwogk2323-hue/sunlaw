import { updateSelfMemberProfileAction } from '@/lib/actions/organization-actions';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

export function MemberSelfProfileForm({
  organizationId,
  fullName,
  phone,
  displayTitle
}: {
  organizationId: string;
  fullName?: string | null;
  phone?: string | null;
  displayTitle?: string | null;
}) {
  return (
    <form action={updateSelfMemberProfileAction} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">이름</label>
        <Input name="fullName" defaultValue={fullName ?? ''} required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">연락처</label>
        <Input name="phone" defaultValue={phone ?? ''} placeholder="01012345678" />
      </div>
      <div className="md:col-span-2">
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">표시용 직책명</label>
        <Input name="displayTitle" defaultValue={displayTitle ?? ''} placeholder="예: 송무 담당, 운영 담당" />
      </div>
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="저장 중...">본인 정보 저장</SubmitButton>
      </div>
    </form>
  );
}
