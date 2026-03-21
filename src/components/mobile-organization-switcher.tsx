'use client';

import { useState } from 'react';
import { ChevronsUpDown, Menu } from 'lucide-react';
import { OrganizationSwitchSheet } from '@/components/organization-switch-sheet';

type OrganizationSwitchOption = {
  id: string;
  name: string;
};

export function MobileOrganizationSwitcher({
  currentOrganizationId,
  currentOrganizationName,
  roleLabel,
  organizationOptions,
  onOpenMenu
}: {
  currentOrganizationId: string | null;
  currentOrganizationName: string;
  roleLabel: string;
  organizationOptions: OrganizationSwitchOption[];
  onOpenMenu: () => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const canSwitch = organizationOptions.length > 1;

  return (
    <>
      <div className="rounded-[1.2rem] border border-slate-200 bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight text-slate-950">
              {currentOrganizationName || '협업 조직'}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">{roleLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              disabled={!canSwitch}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="조직 전환 열기"
            >
              <ChevronsUpDown className="size-4" />
              전환
            </button>
            <button
              type="button"
              onClick={onOpenMenu}
              className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
              aria-label="메뉴 열기"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </div>

      <OrganizationSwitchSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        currentOrganizationId={currentOrganizationId}
        organizationOptions={organizationOptions}
      />
    </>
  );
}
