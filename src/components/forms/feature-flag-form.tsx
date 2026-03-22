import { upsertFeatureFlagAction } from '@/lib/actions/settings-actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { ClientActionForm } from '@/components/ui/client-action-form';

export function FeatureFlagForm({ organizationId, initial }: { organizationId?: string | null; initial?: any }) {
  return (
    <ClientActionForm action={upsertFeatureFlagAction} successTitle="기능 설정이 저장되었습니다." className="space-y-3 rounded-xl border border-slate-200 p-4">
      {organizationId ? <input type="hidden" name="organizationId" value={organizationId} /> : null}
      <label htmlFor="feature-flag-key" className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">기능 키</span>
        <input id="feature-flag-key" name="flagKey" defaultValue={initial?.flag_key ?? ''} placeholder="예: dashboard.ai_preview" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
      </label>
      <div className="grid gap-3 md:grid-cols-[160px_1fr]">
        <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
          <input type="checkbox" name="enabled" defaultChecked={Boolean(initial?.enabled)} className="size-4 rounded border-slate-300" />
          활성화
        </label>
        <label htmlFor="feature-flag-rollout" className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">적용 비율(%)</span>
          <input id="feature-flag-rollout" name="rolloutPercentage" type="number" min="0" max="100" defaultValue={initial?.rollout_percentage ?? 100} placeholder="예: 100" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
        </label>
      </div>
      <label htmlFor="feature-flag-reason" className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">변경 사유</span>
        <input id="feature-flag-reason" name="reason" placeholder="변경 사유" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
      </label>
      <SubmitButton pendingLabel="저장 중...">기능 설정 저장</SubmitButton>
    </ClientActionForm>
  );
}
