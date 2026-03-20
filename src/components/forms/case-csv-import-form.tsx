"use client";

import { ClientActionForm } from "@/components/ui/client-action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { importCasesCsvAction } from "@/lib/actions/case-actions";

type CaseCsvImportFormProps = {
  organizationId: string;
};

export function CaseCsvImportForm({
  organizationId,
}: CaseCsvImportFormProps) {
  return (
    <ClientActionForm
      action={importCasesCsvAction}
      successTitle="사건 CSV 등록 완료"
      className="space-y-3"
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="file" name="file" accept=".csv" required />
      <SubmitButton>CSV 업로드</SubmitButton>
    </ClientActionForm>
  );
}
