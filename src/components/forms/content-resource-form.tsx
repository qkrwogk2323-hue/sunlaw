import { upsertContentResourceAction } from '@/lib/actions/settings-actions';
import { SubmitButton } from '@/components/ui/submit-button';

export function ContentResourceForm({ organizationId, initial }: { organizationId?: string | null; initial?: any }) {
  return (
    <form action={upsertContentResourceAction} className="space-y-3 rounded-xl border border-slate-200 p-4">
      {organizationId ? <input type="hidden" name="organizationId" value={organizationId} /> : null}
      <div className="grid gap-3 md:grid-cols-3">
        <input name="namespace" defaultValue={initial?.namespace ?? ''} placeholder="namespace" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
        <input name="resourceKey" defaultValue={initial?.resource_key ?? ''} placeholder="resource key" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
        <input name="locale" defaultValue={initial?.locale ?? 'ko-KR'} placeholder="locale" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
      </div>
      <textarea name="valueText" defaultValue={initial?.value_text ?? ''} placeholder="문구 본문" className="min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900" />
      <div className="grid gap-3 md:grid-cols-[160px_1fr]">
        <select name="status" defaultValue={initial?.status ?? 'draft'} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
          <option value="draft">draft</option>
          <option value="published">published</option>
          <option value="archived">archived</option>
        </select>
        <input name="reason" placeholder="변경 사유" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
      </div>
      <SubmitButton variant="secondary" pendingLabel="저장 중...">문구 저장</SubmitButton>
    </form>
  );
}
