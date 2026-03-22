import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { completeMemberInitialProfileAction } from '@/lib/actions/profile-actions';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function MemberProfileSetupPage() {
  const auth = await requireAuthenticatedUser();
  if (!auth.profile.must_complete_profile) {
    redirect('/dashboard');
  }

  const supabase = await createSupabaseServerClient();
  const { data: privateProfile } = await supabase
    .from('member_private_profiles')
    .select('resident_number_masked')
    .eq('profile_id', auth.user.id)
    .maybeSingle();

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-xl items-center px-6 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>본인 정보 입력</CardTitle>
          <p className="text-sm text-slate-600">임시 계정은 아래 정보를 입력하기 전까지 메뉴를 볼 수 없습니다.</p>
        </CardHeader>
        <CardContent>
          <ClientActionForm action={completeMemberInitialProfileAction} successTitle="본인 정보가 저장되었습니다." className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-700">연락처</label>
              <Input name="phone" placeholder="01012345678" required />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">주민등록번호</label>
              <Input name="residentNumber" placeholder="숫자 13자리" required />
              {privateProfile?.resident_number_masked ? (
                <p className="mt-1 text-xs text-slate-500">현재 저장: {privateProfile.resident_number_masked}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">주소</label>
              <Input name="addressLine1" placeholder="기본 주소" required />
              <Input name="addressLine2" placeholder="상세 주소(선택)" className="mt-2" />
            </div>
            <p className="text-xs text-slate-500">입력 완료 후 조직 관리자에게 연결 확인 알림이 전송됩니다.</p>
            <SubmitButton pendingLabel="저장 중..." className="w-full justify-center">저장하고 시작</SubmitButton>
          </ClientActionForm>
        </CardContent>
      </Card>
    </main>
  );
}
