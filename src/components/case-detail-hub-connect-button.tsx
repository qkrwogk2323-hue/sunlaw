'use client';

import { shareCaseToCollaborationHubAction } from '@/lib/actions/organization-actions';
import { DangerActionButton } from '@/components/ui/danger-action-button';

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
    <DangerActionButton
      action={shareCaseToCollaborationHubAction}
      fields={{ hubId, organizationId, caseId, permissionScope: 'collaborate', returnPath }}
      confirmTitle="허브 연동 확인"
      confirmDescription="사건을 허브로 연동하시겠습니까?"
      confirmLabel="연동"
      variant="info"
      buttonVariant="secondary"
      successTitle="허브 연동 완료"
      className="h-12 rounded-2xl px-5 text-base font-semibold"
    >
      허브 미연동
    </DangerActionButton>
  );
}
