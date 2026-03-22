'use client';

import { useState, type ReactNode } from 'react';

type CollapsibleListProps = {
  label: string;
  totalCount: number;
  defaultShowCount?: number;
  visibleContent: ReactNode;
  hiddenContent?: ReactNode;
};

export function CollapsibleList({
  label,
  totalCount,
  defaultShowCount = 7,
  visibleContent,
  hiddenContent
}: CollapsibleListProps) {
  const [open, setOpen] = useState(false);

  if (totalCount <= defaultShowCount || !hiddenContent) {
    return <>{visibleContent}</>;
  }

  return (
    <div className="space-y-3">
      {visibleContent}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="w-full text-left text-sm font-medium text-slate-700"
          aria-expanded={open}
        >
          {open ? '접기' : `${label} 더 보기 (${totalCount - defaultShowCount}건)`}
        </button>
        {open ? <div className="mt-3 space-y-3">{hiddenContent}</div> : null}
      </div>
    </div>
  );
}
