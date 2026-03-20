'use client';

import { useState } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { Network, LogIn, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HubMetricBadge } from '@/components/hub-metric-badge';
import { formatHubRelativeActivity } from '@/lib/case-hub-metrics';
import type { CaseHubSummary } from '@/lib/queries/case-hubs';
import { CaseHubCreateSheet } from '@/components/case-hub-create-sheet';

interface Props {
  caseId: string;
  caseTitle: string;
  organizationId: string;
  hasClients: boolean;
  hub: CaseHubSummary | null;
}

export function CaseHubConnectButton({ caseId, caseTitle, organizationId, hasClients, hub }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (hub) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <HubMetricBadge label="협업" value={`${hub.collaboratorCount}/${hub.collaboratorLimit}`} tone="blue" />
          <HubMetricBadge label="열람" value={`${hub.viewerCount}/${hub.viewerLimit}`} tone="violet" />
          <HubMetricBadge label="미읽음" value={`${hub.unreadCount}`} tone="amber" />
          <HubMetricBadge label="최근 활동" value={formatHubRelativeActivity(hub.lastActivityAt)} tone="slate" />
        </div>
        <Link
          href={`/case-hubs/${hub.id}` as Route}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
          aria-label={`${caseTitle} 허브 입장`}
        >
          <LogIn className="size-3.5" aria-hidden="true" />
          허브 입장
        </Link>
      </div>
    );
  }

  if (!hasClients) {
    return (
      <div
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700"
        title="의뢰인을 먼저 연결해야 허브를 생성할 수 있습니다."
      >
        <AlertCircle className="size-3.5" aria-hidden="true" />
        의뢰인 연결 필요
      </div>
    );
  }

  return (
    <>
      <Button
        variant="secondary"
        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-4 text-xs font-semibold text-sky-800 hover:bg-sky-100"
        onClick={() => setSheetOpen(true)}
        aria-label={`${caseTitle} 허브 연동`}
      >
        <Network className="size-3.5" aria-hidden="true" />
        허브 연동
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
