import { upsertFeatureFlagAction } from '@/lib/actions/settings-actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { ClientActionForm } from '@/components/ui/client-action-form';

export function FeatureFlagForm({ organizationId, initial }: { organizationId?: string | null; initial?: any }) {
  return (
    <ClientActionForm action={upsertFeatureFlagAction} successTitle="기능 플래그가 저장되었습니다." className="space-y-3 rounded-xl border border-slate-200 p-4">
      {organizationId ? <input type="hidden" name="organizationId" value={organizationId} /> : null}
      <input name="flagKey" defaultValue={initial?.flag_key ?? ''} placeholder="flag key" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
      <div className="grid gap-3 md:grid-cols-[160px_1fr]">
        <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
          <input type="checkbox" name="enabled" defaultChecked={Boolean(initial?.enabled)} className="size-4 rounded border-slate-300" />
          활성화
        </label>
        <input name="rolloutPercentage" type="number" min="0" max="100" defaultValue={initial?.rollout_percentage ?? 100} placeholder="rollout %" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
      </div>
      <input name="reason" placeholder="변경 사유" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
      <SubmitButton variant="secondary" pendingLabel="저장 중...">플래그 저장</SubmitButton>
    </ClientActionForm>
  );
}
