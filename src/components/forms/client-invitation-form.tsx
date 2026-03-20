import { createClientInvitationAction } from '@/lib/actions/case-actions';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

export function ClientInvitationForm({ caseId }: { caseId: string }) {
  const action = createClientInvitationAction.bind(null, caseId);
  return (
    <ClientActionForm action={action} successTitle="포털 초대 링크가 생성되었습니다." className="grid gap-3 md:grid-cols-[1fr_auto]">
      <Input name="email" type="email" placeholder="의뢰인 이메일" required />
      <SubmitButton pendingLabel="생성 중...">포털 초대 링크 생성</SubmitButton>
    </ClientActionForm>
  );
}
