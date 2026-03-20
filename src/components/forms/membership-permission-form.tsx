import { updateMembershipPermissionsAction } from '@/lib/actions/organization-actions';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { PERMISSION_GROUPS, PERMISSION_LABELS, PERMISSION_KEYS } from '@/lib/permissions';

import { SubmitButton } from '@/components/ui/submit-button';

export function MembershipPermissionForm({
  membershipId,
  organizationId,
  currentPermissions,
  actorCategory,
  roleTemplateKey,
  caseScopePolicy,
  membershipTitle,
  title
}: {
  membershipId: string;
  organizationId: string;
  currentPermissions?: Record<string, boolean> | null;
  actorCategory?: string | null;
  roleTemplateKey?: string | null;
  caseScopePolicy?: string | null;
  membershipTitle?: string | null;
  title: string;
}) {
  return (
    <ClientActionForm action={updateMembershipPermissionsAction} successTitle="권한 설정이 저장되었습니다." className="space-y-4 rounded-xl border border-slate-200 p-4">
      <input type="hidden" name="membershipId" value={membershipId} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">구조 역할</label>
          <select name="actorCategory" defaultValue={actorCategory ?? 'staff'} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
            <option value="admin">조직관리자</option>
            <option value="staff">조직원</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">직책</label>
          <Input name="membershipTitle" defaultValue={membershipTitle ?? ''} placeholder="직책 예: 사무장, 변호사, 팀장" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">권한 템플릿</label>
          <select name="roleTemplateKey" defaultValue={roleTemplateKey ?? 'org_staff'} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
            <option value="admin_general">조직관리자</option>
            <option value="org_staff">조직원</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">사건 범위</label>
          <select name="caseScopePolicy" defaultValue={caseScopePolicy ?? 'assigned_cases_only'} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
            <option value="all_org_cases">조직 전체 사건</option>
            <option value="assigned_cases_only">배정 사건만</option>
            <option value="read_only_assigned">배정 사건 읽기전용</option>
          </select>
        </div>
      </div>

      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="text-xs text-slate-500">구조 역할은 조직관리자/조직원 2단으로 운영합니다.</p>
      <div className="space-y-4">
        {Object.entries(PERMISSION_GROUPS).map(([group, keys]) => (
          <div key={group} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="mb-2 text-sm font-medium capitalize text-slate-900">{group}</p>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {keys.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name={key} defaultChecked={Boolean(currentPermissions?.[key])} className="size-4 rounded border-slate-300" />
                  {PERMISSION_LABELS[key]}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      {PERMISSION_KEYS.length ? null : null}
      <SubmitButton variant="secondary" pendingLabel="저장 중...">권한 저장</SubmitButton>
    </ClientActionForm>
  );
}
