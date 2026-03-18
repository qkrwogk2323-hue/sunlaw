import { postCollaborationHubMessageAction } from '@/lib/actions/organization-actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { Textarea } from '@/components/ui/textarea';

type CaseOption = {
  id: string;
  title: string;
  referenceNo?: string | null;
};

export function CollaborationHubMessageForm({
  hubId,
  organizationId,
  returnPath,
  cases
}: {
  hubId: string;
  organizationId: string;
  returnPath?: string;
  cases: CaseOption[];
}) {
  return (
    <form action={postCollaborationHubMessageAction} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <input type="hidden" name="hubId" value={hubId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      {returnPath ? <input type="hidden" name="returnPath" value={returnPath} /> : null}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">허브 메시지</label>
        <Textarea name="body" className="min-h-36" placeholder="상대 조직과 공유할 진행 메모, 회의 안건, 요청 사항을 남겨 주세요." required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">연결 사건</label>
        <select name="caseId" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
          <option value="">사건 연결 없이 메시지 보내기</option>
          {cases.map((item) => (
            <option key={item.id} value={item.id}>{item.title}{item.referenceNo ? ` · ${item.referenceNo}` : ''}</option>
          ))}
        </select>
      </div>
      <SubmitButton pendingLabel="전송 중...">메시지 보내기</SubmitButton>
    </form>
  );
}