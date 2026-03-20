import { createOrganizationAction } from '@/lib/actions/organization-actions';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

export function OrganizationCreateForm() {
  return (
    <ClientActionForm action={createOrganizationAction} successTitle="조직이 생성되었습니다." className="grid gap-3 md:grid-cols-2">
      <Input name="name" placeholder="조직명" required />
      <select name="kind" defaultValue="law_firm" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
        <option value="law_firm">법률사무소/법무법인</option>
        <option value="collection_company">신용정보회사</option>
        <option value="mixed_practice">혼합형 조직</option>
        <option value="corporate_legal_team">기업 법무팀</option>
        <option value="other">기타</option>
      </select>
      <Input name="businessNumber" placeholder="사업자등록번호" />
      <Input name="representativeName" placeholder="대표자명" />
      <Input name="representativeTitle" placeholder="대표자 직함" />
      <Input name="email" placeholder="대표 이메일" type="email" />
      <Input name="phone" placeholder="대표 전화번호" />
      <Input name="websiteUrl" placeholder="웹사이트 URL" />
      <Input name="addressLine1" placeholder="주소" className="md:col-span-2" />
      <Input name="addressLine2" placeholder="상세주소" className="md:col-span-2" />
      <Input name="postalCode" placeholder="우편번호" />
      <div className="space-y-2 rounded-xl border border-slate-200 p-4 md:col-span-2">
        <p className="text-sm font-medium text-slate-900">초기 조직관리자 초대 (선택)</p>
        <div className="grid gap-2 md:grid-cols-2">
          <Input name="managerInviteName" placeholder="초대받는 관리자 이름" />
          <Input name="managerInviteEmail" placeholder="초대받는 관리자 이메일" type="email" />
        </div>
      </div>
      <div className="space-y-2 rounded-xl border border-slate-200 p-4 md:col-span-2">
        <p className="text-sm font-medium text-slate-900">기본 활성 모듈</p>
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
