'use client';

import type { ReactNode } from 'react';

export function PendingIntegrationNotice({
  title,
  description,
  icon
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-200">
        {icon ?? <span className="text-xs font-bold">!</span>}
      </span>
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        <p className="leading-6 text-amber-900">{description}</p>
      </div>
    </div>
  );
}
