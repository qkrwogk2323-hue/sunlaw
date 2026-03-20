import { createSupportRequestAction } from '@/lib/actions/support-actions';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';

export function SupportRequestForm({ organizations }: { organizations: Array<{ id: string; name: string }> }) {
  return (
    <ClientActionForm action={createSupportRequestAction} successTitle="지원 요청이 생성되었습니다." className="grid gap-3 md:grid-cols-2">
      <select name="organizationId" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" defaultValue={organizations[0]?.id}>
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name}
          </option>
        ))}
      </select>
      <Input name="targetEmail" type="email" placeholder="대상 사용자 이메일" required />
      <Input name="expiresHours" type="number" min="1" max="72" defaultValue="4" />
      <div className="hidden md:block" />
      <Textarea name="reason" placeholder="지원 접속 사유" className="md:col-span-2" required />
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="요청 생성 중...">지원 접속 요청 생성</SubmitButton>
      </div>
    </ClientActionForm>
  );
}
