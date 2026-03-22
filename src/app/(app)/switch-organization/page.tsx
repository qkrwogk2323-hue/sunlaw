import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { getDefaultAppRoute, getEffectiveOrganizationId, isPathAllowedForOrganization, requireAuthenticatedUser } from '@/lib/auth';

function normalizeNextPath(next: string | null | undefined) {
  if (!next) return null;
  if (!next.startsWith('/')) return null;
  if (next.startsWith('//')) return null;
  return next;
}

export default async function SwitchOrganizationPage({
  searchParams
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const effectiveOrganizationId = getEffectiveOrganizationId(auth);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = normalizeNextPath(resolvedSearchParams?.next);

  if (nextPath && isPathAllowedForOrganization(auth, nextPath, effectiveOrganizationId)) {
    redirect(nextPath as Route);
  }

  redirect(getDefaultAppRoute(auth, effectiveOrganizationId) as Route);
}
