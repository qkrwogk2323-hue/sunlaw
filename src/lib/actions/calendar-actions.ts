'use server';

import { requireAuthenticatedUser, getEffectiveOrganizationId } from '@/lib/auth';
import { getCalendarBoardSnapshot } from '@/lib/queries/calendar';

export async function fetchCalendarMonthAction(month: string) {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const snapshot = await getCalendarBoardSnapshot(organizationId, month);
  return { ok: true as const, snapshot };
}
