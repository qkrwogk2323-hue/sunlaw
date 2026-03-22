'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function CollapsibleSettingsSection({
  title,
  description,
  defaultOpen: _defaultOpen = false,
  children
}: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = panelRef.current;
    if (!node) return;

    const handleSuccess = () => setOpen(false);
    node.addEventListener('vs:action-form-success', handleSuccess);
    return () => node.removeEventListener('vs:action-form-success', handleSuccess);
  }, []);

  return (
    <div ref={panelRef} className="rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {description ? <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p> : null}
        </div>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-base font-semibold text-slate-700">
          {open ? '-' : '+'}
        </span>
      </button>
      {open ? <div className="border-t border-slate-200 p-5">{children}</div> : null}
    </div>
  );
}
