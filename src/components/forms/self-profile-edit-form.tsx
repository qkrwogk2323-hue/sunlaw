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
          현재 조직에서 보이는 이름, 연락처, 직책과 본인 확인 정보를 수정합니다. 조직을 바꾼 직후에는 이전 조직 기준 화면이 남아 있을 수 있으니,
          저장 전에 상단의 현재 조직명을 한 번 더 확인해 주세요.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          조직이 변경된 직후에는 권한이나 표시 항목이 즉시 바뀌지 않을 수 있습니다. 저장이 되지 않거나 접근 권한 안내가 나오면 조직을 다시 선택한 뒤 새로고침해 주세요.
        </div>
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
