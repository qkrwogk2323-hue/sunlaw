function LoadingCard({ className }: { className?: string }) {
  return <div className={['animate-pulse rounded-2xl bg-slate-200', className ?? ''].join(' ').trim()} />;
}

export default function NotificationsLoading() {
  return (
    <div className="space-y-5" aria-live="polite" aria-busy="true">
      <LoadingCard className="h-14 rounded-[1.4rem]" />
      <LoadingCard className="h-40 rounded-[1.8rem]" />
      <div className="grid gap-3 md:grid-cols-3">
        <LoadingCard className="h-28" />
        <LoadingCard className="h-28" />
        <LoadingCard className="h-28" />
      </div>
      <LoadingCard className="h-16" />
      <LoadingCard className="h-[28rem]" />
      <LoadingCard className="h-72" />
    </div>
  );
}
