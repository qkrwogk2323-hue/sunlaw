'use client';

import { useState } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { Network, LogIn, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CaseHubCreateSheet } from '@/components/case-hub-create-sheet';
import type { HubStateResult } from '@/lib/hub-policy';

interface Props {
  caseId: string;
  caseTitle: string;
  organizationId: string;
  hubState: HubStateResult;
}

export function CaseHubConnectButton({ caseId, caseTitle, organizationId, hubState }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (hubState.action.type === 'link' && hubState.action.href) {
    return (
      <Link
        href={hubState.action.href as Route}
        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
        aria-label={`${caseTitle} ${hubState.action.label}`}
      >
        <LogIn className="size-3.5" aria-hidden="true" />
        {hubState.action.label}
      </Link>
    );
  }

  if (hubState.action.type === 'info') {
    return (
      <div
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700"
        title="의뢰인을 먼저 연결해야 허브를 생성할 수 있습니다."
      >
        <AlertCircle className="size-3.5" aria-hidden="true" />
        {hubState.action.label}
      </div>
    );
  }

  return (
    <>
      <Button
        variant="secondary"
        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-4 text-xs font-semibold text-sky-800 hover:bg-sky-100"
        onClick={() => setSheetOpen(true)}
        aria-label={`${caseTitle} ${hubState.action.label}`}
      >
        <Network className="size-3.5" aria-hidden="true" />
        {hubState.action.label}
      </Button>

      <CaseHubCreateSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        caseId={caseId}
        caseTitle={caseTitle}
        organizationId={organizationId}
      />
    </>
  );
}
