import { upsertOrganizationSettingAction } from '@/lib/actions/settings-actions';
import { SubmitButton } from '@/components/ui/submit-button';

export function OrganizationSettingForm({ item, organizationId, currentValue }: { item: any; organizationId: string; currentValue?: any }) {
  return (
    <form action={upsertOrganizationSettingAction} className="space-y-3 rounded-xl border border-slate-200 p-4">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="key" value={item.key} />
      <div>
        <p className="text-sm font-medium text-slate-900">{item.key}</p>
        <p className="mt-1 text-xs text-slate-500">{item.description}</p>
      </div>
      <textarea
        name="valueJson"
        defaultValue={JSON.stringify(currentValue ?? item.default_value_json, null, 2)}
        className="min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900"
      />
      <input name="reason" placeholder="변경 사유" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>{item.domain} · org override</span>
        <SubmitButton variant="secondary" pendingLabel="저장 중...">조직 값 저장</SubmitButton>
      </div>
    </form>
  );
}
