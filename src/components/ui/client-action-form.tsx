'use client';

/**
 * ClientActionForm — UX 체크리스트 5·6·9·10번 구현
 *
 * Server Action을 가진 기존 <form>을 그대로 유지하면서
 * 로딩 중 버튼 비활성화 + 성공/실패 Toast를 일관되게 추가한다.
 *
 * 기존 코드 변경 최소화:
 * - <form action={someAction}> → <ClientActionForm action={someAction}>
 * - 내부 SubmitButton, input 등은 그대로 유지
 *
 * 사용 예:
 * <ClientActionForm
 *   action={updateOrganizationIntroAction}
 *   successTitle="회사소개가 저장되었습니다."
 *   className="space-y-3"
 * >
 *   <textarea name="intro" ... />
 *   <SubmitButton>저장</SubmitButton>
 * </ClientActionForm>
 */

import { createContext, useContext, type FormEvent, type ReactNode } from 'react';
import { useState, useTransition } from 'react';
import { useToast } from '@/components/ui/toast-provider';
import { InlineErrorMessage } from '@/components/ui/inline-error';
import { createConditionFailedFeedback, formatGuardFeedbackMessage, normalizeGuardFeedback, type GuardFeedback } from '@/lib/guard-feedback';

/** SubmitButton이 ClientActionForm 내부에서도 isPending을 읽을 수 있도록 하는 컨텍스트 */
export const ActionFormPendingContext = createContext(false);
export const useActionFormPending = () => useContext(ActionFormPendingContext);

export interface ClientActionFormProps {
  /** Server Action (FormData를 받는 함수, 또는 .bind()로 pre-filled된 함수) */
  action: (formData: FormData) => Promise<void>;

  // ── Toast 메시지 ─────────────────────────────────────────────
  successTitle: string;
  successMessage?: string;
  errorTitle?: string;
  /** 에러 원인 (구체적으로) */
  errorCause?: string;
  /** 해결 방법 */
  errorResolution?: string;

  // ── HTML form 속성 ────────────────────────────────────────────
  className?: string;
  id?: string;
  children: ReactNode;

  /** 성공 후 추가 콜백 (예: 폼 리셋) */
  onSuccess?: () => void;
}

export function ClientActionForm({
  action,
  successTitle,
  successMessage,
  errorTitle = '작업에 실패했습니다.',
  errorCause,
  errorResolution = '잠시 후 다시 시도하거나 문제가 지속되면 관리자에게 문의해 주세요.',
  className,
  id,
  children,
  onSuccess,
}: ClientActionFormProps) {
  const [isPending, startTransition] = useTransition();
  const { success, error: showError } = useToast();
  const [inlineError, setInlineError] = useState<GuardFeedback | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const formEl = e.currentTarget;

    startTransition(async () => {
      try {
        setInlineError(null);
        await action(formData);
        success(successTitle, { message: successMessage });
        onSuccess?.();
      } catch (err) {
        const normalized = normalizeGuardFeedback(
          err,
          createConditionFailedFeedback({
            blocked: errorTitle,
            cause: errorCause ?? '요청 처리 중 조건 검증에 실패했습니다.',
            resolution: errorResolution
          })
        );
        setInlineError(normalized);
        showError(normalized.blocked, { message: formatGuardFeedbackMessage(normalized), duration: 9000 });
        // 폼 상태 유지 (사용자가 재시도 가능)
        void formEl;
      }
    });
  }

  return (
    <ActionFormPendingContext.Provider value={isPending}>
      <form
        id={id}
        className={className}
        onSubmit={handleSubmit}
        aria-busy={isPending}
      >
        {inlineError ? (
          <InlineErrorMessage
            title={inlineError.blocked}
            cause={inlineError.cause}
            resolution={inlineError.resolution}
          />
        ) : null}
        {children}
      </form>
    </ActionFormPendingContext.Provider>
  );
}
