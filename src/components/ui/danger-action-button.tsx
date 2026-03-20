'use client';

/**
 * DangerActionButton — UX 체크리스트 1·2·3·4·5·6·7·8·10번 통합 구현
 *
 * Server Action을 client-side에서 래핑하여:
 * 1. 사전 안내 텍스트 표시 (Pre-action Clarity)
 * 2. ConfirmationModal로 확인 절차
 * 3. 로딩 상태 표시 (버튼 비활성화 + 스피너)
 * 4. 성공/실패 Toast + 선택적 Undo 지원
 *
 * 사용 예:
 * <DangerActionButton
 *   action={moveCaseToDeletedAction}
 *   fields={{ caseId: item.id, organizationId: item.organization_id }}
 *   confirmTitle="사건을 삭제함으로 이동할까요?"
 *   confirmDescription="삭제함으로 이동된 사건은 30일 후 자동 영구 삭제됩니다."
 *   highlightedInfo={item.title}
 *   successTitle="삭제함으로 이동했습니다."
 *   undoNote="실수로 이동했다면 삭제함에서 복원할 수 있습니다."
 * >
 *   삭제함 이동
 * </DangerActionButton>
 */

import { useState, useTransition } from 'react';
import type { ReactNode } from 'react';
import { ConfirmationModal, type ConfirmationModalVariant } from '@/components/ui/confirmation-modal';
import { useToast } from '@/components/ui/toast-provider';
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/button';

export interface DangerActionButtonProps {
  /** Server Action (FormData를 받는 함수) */
  action: (formData: FormData) => Promise<void>;
  /** FormData에 담을 key-value 쌍 */
  fields: Record<string, string>;

  // ── Confirmation Modal 설정 ──────────────────────────────────────
  confirmTitle: string;
  confirmDescription?: string;
  /** 핵심 정보 재노출 (삭제 대상 이름 등) */
  highlightedInfo?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationModalVariant;
  /** 확인 모달 하단 Undo 안내 문구 */
  undoNote?: string;

  // ── Toast 설정 ───────────────────────────────────────────────────
  successTitle?: string;
  successMessage?: string;
  errorTitle?: string;
  /** 에러 원인 설명 */
  errorCause?: string;
  /** 에러 해결 방법 */
  errorResolution?: string;

  // ── 버튼 스타일 ──────────────────────────────────────────────────
  buttonVariant?: ButtonVariant;
  buttonSize?: ButtonSize;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}

export function DangerActionButton({
  action,
  fields,
  confirmTitle,
  confirmDescription,
  highlightedInfo,
  confirmLabel = '확인',
  cancelLabel = '취소',
  variant = 'danger',
  undoNote,
  successTitle = '작업이 완료되었습니다.',
  successMessage,
  errorTitle = '작업에 실패했습니다.',
  errorCause,
  errorResolution = '잠시 후 다시 시도하거나 문제가 지속되면 관리자에게 문의해 주세요.',
  buttonVariant = 'destructive',
  buttonSize = 'sm',
  className,
  disabled,
  children,
}: DangerActionButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { success, error: showError } = useToast();

  function handleClick() {
    setModalOpen(true);
  }

  function handleClose() {
    if (!isPending) setModalOpen(false);
  }

  function handleConfirm() {
    startTransition(async () => {
      const fd = new FormData();
      for (const [k, v] of Object.entries(fields)) {
        fd.append(k, v);
      }

      try {
        await action(fd);
        setModalOpen(false);
        success(successTitle, { message: successMessage });
      } catch (err) {
        const rawMessage = err instanceof Error ? err.message : '원인을 확인할 수 없었습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.';
        showError(errorTitle, {
          message: `${errorCause ? `원인: ${errorCause} · ` : ''}${rawMessage}`,
          duration: 9000,
        });
        // 에러 시 모달 유지 (사용자가 취소 선택 가능)
      }
    });
  }

  return (
    <>
      <Button
        variant={buttonVariant}
        size={buttonSize}
        onClick={handleClick}
        disabled={disabled || isPending}
        isLoading={isPending}
        className={className}
      >
        {isPending ? '처리 중...' : children}
      </Button>

      <ConfirmationModal
        isOpen={modalOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={confirmTitle}
        description={confirmDescription}
        highlightedInfo={highlightedInfo}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        variant={variant}
        isConfirming={isPending}
        undoNote={undoNote}
      />
    </>
  );
}
