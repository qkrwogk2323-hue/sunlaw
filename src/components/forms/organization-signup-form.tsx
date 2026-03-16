import { submitOrganizationSignupRequestAction } from '@/lib/actions/organization-actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';

const moduleOptions = [
  { key: 'client_portal', label: '의뢰인 포털' },
  { key: 'collections', label: '추심 운영' },
  { key: 'reports', label: '성과 리포트' }
] as const;

export function OrganizationSignupForm() {
  return (
    <form action={submitOrganizationSignupRequestAction} className="grid gap-3 md:grid-cols-2">
      <Input name="name" placeholder="조직명" required />
      <select name="kind" defaultValue="law_firm" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="law_firm">법률사무소/법무법인</option>
        <option value="collection_company">추심회사</option>
        <option value="mixed_practice">혼합형 조직</option>
        <option value="corporate_legal_team">기업 법무팀</option>
        <option value="other">기타</option>
      </select>
      <Input name="businessNumber" placeholder="사업자등록번호 (예: 123-45-67890)" required />
      <Input name="representativeName" placeholder="대표자명" />
      <Input name="representativeTitle" placeholder="대표자 직함" />
      <Input name="email" placeholder="대표 이메일" type="email" />
      <Input name="phone" placeholder="대표 전화번호" />
      <Input name="websiteUrl" placeholder="웹사이트 URL" />
      <Input name="addressLine1" placeholder="주소" className="md:col-span-2" />
      <Input name="addressLine2" placeholder="상세주소" className="md:col-span-2" />
      <Input name="postalCode" placeholder="우편번호" />
      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
        <p className="text-sm font-medium text-slate-900">사업자등록증 업로드</p>
        <input
          name="businessRegistrationDocument"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          required
          className="block w-full rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-600"
        />
        <p className="text-xs leading-6 text-slate-500">
          PDF, PNG, JPG 파일만 업로드할 수 있습니다. 업로드된 문서는 사업자등록번호 대조와 관리자 검토에 사용됩니다.
        </p>
      </div>
      <div className="space-y-2 rounded-xl border border-slate-200 p-4 md:col-span-2">
        <p className="text-sm font-medium text-slate-900">요청 모듈</p>
        <div className="grid gap-2 md:grid-cols-3">
          {moduleOptions.map((option) => (
            <label key={option.key} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="requestedModules" value={option.key} defaultChecked={option.key === 'client_portal'} className="size-4 rounded border-slate-300" />
              {option.label}
            </label>
          ))}
        </div>
      </div>
      <Textarea name="note" placeholder="검토 메모 또는 온보딩 요청사항" className="md:col-span-2" />
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="신청 중...">조직 개설 신청</SubmitButton>
      </div>
    </form>
  );
}
