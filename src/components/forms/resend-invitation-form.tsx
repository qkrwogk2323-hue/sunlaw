import { resendInvitationLinkAction } from '@/lib/actions/organization-actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { ClientActionForm } from '@/components/ui/client-action-form';

export function ResendInvitationForm({ invitationId, compact = false }: { invitationId: string; compact?: boolean }) {
  return (
    <ClientActionForm action={resendInvitationLinkAction} successTitle="초대 링크가 재발송되었습니다.">
      <input type="hidden" name="invitationId" value={invitationId} />
      <input type="hidden" name="expiresHours" value="72" />
      <SubmitButton variant={compact ? 'ghost' : 'secondary'} pendingLabel="재발송 중..." className={compact ? 'h-8 px-2 text-xs' : ''}>
        초대 링크 재발송
      </SubmitButton>
    </ClientActionForm>
  );
}
