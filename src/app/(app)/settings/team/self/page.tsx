import Link from 'next/link';
import type { Route } from 'next';
import { ArrowLeft } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { SelfProfileEditForm } from '@/components/forms/self-profile-edit-form';

/**
 * @rule-meta-start
 * surfaceScope: organization
 * requiresAuth: true
 * requiresTraceability: false
 * traceEntity: member_self_profile
 * @rule-meta-end
 */
export const dynamic = 'force-dynamic';

export default async function TeamSelfProfilePage() {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  if (!organizationId) notFound();

  const currentMembership = auth.memberships.find((item) => item.organization_id === organizationId) ?? null;
  const supabase = await createSupabaseServerClient();
  const { data: privateProfile } = await supabase
    .from('member_private_profiles')
    .select('resident_number_masked, address_line1_ciphertext')
    .eq('profile_id', auth.user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">내 프로필 수정</h1>
          <p className="mt-2 text-sm text-slate-600">현재 조직에 적용되는 본인 정보를 수정합니다.</p>
        </div>
        <Link href={'/settings/team' as Route} className={buttonStyles({ variant: 'secondary', className: 'min-h-11 rounded-xl px-4' })}>
          <ArrowLeft className="size-4" /> 구성원 관리로 돌아가기
        </Link>
      </div>

      <SelfProfileEditForm
        organizationId={organizationId}
        fullName={auth.profile.full_name}
        email={auth.profile.email}
        phone={(auth.profile as any).phone_e164 ?? null}
        displayTitle={currentMembership?.title ?? null}
        residentNumberMasked={privateProfile?.resident_number_masked ?? null}
        hasSavedAddress={Boolean(privateProfile?.address_line1_ciphertext)}
      />
    </div>
  );
}
