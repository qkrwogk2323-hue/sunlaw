'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { switchDefaultOrganizationAction } from '@/lib/actions/organization-actions';
import { Button, segmentStyles } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { membershipRoleLabel } from '@/lib/membership-labels';
import type { Membership, OrganizationOption } from '@/lib/types';

export function OrganizationSwitcher({
  memberships,
  currentOrganizationId,
  compact = false,
  organizationOptions,
  allowExternalSelection = false
}: {
  memberships: Membership[];
  currentOrganizationId: string | null;
  compact?: boolean;
  organizationOptions?: OrganizationOption[];
  allowExternalSelection?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const currentMembership = useMemo(
    () => memberships.find((membership) => membership.organization_id === currentOrganizationId) ?? memberships[0],
    [currentOrganizationId, memberships]
  );
  const currentOrganization = useMemo(
    () => organizationOptions?.find((organization) => organization.id === currentOrganizationId) ?? currentMembership?.organization ?? null,
    [currentMembership?.organization, currentOrganizationId, organizationOptions]
  );
  const selectOptions = useMemo(() => {
    if (allowExternalSelection && organizationOptions?.length) {
      return organizationOptions.map((organization) => ({
        value: organization.id,
        label: organization.name,
        description: organization.kind ?? null
      }));
    }

    return memberships.map((membership) => ({
      value: membership.organization_id,
      label: membership.organization?.name ?? membership.organization_id,
      description: membershipRoleLabel(membership.role)
    }));
  }, [allowExternalSelection, memberships, organizationOptions]);

  if (!memberships.length && !(allowExternalSelection && organizationOptions?.length)) {
    return null;
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">현재 조직</p>
          <p className="mt-2 text-base font-semibold text-slate-950">{currentOrganization?.name ?? '선택된 조직 없음'}</p>
          <p className="mt-1 text-sm text-slate-600">{allowExternalSelection ? '플랫폼 기준 선택 조직' : membershipRoleLabel(currentMembership?.role)}</p>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={segmentStyles({ active: isOpen, className: 'mt-3 px-3 py-1.5 text-xs font-semibold' })}
          >
            조직 변경하기
            {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        </div>

        {isOpen ? (
          selectOptions.length ? (
            <form
              action={async (formData) => {
                await switchDefaultOrganizationAction(formData);
                setIsOpen(false);
              }}
              className="rounded-[1.4rem] border border-slate-200 bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
            >
              <select
                id="organizationId"
                name="organizationId"
                defaultValue={currentOrganizationId ?? selectOptions[0]?.value}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-inner"
              >
                {selectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}{option.description ? ` · ${option.description}` : ''}
                  </option>
                ))}
              </select>
              <div className="mt-3 flex gap-2">
                <SubmitButton variant="secondary" pendingLabel="반영 중..." className="h-10 min-w-20 justify-center px-4">
                  확인
                </SubmitButton>
                <Button variant="ghost" className="h-10 px-4" onClick={() => setIsOpen(false)}>
                  닫기
                </Button>
              </div>
            </form>
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
              가상조직 데이터가 아직 없습니다. 가상조직 레지스트리 시드 적용 후 새온가람법, 누리채움원, 다온하늘랩이 표시됩니다.
            </div>
          )
        ) : null}
      </div>
    );
  }

  return (
    <form action={switchDefaultOrganizationAction} className="space-y-3 rounded-2xl border border-slate-200/80 bg-white/88 p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)] backdrop-blur-sm">
      <label htmlFor="organizationId" className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        현재 조직
      </label>
      <select
        id="organizationId"
        name="organizationId"
        defaultValue={currentOrganizationId ?? selectOptions[0]?.value}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-inner"
      >
        {selectOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}{option.description ? ` · ${option.description}` : ''}
          </option>
        ))}
      </select>
      <SubmitButton variant="secondary" pendingLabel="전환 중..." className="w-full justify-center">
        조직 전환
      </SubmitButton>
    </form>
  );
}
