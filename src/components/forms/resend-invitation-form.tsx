import { resendInvitationLinkAction } from '@/lib/actions/organization-actions';
import { SubmitButton } from '@/components/ui/submit-button';

export function ResendInvitationForm({ invitationId, compact = false }: { invitationId: string; compact?: boolean }) {
  return (
    <form action={resendInvitationLinkAction}>
      <input type="hidden" name="invitationId" value={invitationId} />
      <input type="hidden" name="expiresHours" value="72" />
      <SubmitButton variant={compact ? 'ghost' : 'secondary'} pendingLabel="재발송 중..." className={compact ? 'h-8 px-2 text-xs' : ''}>
        초대 링크 재발송
      </SubmitButton>
    </form>
  );
}
