import { createOrganizationAction } from '@/lib/actions/organization-actions';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

function Required() {
  return <span className="ml-1 text-rose-500" aria-hidden>*</span>;
}

export function OrganizationCreateForm() {
  return (
    <ClientActionForm
      action={createOrganizationAction}
      successTitle="조직이 생성되었습니다."
      errorTitle="조직 생성에 실패했습니다."
      className="grid gap-3 md:grid-cols-2"
    >
      <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <span className="text-rose-500 font-medium">*</span> 표시 항목은 필수입니다. 나머지는 선택 항목이며 나중에 조직 설정에서 수정할 수 있습니다.
      </div>
      <label className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">조직명<Required /></span>
        <Input name="name" placeholder="법무법인 홍길동" required />
      </label>
      <label className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">조직 유형</span>
        <select name="kind" defaultValue="law_firm" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
          <option value="law_firm">법률사무소/법무법인</option>
          <option value="collection_company">신용정보회사</option>
          <option value="mixed_practice">혼합형 조직</option>
          <option value="corporate_legal_team">기업 법무팀</option>
          <option value="other">기타</option>
        </select>
      </label>
      <label className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">사업자등록번호</span>
        <Input name="businessNumber" placeholder="123-45-67890" />
      </label>
      <label className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">대표자명</span>
        <Input name="representativeName" placeholder="홍길동" />
      </label>
      <label className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">대표자 직함</span>
        <Input name="representativeTitle" placeholder="대표 변호사" />
      </label>
      <label className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">대표 이메일</span>
        <Input name="email" placeholder="contact@example.com" type="email" />
      </label>
      <label className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">대표 전화번호</span>
        <Input name="phone" placeholder="02-1234-5678" />
      </label>
      <label className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">웹사이트 URL</span>
        <Input name="websiteUrl" placeholder="https://example.com" type="url" />
        <p className="text-xs text-slate-400">https:// 포함한 전체 주소를 입력하세요</p>
      </label>
      <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
        <span className="font-medium text-slate-900">주소</span>
        <Input name="addressLine1" placeholder="서울시 강남구 테헤란로 123" />
      </label>
      <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
        <span className="font-medium text-slate-900">상세주소</span>
        <Input name="addressLine2" placeholder="10층 1001호" />
      </label>
      <label className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">우편번호</span>
        <Input name="postalCode" placeholder="06234" />
      </label>
      <div className="space-y-2 rounded-xl border border-slate-200 p-4 md:col-span-2">
        <p className="text-sm font-medium text-slate-900">초기 조직관리자 초대 <span className="text-xs font-normal text-slate-500">(선택)</span></p>
        <div className="grid gap-2 md:grid-cols-2">
          <Input name="managerInviteName" placeholder="초대받는 관리자 이름" />
          <Input name="managerInviteEmail" placeholder="manager@example.com" type="email" />
        </div>
      </div>
      <div className="space-y-2 rounded-xl border border-slate-200 p-4 md:col-span-2">
        <p className="text-sm font-medium text-slate-900">기본 활성 모듈 <span className="text-xs font-normal text-slate-500">(선택)</span></p>
        <div className="grid gap-2 md:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="requestedModules" value="client_portal" defaultChecked className="size-4 rounded border-slate-300" /> 의뢰인 포털</label>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="requestedModules" value="collections" className="size-4 rounded border-slate-300" /> 추심 운영</label>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="requestedModules" value="reports" defaultChecked className="size-4 rounded border-slate-300" /> 성과 리포트</label>
        </div>
      </div>
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="조직 생성 중...">조직 생성</SubmitButton>
      </div>
    </ClientActionForm>
  );
}
