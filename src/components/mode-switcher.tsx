'use client';

import { useMemo, useState } from 'react';
import { Building2, ChevronDown, ChevronRight, MessageSquareText, UserCog } from 'lucide-react';
import { getCurrentMode, getDefaultMode, getOrganizationAdminMode, type OrganizationKind } from '@/lib/organization-mode';
import { segmentStyles } from '@/components/ui/button';

export { getCurrentMode, getDefaultMode, getOrganizationAdminMode, type OrganizationKind } from '@/lib/organization-mode';

const modeAccent = {
  law_admin: {
    icon: 'bg-violet-100 text-violet-700',
    badge: 'bg-violet-100 text-violet-700',
    active: 'bg-violet-50 border-violet-200'
  },
  collection_admin: {
    icon: 'bg-amber-100 text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    active: 'bg-amber-50 border-amber-200'
  },
  other_admin: {
    icon: 'bg-teal-100 text-teal-700',
    badge: 'bg-teal-100 text-teal-700',
    active: 'bg-teal-50 border-teal-200'
  },
  organization_staff: {
    icon: 'bg-slate-200 text-slate-700',
    badge: 'bg-slate-200 text-slate-700',
    active: 'bg-slate-100 border-slate-300'
  },
  client_communication: {
    icon: 'bg-emerald-100 text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700',
    active: 'bg-emerald-50 border-emerald-200'
  }
} as const;

const groupAccent = {
  organization: 'border-violet-200 bg-violet-50/50',
  client_communication: 'border-emerald-200 bg-emerald-50/60'
} as const;

const baseModeOptions = [
  { key: 'law_admin', label: '법률/법무조직' },
  { key: 'collection_admin', label: '신용정보회사' },
  { key: 'other_admin', label: '기타조직' },
  { key: 'organization_staff', label: '직원모드' },
  { key: 'client_communication', label: '의뢰인 모드' }
] as const;

export type ModeKey = (typeof baseModeOptions)[number]['key'];

export function ModeSwitcher({ mode, onChange }: { mode: ModeKey; onChange: (value: ModeKey) => void }) {
  const modeOptions = useMemo(
    () => baseModeOptions.map((item) => item.key === 'organization_staff' ? { ...item, label: '조직 담당자' } : item),
    []
  );
  const modeGroups = useMemo(
    () => ([
      {
        id: 'organization',
        label: '조직 운영',
        description: '조직 관리자 시야와 담당자 시야 전환',
        icon: Building2,
        children: [
          { key: 'law_admin', label: '법률/법무 조직 관리자' },
          { key: 'collection_admin', label: '신용정보사 관리자' },
          { key: 'other_admin', label: '기타 조직 관리자' },
          { key: 'organization_staff', label: '조직 담당자' }
        ]
      },
      {
        id: 'client_communication',
        label: '의뢰인 모드',
        description: '의뢰인 관점 진행 확인과 소통',
        icon: MessageSquareText,
        children: [{ key: 'client_communication', label: '의뢰인 모드' }]
      }
    ]),
    []
  );
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(
    mode === 'law_admin' || mode === 'collection_admin' || mode === 'other_admin'
      ? 'organization'
      : mode === 'organization_staff'
        ? 'organization'
        : mode
  );
  const currentLabel = modeOptions.find((option) => option.key === mode)?.label ?? '업무 모드';

  function selectMode(nextMode: ModeKey) {
    onChange(nextMode);
    setIsOpen(false);
    setExpandedGroupId(
      nextMode === 'law_admin' || nextMode === 'collection_admin' || nextMode === 'other_admin'
        ? 'organization'
        : nextMode === 'organization_staff'
          ? 'organization'
          : nextMode
    );
  }

  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1 text-left"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">업무모드</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{currentLabel}</p>
        </div>
        <span className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
          {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
      </button>

      {isOpen ? (
        <div className="mt-3 grid gap-2">
          {modeGroups.map((group) => {
            const Icon = group.icon;
            const activeChild = group.children.find((child) => child.key === mode);
            const isExpandable = group.children.length > 1;
            const isExpanded = expandedGroupId === group.id;
            const activeTone = modeAccent[(activeChild?.key ?? group.children[0].key) as keyof typeof modeAccent];

            return (
              <div key={group.id} className={`rounded-[1.15rem] border p-2 ${groupAccent[group.id as keyof typeof groupAccent] ?? 'border-slate-200 bg-slate-50'}`}>
                <button
                  type="button"
                  onClick={() => {
                    if (!isExpandable) {
                      selectMode(group.children[0].key as ModeKey);
                      return;
                    }

                    setExpandedGroupId((prev) => (prev === group.id ? null : group.id));
                  }}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                    activeChild ? `border bg-white text-slate-950 shadow-sm ${activeTone.active}` : 'text-slate-700 hover:bg-white/80'
                  }`}
                >
                  <span className={`inline-flex size-9 items-center justify-center rounded-xl ${activeChild ? activeTone.icon : 'bg-white text-slate-500'}`}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold break-keep text-balance">{group.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500 break-keep text-balance">{group.description}</span>
                    {activeChild ? <span className={`mt-2 inline-flex max-w-full rounded-full px-2.5 py-1 text-xs font-semibold ${activeTone.badge}`}>{activeChild.label}</span> : null}
                  </span>
                  {isExpandable ? <span className="mt-1">{isExpanded ? <ChevronDown className="size-4 text-slate-400" /> : <ChevronRight className="size-4 text-slate-400" />}</span> : null}
                </button>

                {isExpandable && isExpanded ? (
                  <div className="mt-2 grid gap-2 pl-12 sm:grid-cols-2">
                    {group.children.map((child) => (
                      <button
                        key={child.key}
                        type="button"
                        onClick={() => selectMode(child.key as ModeKey)}
                        className={segmentStyles({
                          active: mode === child.key,
                          className: `justify-start rounded-xl px-3 py-2 text-left text-sm ${
                            mode === child.key
                              ? child.key === 'law_admin'
                                ? 'bg-violet-600'
                                : child.key === 'collection_admin'
                                  ? 'bg-amber-500 text-slate-950'
                                  : child.key === 'client_communication'
                                    ? 'bg-emerald-600'
                                    : child.key === 'other_admin'
                                        ? 'bg-teal-600'
                                        : 'bg-slate-900'
                              : ''
                          }`
                        })}
                      >
                        <span className="inline-flex items-center gap-2">
                          <UserCog className="size-4" />
                          {child.label}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
