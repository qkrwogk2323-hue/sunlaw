"use client";

import { ClientActionForm } from "@/components/ui/client-action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { bulkInviteClientsAction } from "@/lib/actions/organization-actions";

type ClientBulkInviteFormProps = {
  organizationId: string;
};

export function ClientBulkInviteForm({
  organizationId,
}: ClientBulkInviteFormProps) {
  return (
    <ClientActionForm
      action={bulkInviteClientsAction}
      successTitle="일괄 초대 완료"
      className="space-y-3"
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <textarea
        name="emails"
        placeholder="이메일 한 줄에 하나씩"
        required
        rows={6}
      />
      <SubmitButton>일괄 초대</SubmitButton>
    </ClientActionForm>
  );
}
