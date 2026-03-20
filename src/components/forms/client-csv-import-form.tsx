'use client';

import { Download } from 'lucide-react';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { importClientsCsvAction } from '@/lib/actions/organization-actions';

type Props = { organizationId: string };

export function ClientCsvImportForm({ organizationId }: Props) {
  return (
    <div className="space-y-3">
      <a
        href="/api/templates/clients-csv"
        download="clients-template.csv"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
      >
        <Download className="size-4" />
        양식 다운로드 (clients-template.csv)
      </a>
      <ClientActionForm action={importClientsCsvAction} successTitle="의뢰인 CSV 등록 완료" className="space-y-3">
        <input type="hidden" name="organizationId" value={organizationId} />
        <input
          type="file"
          name="file"
          accept=".csv"
          required
          className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm"
        />
        <SubmitButton>CSV 업로드</SubmitButton>
      </ClientActionForm>
    </div>
  );
}
