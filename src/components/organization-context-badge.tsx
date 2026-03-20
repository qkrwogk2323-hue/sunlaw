'use client';

import { Building2, ChevronDown } from 'lucide-react';

export function OrganizationContextBadge({
  organizationName,
  roleLabel,
  onClick,
  isSwitching = false
}: {
  organizationName: string;
  roleLabel: string;
  onClick: () => void;
  isSwitching?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSwitching}
      aria-label={`현재 조직: ${organizationName}. 탭하여 조직 전환`}
      className="group flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
        <Building2 className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-semibold leading-tight text-slate-950">
          {organizationName || '조직 없음'}
        </span>
        <span className="block text-[11px] text-slate-500 leading-tight">{roleLabel}</span>
      </span>
      <ChevronDown
        className={`size-4 shrink-0 text-slate-400 transition-transform duration-200 group-aria-expanded:rotate-180 ${isSwitching ? 'animate-spin' : ''}`}
        aria-hidden
      />
    </button>
  );
}
