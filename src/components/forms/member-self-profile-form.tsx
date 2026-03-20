import { updateSelfMemberProfileAction } from '@/lib/actions/organization-actions';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

export function MemberSelfProfileForm({
  organizationId,
  fullName,
  phone,
  displayTitle,
  residentNumberMasked,
  hasSavedAddress
}: {
  organizationId: string;
  fullName?: string | null;
  phone?: string | null;
  displayTitle?: string | null;
  residentNumberMasked?: string | null;
  hasSavedAddress?: boolean;
}) {
  return (
    <ClientActionForm action={updateSelfMemberProfileAction} successTitle="본인 정보가 저장되었습니다." className="grid gap-3 md:grid-cols-2">
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
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">주민등록번호</label>
        <Input name="residentNumber" placeholder="숫자 13자리 (기등록 시 재입력 불필요)" />
        {residentNumberMasked ? <p className="mt-1 text-xs text-slate-500">현재 저장: {residentNumberMasked}</p> : null}
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">주소</label>
        <Input name="addressLine1" placeholder="주소(기본)" />
        <Input name="addressLine2" placeholder="상세주소" className="mt-2" />
        {hasSavedAddress ? <p className="mt-1 text-xs text-slate-500">기존 주소가 저장되어 있습니다. 변경 시에만 재입력하세요.</p> : null}
      </div>
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="저장 중...">본인 정보 저장</SubmitButton>
      </div>
    </ClientActionForm>
  );
}
