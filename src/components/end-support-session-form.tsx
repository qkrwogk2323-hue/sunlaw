import { endSupportSessionAction } from '@/lib/actions/support-actions';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';

export function EndSupportSessionForm() {
  return (
    <ClientActionForm
      action={endSupportSessionAction}
      successTitle="지원 접속 종료 완료"
      errorCause="지원 접속 종료 처리 중 세션 정리에 실패했습니다."
      errorResolution="잠시 후 다시 시도하거나 문제가 계속되면 관리자에게 문의해 주세요."
    >
      <SubmitButton variant="destructive" pendingLabel="종료 중...">
        지원 접속 종료
      </SubmitButton>
    </ClientActionForm>
  );
}
