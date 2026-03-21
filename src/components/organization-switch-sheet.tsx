'use client';

import { useEffect, useRef } from 'react';
import { Building2, X } from 'lucide-react';
import { switchDefaultOrganizationAction } from '@/lib/actions/organization-actions';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';

type OrganizationSwitchOption = {
  id: string;
  name: string;
};

export function OrganizationSwitchSheet({
  open,
  onClose,
  currentOrganizationId,
  organizationOptions
}: {
  open: boolean;
  onClose: () => void;
  currentOrganizationId: string | null;
  organizationOptions: OrganizationSwitchOption[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-0 shadow-[0_24px_64px_rgba(15,23,42,0.22)] backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm"
      onClick={handleBackdropClick}
      aria-labelledby="organization-switch-title"
      aria-describedby="organization-switch-desc"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 id="organization-switch-title" className="text-base font-semibold text-slate-950">조직 전환</h2>
          <p id="organization-switch-desc" className="mt-1 text-sm text-slate-600">현재 작업할 조직을 선택하면 메뉴와 권한 문맥이 즉시 바뀝니다.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700"
          aria-label="조직 전환 시트 닫기"
        >
          <X className="size-4" />
        </button>
      </div>

      <ClientActionForm
        action={switchDefaultOrganizationAction}
        successTitle="조직이 전환되었습니다."
        onSuccess={onClose}
        className="space-y-4 px-5 py-5"
      >
        <input type="hidden" name="contextOrganizationId" value={currentOrganizationId ?? ''} />
        <label htmlFor="mobile-organization-id" className="block text-sm font-medium text-slate-700">
          전환할 조직
        </label>
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <select
            id="mobile-organization-id"
            name="organizationId"
            defaultValue={currentOrganizationId ?? organizationOptions[0]?.id}
            aria-label="전환할 조직 선택"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-900 shadow-inner"
          >
            {organizationOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          전환 후 대시보드, 사건허브, 알림 문맥이 선택한 조직 기준으로 다시 계산됩니다.
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            닫기
          </button>
          <SubmitButton variant="secondary" pendingLabel="전환 중..." className="min-w-28 justify-center">
            조직 전환
          </SubmitButton>
        </div>
      </ClientActionForm>
    </dialog>
  );
}
