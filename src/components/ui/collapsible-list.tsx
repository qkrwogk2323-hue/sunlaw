import type { ReactNode } from 'react';

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
  if (totalCount <= defaultShowCount || !hiddenContent) {
    return <>{visibleContent}</>;
  }

  return (
    <div className="space-y-3">
      {visibleContent}
      <details className="group rounded-xl border border-slate-200 bg-slate-50/80 p-3">
        <summary className="cursor-pointer list-none text-sm font-medium text-slate-700">
          {label} 더 보기 ({totalCount - defaultShowCount}건)
        </summary>
        <div className="mt-3 space-y-3">{hiddenContent}</div>
      </details>
    </div>
  );
}
