import { shareCaseToCollaborationHubAction } from '@/lib/actions/organization-actions';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { Textarea } from '@/components/ui/textarea';

type CaseOption = {
  id: string;
  title: string;
  referenceNo?: string | null;
};

export function CollaborationCaseShareForm({
  hubId,
  organizationId,
  returnPath,
  cases,
  initialCaseId
}: {
  hubId: string;
  organizationId: string;
  returnPath?: string;
  cases: CaseOption[];
  initialCaseId?: string | null;
}) {
  const defaultCaseId = initialCaseId && cases.some((item) => item.id === initialCaseId)
    ? initialCaseId
    : cases[0]?.id;

  return (
    <ClientActionForm action={shareCaseToCollaborationHubAction} successTitle="사건이 공유되었습니다." className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <input type="hidden" name="hubId" value={hubId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      {returnPath ? <input type="hidden" name="returnPath" value={returnPath} /> : null}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">공유할 사건</label>
        <select name="caseId" defaultValue={defaultCaseId} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" required>
          {cases.map((item) => (
            <option key={item.id} value={item.id}>{item.title}{item.referenceNo ? ` · ${item.referenceNo}` : ''}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">공유 범위</label>
        <select name="permissionScope" defaultValue="view" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
          <option value="view">보기</option>
          <option value="reference">참조</option>
          <option value="collaborate">공동 작업</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">공유 메모</label>
        <Textarea name="note" className="min-h-24" placeholder="상대 조직이 이 사건을 어떤 맥락으로 보면 되는지 적어 주세요." />
      </div>
      <SubmitButton pendingLabel="공유 중...">사건 공유하기</SubmitButton>
    </ClientActionForm>
  );
}
