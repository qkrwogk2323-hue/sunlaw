import { importCasesCsvAction } from '@/lib/actions/case-actions';
import { SubmitButton } from '@/components/ui/submit-button';

export function CaseCsvImportForm({ organizationId }: { organizationId: string }) {
  return (
    <form action={importCasesCsvAction} className="space-y-3">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input
        name="file"
        type="file"
        accept=".csv,text/csv,application/vnd.ms-excel"
        required
        className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
      />
      <p className="text-xs leading-6 text-slate-500">예시 컬럼: title, caseType, principalAmount, openedOn, courtName, caseNumber, summary</p>
      <SubmitButton pendingLabel="가져오는 중...">CSV로 사건 저장</SubmitButton>
    </form>
  );
}
