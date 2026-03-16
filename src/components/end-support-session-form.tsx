import { endSupportSessionAction } from '@/lib/actions/support-actions';
import { SubmitButton } from '@/components/ui/submit-button';

export function EndSupportSessionForm() {
  return (
    <form action={endSupportSessionAction}>
      <SubmitButton variant="destructive" pendingLabel="종료 중...">
        지원 접속 종료
      </SubmitButton>
    </form>
  );
}
