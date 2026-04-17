import { notFound, redirect } from 'next/navigation';
import { requireAuthenticatedUser, getEffectiveOrganizationId } from '@/lib/auth';
import { getCaseHubDetail } from '@/lib/queries/case-hubs';
import { getCaseHubProjection } from '@/lib/queries/case-hub-projection';
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

  // PIN 게이트 제거 (2026-04-17). 접근 제어는 Auth 세션 + organization_memberships
  // + case_hub_organizations RLS 3층으로 충분. 4자리 PIN은 보안 기여 0 + UX 마찰만
  // 유발하므로 완전 제거. DB 컬럼(access_pin_enabled/access_pin_hash)은 유지(dormant).

  const projection = hub.caseId ? await getCaseHubProjection(hub.caseId) : null;

  return (
    <CaseHubLobbyClient
      hub={hub}
      organizationId={organizationId}
      currentProfileId={auth.profile.id}
      documents={projection?.documents ?? null}
      billing={projection?.billing ?? null}
    />
  );
}
