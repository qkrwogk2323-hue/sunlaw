'use client';

import { submitClientSignupAction } from '@/lib/actions/client-account-actions';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

export function ClientSignupForm() {
  return (
    <form action={submitClientSignupAction} className="space-y-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">이름</span>
          <Input name="legalName" placeholder="홍길동" required />
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">연락처</span>
          <Input name="phone" placeholder="01012345678" required />
        </label>
      </div>

      <label className="space-y-2 text-sm text-slate-700">
        <span className="font-medium text-slate-900">주민등록번호</span>
        <Input name="residentNumber" placeholder="생년월일 6자리와 뒤 7자리를 입력해 주세요" required />
        <p className="text-xs leading-6 text-slate-500">민감정보는 일반 프로필과 분리된 보호 저장소에 암호화 보관되며, 화면에는 마스킹 값만 사용합니다.</p>
      </label>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">기본 주소</span>
          <Input name="addressLine1" placeholder="도로명 또는 지번 주소" required />
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-medium text-slate-900">우편번호</span>
          <Input name="postalCode" placeholder="06236" required />
        </label>
      </div>

      <label className="space-y-2 text-sm text-slate-700">
        <span className="font-medium text-slate-900">상세 주소</span>
        <Input name="addressLine2" placeholder="동, 호수 등 상세주소" />
      </label>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900">
        가입 직후 바로 업무 화면이 열리지는 않습니다. 기본 상태는 승인 대기이며, 조직 연결 요청과 승인 결과에 따라 포털 접근이 열립니다.
      </div>

      <SubmitButton className="w-full justify-center rounded-[1.2rem]" pendingLabel="가입 접수 중...">
        본인정보 등록하고 승인 대기 시작
      </SubmitButton>
    </form>
  );
}