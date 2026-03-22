'use client';

import { Download } from 'lucide-react';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { importClientsCsvAction } from '@/lib/actions/organization-actions';

type Props = { organizationId: string };

export function ClientCsvImportForm({ organizationId }: Props) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
        <p className="text-sm font-medium text-sky-900">대량 등록은 CSV 양식에 맞춰 올려 주세요.</p>
        <p className="mt-1 text-xs leading-6 text-sky-800">아래 양식을 내려받아 그대로 작성한 뒤 업로드하면 의뢰인을 한 번에 등록할 수 있습니다.</p>
      </div>
      <a
        href="/api/templates/clients-csv"
        download="clients-template.csv"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
      >
        <Download className="size-4" />
        의뢰인 CSV 양식 내려받기
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
        <p className="text-xs text-slate-500">내려받은 양식의 열 순서와 항목명을 유지한 채 업로드해 주세요.</p>
        <SubmitButton>CSV 업로드</SubmitButton>
      </ClientActionForm>
    </div>
  );
}
