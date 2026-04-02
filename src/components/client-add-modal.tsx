'use client';

import { useEffect, useRef, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';
import { ClientsActionPanels } from '@/components/clients-action-panels';

type RosterItem = {
  id: string;
  name: string;
  email?: string | null;
  source?: string | null;
  invitationId?: string | null;
};

type CaseOption = {
  id: string;
  title: string;
  referenceNo?: string | null;
};

export function ClientAddModal({
  organizationId,
  cases,
}: {
  organizationId: string;
  cases: CaseOption[];
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => setOpen(false);
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, []);

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonStyles({ variant: 'primary', size: 'sm', className: 'inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs' })}
        aria-label="의뢰인 추가"
      >
        <UserPlus className="size-3.5" aria-hidden="true" />
        의뢰인 추가
      </button>

      <dialog
        ref={dialogRef}
        className="vs-modal m-auto w-[min(92vw,72rem)] rounded-3xl border border-slate-200 bg-white p-0 shadow-[0_24px_64px_rgba(15,23,42,0.22)]"
        onClick={handleBackdropClick}
        aria-labelledby="client-add-modal-title"
        aria-describedby="client-add-modal-desc"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 id="client-add-modal-title" className="text-lg font-semibold text-slate-950">
              의뢰인 추가
            </h2>
            <p id="client-add-modal-desc" className="mt-1 text-sm text-slate-600">
              단건 등록, CSV 일괄 등록, 임시 계정 발급을 한 곳에서 처리합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700"
            aria-label="의뢰인 추가 팝업 닫기"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto px-6 py-5">
          <ClientsActionPanels organizationId={organizationId} cases={cases} />
        </div>
      </dialog>
    </>
  );
}
