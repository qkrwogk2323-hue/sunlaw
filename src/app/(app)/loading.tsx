export default function AppLoading() {
  return (
    <div className="space-y-4" aria-live="polite" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
    </div>
  );
}
