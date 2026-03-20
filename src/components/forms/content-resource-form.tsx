import { upsertContentResourceAction } from '@/lib/actions/settings-actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { ClientActionForm } from '@/components/ui/client-action-form';

export function ContentResourceForm({ organizationId, initial }: { organizationId?: string | null; initial?: any }) {
  return (
    <ClientActionForm action={upsertContentResourceAction} successTitle="문구 리소스가 저장되었습니다." className="space-y-3 rounded-xl border border-slate-200 p-4">
      {organizationId ? <input type="hidden" name="organizationId" value={organizationId} /> : null}
      <div className="grid gap-3 md:grid-cols-3">
        <label htmlFor="content-resource-namespace" className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">네임스페이스</span>
          <input id="content-resource-namespace" name="namespace" defaultValue={initial?.namespace ?? ''} placeholder="예: landing" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
        </label>
        <label htmlFor="content-resource-key" className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">리소스 키</span>
          <input id="content-resource-key" name="resourceKey" defaultValue={initial?.resource_key ?? ''} placeholder="예: hero.title" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
        </label>
        <label htmlFor="content-resource-locale" className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">언어 코드</span>
          <input id="content-resource-locale" name="locale" defaultValue={initial?.locale ?? 'ko-KR'} placeholder="예: ko-KR" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
        </label>
      </div>
      <label htmlFor="content-resource-value" className="space-y-1 text-sm text-slate-700">
        <span className="font-medium text-slate-900">문구 본문</span>
        <textarea id="content-resource-value" name="valueText" defaultValue={initial?.value_text ?? ''} placeholder="문구 본문" className="min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900" />
      </label>
      <div className="grid gap-3 md:grid-cols-[160px_1fr]">
        <label htmlFor="content-resource-status" className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">상태</span>
          <select id="content-resource-status" name="status" defaultValue={initial?.status ?? 'draft'} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
            <option value="draft">초안</option>
            <option value="published">게시됨</option>
            <option value="archived">보관됨</option>
          </select>
        </label>
        <label htmlFor="content-resource-reason" className="space-y-1 text-sm text-slate-700">
          <span className="font-medium text-slate-900">변경 사유</span>
          <input id="content-resource-reason" name="reason" placeholder="변경 사유" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
        </label>
      </div>
      <SubmitButton variant="secondary" pendingLabel="저장 중...">문구 저장</SubmitButton>
    </ClientActionForm>
  );
}
