"use client";

import { ClientActionForm } from "@/components/ui/client-action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { importClientsCsvAction } from "@/lib/actions/organization-actions";

type ClientCsvImportFormProps = {
  organizationId: string;
};

export function ClientCsvImportForm({
  organizationId,
}: ClientCsvImportFormProps) {
  return (
    <ClientActionForm
      action={importClientsCsvAction}
      successTitle="의뢰인 CSV 등록 완료"
      className="space-y-3"
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="file" name="file" accept=".csv" required />
      <SubmitButton>CSV 업로드</SubmitButton>
    </ClientActionForm>
  );
}
