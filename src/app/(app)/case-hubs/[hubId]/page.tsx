import { notFound, redirect } from 'next/navigation';
import { requireAuthenticatedUser, getEffectiveOrganizationId } from '@/lib/auth';
import { getCaseHubDetail } from '@/lib/queries/case-hubs';
import { CaseHubLobbyClient } from '@/components/case-hub-lobby-client';

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

  return (
    <CaseHubLobbyClient
      hub={hub}
      organizationId={organizationId}
      currentProfileId={auth.profile.id}
    />
  );
}
