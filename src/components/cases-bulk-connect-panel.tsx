'use client';

import { useState, useTransition } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';

type Props = {
  organizationId: string;
  unlinkedClientCaseIds: string[];
  unlinkedHubCaseIds: string[];
};

export function CasesBulkConnectPanel({ unlinkedClientCaseIds, unlinkedHubCaseIds }: Props) {
  const { success } = useToast();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  if (unlinkedClientCaseIds.length === 0 && unlinkedHubCaseIds.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={expanded}
        aria-label="일괄 연동 패널 열기"
      >
        <p className="text-sm font-semibold text-amber-900">
          일괄연동가능한 사건이 있습니다 !
        </p>
        {expanded ? (
          <ChevronUp className="size-4 text-amber-700" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-4 text-amber-700" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div className="space-y-4 px-4 pb-4">
          {unlinkedClientCaseIds.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-700">의뢰인 미연동 사건 ({unlinkedClientCaseIds.length}건)</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      success('의뢰인 연동', { message: '사건 상세 화면에서 의뢰인을 연결하세요.' });
                    });
                  }}
                >
                  의뢰인 미연동 전체 목록 확인
                </Button>
              </div>
              <p className="text-xs text-slate-500">개별 사건 카드의 의뢰인 연동 버튼, 또는 사건 상세 화면에서 연동하세요.</p>
            </div>
          ) : null}

          {unlinkedHubCaseIds.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-700">허브 미연결 사건 ({unlinkedHubCaseIds.length}건)</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      success('사건허브 연동', { message: '각 사건 카드의 허브 연동 버튼을 눌러 연결하세요.' });
                    });
                  }}
                >
                  허브 미연결 전체 목록 확인
                </Button>
              </div>
              <p className="text-xs text-slate-500">각 사건 카드의 허브 연동 버튼으로 허브를 연결하세요.</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
