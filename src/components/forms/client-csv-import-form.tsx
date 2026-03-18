import { importClientsCsvAction } from '@/lib/actions/organization-actions';
import { SubmitButton } from '@/components/ui/submit-button';

export function ClientCsvImportForm({ organizationId }: { organizationId: string }) {
  return (
    <form action={importClientsCsvAction} className="space-y-3">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input
        name="file"
        type="file"
        accept=".csv,text/csv,application/vnd.ms-excel"
        required
        className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
      />
      <p className="text-xs leading-6 text-slate-500">예시 컬럼: name, email, phone, relationLabel, caseTitle, caseReference, note</p>
      <SubmitButton pendingLabel="가져오는 중...">CSV로 의뢰인 저장</SubmitButton>
    </form>
  );
}
