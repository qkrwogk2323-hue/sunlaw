export default function PageLoading() {
  return (
    <div className="space-y-4" aria-live="polite" aria-busy="true">
      <div className="h-10 w-56 animate-pulse rounded-2xl bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
      <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
    </div>
  );
}
