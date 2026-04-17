/**
 * 대시보드 비용 요약 위젯 — 조직 전체 미수금·upcoming billing 한 줄.
 *
 * DashboardHubOverview(사건별 허브 요약)와 DashboardHubClient(기존 카드 조합)
 * 사이에 배치. cross-case 비용 긴급성을 "현관"에서 한 번에 훑는 용도.
 *
 * /billing(리포트)로 drill-down 링크 제공. 쓰기는 사건 허브 비용 탭 전용.
 *
 * 서버 안전 컴포넌트 (hooks 없음). 데이터는 getDashboardInitialSnapshotForAuth에서
 * 이미 조회한 pendingBillingCount + overdueMap(case_id별 연체 수)을 prop으로 받음.
 */
import Link from 'next/link';
import { Receipt, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ROUTES } from '@/lib/routes/registry';

interface DashboardBillingSummaryProps {
  pendingBillingCount: number;
  overdueTotal: number;
}

export function DashboardBillingSummary({
  pendingBillingCount,
  overdueTotal,
}: DashboardBillingSummaryProps) {
  if (pendingBillingCount === 0 && overdueTotal === 0) return null;

  return (
    <Card className="rounded-[1.8rem] border-slate-200/80 bg-white/95">
      <CardContent className="px-5 py-3">
        <Link
          href={ROUTES.BILLING}
          className="flex items-center justify-between gap-4 transition hover:opacity-80"
          aria-label="비용 리포트 열기"
        >
          <div className="flex items-center gap-3">
            <Receipt className="size-4 text-slate-500" aria-hidden="true" />
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
              {pendingBillingCount > 0 ? (
                <span>미수금 <span className="font-semibold text-slate-900 tabular-nums">{pendingBillingCount}건</span></span>
              ) : null}
              {overdueTotal > 0 ? (
                <span className="inline-flex items-center gap-1 text-rose-600">
                  <AlertCircle className="size-3" aria-hidden="true" />
                  연체 <span className="font-semibold tabular-nums">{overdueTotal}건</span>
                </span>
              ) : null}
            </div>
          </div>
          <span className="shrink-0 text-xs font-semibold text-sky-700">비용 리포트 →</span>
        </Link>
      </CardContent>
    </Card>
  );
}
