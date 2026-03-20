'use client';

/**
 * ConfirmationModal — UX 체크리스트 4·8번 구현
 * 위험 행동 전 확인 절차 + 핵심 정보 재노출 + 취소 지원
 * 네이티브 <dialog> 기반으로 포커스 트랩·ESC 닫기 접근성 완벽 지원
 */

import { useEffect, useRef } from 'react';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';

export type ConfirmationModalVariant = 'danger' | 'warning' | 'info';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  /** 핵심 정보 재노출 (예: 삭제 대상 이름) */
  highlightedInfo?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationModalVariant;
  isConfirming?: boolean;
  /** 확인 버튼 클릭 후 Undo 가능 여부를 설명 */
  undoNote?: string;
  children?: React.ReactNode;
}

const VARIANT_CONFIG = {
  danger: {
    icon: <ShieldAlert className="size-6 text-red-500" aria-hidden />,
    iconBg: 'bg-red-50',
    confirmVariant: 'destructive' as const,
    headerBorder: 'border-red-100',
  },
  warning: {
    icon: <AlertTriangle className="size-6 text-amber-500" aria-hidden />,
    iconBg: 'bg-amber-50',
    confirmVariant: 'destructive' as const,
    headerBorder: 'border-amber-100',
  },
  info: {
    icon: <Info className="size-6 text-blue-500" aria-hidden />,
    iconBg: 'bg-blue-50',
    confirmVariant: 'primary' as const,
    headerBorder: 'border-blue-100',
  },
};

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  highlightedInfo,
  confirmLabel = '확인',
  cancelLabel = '취소',
  variant = 'danger',
  isConfirming = false,
  undoNote,
  children,
}: ConfirmationModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const config = VARIANT_CONFIG[variant];

  // 열기/닫기 동기화
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // ESC 키 닫기 핸들러
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  // 배경 클릭 닫기
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby={description ? 'confirm-modal-desc' : undefined}
      onClick={handleBackdropClick}
      className={cn(
        'vs-modal rounded-3xl border border-slate-200 bg-white p-0',
        'shadow-[0_24px_64px_rgba(15,23,42,0.22)] backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm',
        'w-full max-w-md'
      )}
    >
      {/* 헤더 */}
      <div className={cn('flex items-start gap-4 border-b p-6', config.headerBorder)}>
        <div className={cn('shrink-0 rounded-xl p-2.5', config.iconBg)}>
          {config.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="confirm-modal-title" className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          {description ? (
            <p id="confirm-modal-desc" className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {/* 본문 */}
      <div className="p-6 space-y-4">
        {/* 핵심 정보 재노출 */}
        {highlightedInfo ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
              대상
            </p>
            <p className="text-sm font-semibold text-slate-900">{highlightedInfo}</p>
          </div>
        ) : null}

        {/* 추가 컨텐츠 슬롯 */}
        {children}

        {/* Undo 안내 */}
        {undoNote ? (
          <p className="text-xs text-slate-500 leading-relaxed">
            ℹ️ {undoNote}
          </p>
        ) : null}
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onClose}
          disabled={isConfirming}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={config.confirmVariant}
          size="sm"
          onClick={onConfirm}
          isLoading={isConfirming}
          disabled={isConfirming}
          aria-describedby={description ? 'confirm-modal-desc' : undefined}
        >
          {isConfirming ? '처리 중...' : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
