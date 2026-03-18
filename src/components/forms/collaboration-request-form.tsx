import { createOrganizationCollaborationRequestAction } from '@/lib/actions/organization-actions';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { Textarea } from '@/components/ui/textarea';

export function CollaborationRequestForm({
  sourceOrganizationId,
  targetOrganizationId,
  defaultTitle,
  returnPath
}: {
  sourceOrganizationId: string;
  targetOrganizationId: string;
  defaultTitle: string;
  returnPath?: string;
}) {
  return (
    <form action={createOrganizationCollaborationRequestAction} className="space-y-3">
      <input type="hidden" name="sourceOrganizationId" value={sourceOrganizationId} />
      <input type="hidden" name="targetOrganizationId" value={targetOrganizationId} />
      {returnPath ? <input type="hidden" name="returnPath" value={returnPath} /> : null}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">제안 제목</label>
        <Input name="title" defaultValue={defaultTitle} required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">제안 내용</label>
        <Textarea
          name="proposalNote"
          className="min-h-28"
          placeholder="예: 공동 대응할 사건, 필요한 담당자, 허브에서 같이 보고 싶은 운영 방식 등을 적어 주세요."
        />
      </div>
      <SubmitButton pendingLabel="제안 등록 중...">제안하기</SubmitButton>
    </form>
  );
}