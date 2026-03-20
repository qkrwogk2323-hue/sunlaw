'use client';

import { shareCaseToCollaborationHubAction } from '@/lib/actions/organization-actions';
import { SubmitButton } from '@/components/ui/submit-button';

export function CaseDetailHubConnectButton({
  hubId,
  organizationId,
  caseId,
  returnPath
}: {
  hubId: string;
  organizationId: string;
  caseId: string;
  returnPath: string;
}) {
  return (
    <form
      action={shareCaseToCollaborationHubAction}
      onSubmit={(event) => {
        if (!window.confirm('사건허브로 연동하시겠습니까?')) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="hubId" value={hubId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="permissionScope" value="collaborate" />
      <input type="hidden" name="returnPath" value={returnPath} />
      <SubmitButton pendingLabel="연동 중..." className="h-12 rounded-2xl px-5 text-base font-semibold">
        허브 미연동
      </SubmitButton>
    </form>
  );
}
