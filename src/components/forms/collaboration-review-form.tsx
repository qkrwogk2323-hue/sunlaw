import { reviewOrganizationCollaborationRequestAction } from '@/lib/actions/organization-actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { Textarea } from '@/components/ui/textarea';

export function CollaborationReviewForm({
  requestId,
  organizationId,
  returnPath
}: {
  requestId: string;
  organizationId: string;
  returnPath?: string;
}) {
  return (
    <form action={reviewOrganizationCollaborationRequestAction} className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      {returnPath ? <input type="hidden" name="returnPath" value={returnPath} /> : null}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">응답 메모</label>
        <Textarea
          name="responseNote"
          className="min-h-24"
          placeholder="승인 시 운영 메모, 반려 시 사유를 남길 수 있습니다."
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <input type="hidden" name="decision" value="approved" />
        <SubmitButton pendingLabel="승인 처리 중...">승인하기</SubmitButton>
      </div>
    </form>
  );
}

export function CollaborationRejectForm({
  requestId,
  organizationId,
  returnPath
}: {
  requestId: string;
  organizationId: string;
  returnPath?: string;
}) {
  return (
    <form action={reviewOrganizationCollaborationRequestAction} className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="decision" value="rejected" />
      {returnPath ? <input type="hidden" name="returnPath" value={returnPath} /> : null}
      <Textarea
        name="responseNote"
        className="min-h-24"
        placeholder="반려 사유를 남겨 주세요."
      />
      <SubmitButton variant="secondary" pendingLabel="반려 처리 중...">반려하기</SubmitButton>
    </form>
  );
}