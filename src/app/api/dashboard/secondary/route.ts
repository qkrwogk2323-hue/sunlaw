import { NextResponse } from 'next/server';
import { getDashboardSecondaryPanels } from '@/lib/queries/dashboard';
import {
  getEffectiveOrganizationId,
  hasActivePlatformAdminView,
  requireAuthenticatedUser
} from '@/lib/auth';

function canUseOrganization(auth: Awaited<ReturnType<typeof requireAuthenticatedUser>>, organizationId: string) {
  return auth.memberships.some((membership) => membership.organization_id === organizationId);
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuthenticatedUser();
    const requestUrl = new URL(request.url);
    const requestedOrganizationId = requestUrl.searchParams.get('organizationId');
    const defaultOrganizationId = getEffectiveOrganizationId(auth);

    let organizationId = defaultOrganizationId;
    if (requestedOrganizationId) {
      const isAllowed = canUseOrganization(auth, requestedOrganizationId)
        || await hasActivePlatformAdminView(auth, requestedOrganizationId);
      if (isAllowed) {
        organizationId = requestedOrganizationId;
      }
    }

    const secondary = await getDashboardSecondaryPanels(organizationId);
    return NextResponse.json(secondary);
  } catch {
    return NextResponse.json({ message: '대시보드 보조 데이터를 불러오지 못했습니다.' }, { status: 401 });
  }
}
