export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-live="polite" aria-busy="true">
      {/* 헤더 + AI 요약 */}
      <div className="h-12 w-64 animate-pulse rounded-2xl bg-slate-200" />
      <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />

      {/* KPI 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>

      {/* 큐 섹션 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-56 animate-pulse rounded-2xl bg-slate-200" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-48 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-48 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}
