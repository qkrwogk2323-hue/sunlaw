import { createClientDirectInvitationAction } from '@/lib/actions/organization-actions';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

type CaseOption = { id: string; title: string };

export function ClientDirectInviteForm({ organizationId, cases, returnPath }: { organizationId: string; cases: CaseOption[]; returnPath?: string }) {
  return (
    <ClientActionForm action={createClientDirectInvitationAction} successTitle="의뢰인 초대 링크가 발송되었습니다." className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      {returnPath ? <input type="hidden" name="returnPath" value={returnPath} /> : null}
      <div className="md:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-500">연결 사건</label>
        <select name="caseId" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" required>
          {cases.map((item) => (
            <option key={item.id} value={item.id}>{item.title}</option>
          ))}
        </select>
      </div>
      <Input name="email" type="email" placeholder="의뢰인 이메일" required />
      <Input name="expiresHours" type="number" min="1" max="336" defaultValue={72} placeholder="만료 시간(시간)" />
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="발송 중...">의뢰인 초대 링크 발송</SubmitButton>
      </div>
    </ClientActionForm>
  );
}
