import { addPartyAction } from '@/lib/actions/case-actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';
import { ClientActionForm } from '@/components/ui/client-action-form';

export function PartyCreateForm({ caseId }: { caseId: string }) {
  const action = addPartyAction.bind(null, caseId);

  return (
    <ClientActionForm action={action} successTitle="당사자가 등록되었습니다." className="grid gap-3 md:grid-cols-2">
      <select name="partyRole" defaultValue="debtor" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="creditor">채권자</option>
        <option value="debtor">채무자</option>
        <option value="plaintiff">원고</option>
        <option value="defendant">피고</option>
        <option value="respondent">피신청인</option>
        <option value="petitioner">신청인</option>
        <option value="other">기타</option>
      </select>
      <select name="entityType" defaultValue="individual" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="individual">개인</option>
        <option value="corporation">법인</option>
      </select>
      <Input name="displayName" placeholder="이름 또는 표시명" required />
      <Input name="companyName" placeholder="법인명" />
      <Input name="registrationNumber" placeholder="사업자/법인등록번호" />
      <Input name="residentNumber" placeholder="주민등록번호" />
      <Input name="phone" placeholder="전화번호" />
      <Input name="email" type="email" placeholder="이메일" />
      <Input name="addressSummary" placeholder="주소 요약" className="md:col-span-2" />
      <Input name="addressDetail" placeholder="상세주소(암호화 저장)" className="md:col-span-2" />
      <Textarea name="notes" placeholder="메모" className="md:col-span-2" />
      <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2">
        <input type="checkbox" name="isPrimary" className="size-4 rounded border-slate-300" />
        주 당사자로 표시
      </label>
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="등록 중...">당사자 등록</SubmitButton>
      </div>
    </ClientActionForm>
  );
}
