import { notFound, redirect } from 'next/navigation';
import { requireAuthenticatedUser, getEffectiveOrganizationId } from '@/lib/auth';
import { hasVerifiedHubPin } from '@/lib/hub-access';
import { getCaseHubDetail } from '@/lib/queries/case-hubs';
import { CaseHubLobbyClient } from '@/components/case-hub-lobby-client';
import { HubPinGateForm } from '@/components/forms/hub-pin-gate-form';
import { verifyCaseHubPinAction } from '@/lib/actions/case-hub-actions';

interface Props {
  params: Promise<{ hubId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { hubId } = await params;
  return { title: `사건허브 로비` };
}

export default async function CaseHubLobbyPage({ params }: Props) {
  const { hubId } = await params;

  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);

  const hub = await getCaseHubDetail(hubId, organizationId);
  if (!hub) notFound();

  const hasPinAccess = hub.accessPinEnabled ? await hasVerifiedHubPin('case_hub', hubId) : true;

  if (!hasPinAccess) {
    return (
      <HubPinGateForm
        action={verifyCaseHubPinAction}
        hubId={hubId}
        organizationId={organizationId}
        title={hub.caseTitle ?? hub.title ?? '사건허브'}
        description="이 사건허브는 비밀번호가 설정되어 있습니다. 현재 참여 중인 조직 또는 대표 의뢰인만 4자리 비밀번호를 입력해 입장할 수 있습니다."
      />
    );
  }

  return (
    <CaseHubLobbyClient
      hub={hub}
      organizationId={organizationId}
      currentProfileId={auth.profile.id}
    />
  );
}
