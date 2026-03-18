import { SubmitButton } from '@/components/ui/submit-button';

export function ClientBulkInviteForm() {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="submit" name="mode" value="all" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">전부 초대하기</button>
      <SubmitButton pendingLabel="선택 초대 중...">선택 항목 초대하기</SubmitButton>
    </div>
  );
}
