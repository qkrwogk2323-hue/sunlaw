'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { OrganizationContextBadge } from '@/components/organization-context-badge';
import { OrganizationSwitchSheet } from '@/components/organization-switch-sheet';
import { membershipRoleLabel } from '@/lib/membership-labels';
import type { Membership, OrganizationOption } from '@/lib/types';

export function MobileOrganizationSwitcher({
  memberships,
  currentOrganizationId,
  currentOrganizationName,
  baseRoleLabel,
  platformOrganizations
}: {
  memberships: Membership[];
  currentOrganizationId: string | null;
  currentOrganizationName: string;
  baseRoleLabel: string;
  platformOrganizations?: OrganizationOption[];
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = usePathname();

  const currentMembership = memberships.find((m) => m.organization_id === currentOrganizationId) ?? null;
  const roleLabel = currentMembership ? membershipRoleLabel(currentMembership.role) : baseRoleLabel;

  const displayName = currentOrganizationName || currentMembership?.organization?.name || '조직 없음';

  // Only render switcher when there are multiple orgs to switch to
  const canSwitch = memberships.length > 1 || (platformOrganizations && platformOrganizations.length > 1);

  if (!canSwitch) {
    return (
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold tracking-tight text-slate-950">{displayName}</p>
        <p className="mt-0.5 text-xs text-slate-600">{roleLabel}</p>
      </div>
    );
  }

  return (
    <>
      <OrganizationContextBadge
        organizationName={displayName}
        roleLabel={roleLabel}
        onClick={() => setSheetOpen(true)}
        isSwitching={false}
      />
      <OrganizationSwitchSheet
        memberships={memberships}
        currentOrganizationId={currentOrganizationId}
        platformOrganizations={platformOrganizations}
        currentPathname={pathname}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
