import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type UnifiedListSearchProps = {
  action: string;
  placeholder: string;
  defaultValue?: string;
  ariaLabel: string;
  hiddenFields?: Record<string, string | number | null | undefined>;
  sticky?: boolean;
  className?: string;
  children?: ReactNode;
  submitLabel?: string;
};

export function UnifiedListSearch({
  action,
  placeholder,
  defaultValue,
  ariaLabel,
  hiddenFields,
  sticky = false,
  className,
  children,
  submitLabel = '검색'
}: UnifiedListSearchProps) {
  return (
    <form
      method="get"
      action={action}
      className={[
        'flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm',
        sticky ? 'sticky top-4 z-10' : '',
        className ?? ''
      ].filter(Boolean).join(' ')}
    >
      {Object.entries(hiddenFields ?? {}).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value == null ? '' : `${value}`} />
      ))}
      <label className="sr-only" htmlFor="unified-list-search-input">{ariaLabel}</label>
      <input
        id="unified-list-search-input"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        enterKeyHint="search"
        className="h-10 min-w-[14rem] flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20"
      />
      {children}
      <Button type="submit" variant="secondary" size="sm" className="h-10 px-4">
        {submitLabel}
      </Button>
    </form>
  );
}
