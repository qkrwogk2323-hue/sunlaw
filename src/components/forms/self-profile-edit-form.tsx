import { MemberSelfProfileForm } from '@/components/forms/member-self-profile-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function SelfProfileEditForm(props: {
  organizationId: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  displayTitle?: string | null;
  residentNumberMasked?: string | null;
  hasSavedAddress?: boolean;
}) {
  return (
    <Card className="rounded-[1.75rem] border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle>내 프로필 수정</CardTitle>
        <p className="text-sm leading-6 text-slate-600">
          현재 조직에서 보이는 이름, 연락처, 직책과 본인 확인 정보를 수정합니다. 저장 전에 상단의 현재 조직을 한 번 더 확인해 주세요.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900">현재 로그인 계정</p>
          <p className="mt-1 break-all">{props.email ?? '이메일 정보 없음'}</p>
        </div>
        <MemberSelfProfileForm
          organizationId={props.organizationId}
          fullName={props.fullName}
          phone={props.phone}
          displayTitle={props.displayTitle}
          residentNumberMasked={props.residentNumberMasked}
          hasSavedAddress={props.hasSavedAddress}
        />
      </CardContent>
    </Card>
  );
}
