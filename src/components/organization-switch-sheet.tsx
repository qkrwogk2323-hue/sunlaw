'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Check, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { switchDefaultOrganizationAction } from '@/lib/actions/organization-actions';
import { membershipRoleLabel } from '@/lib/membership-labels';
import { useToast } from '@/components/ui/toast-provider';
import type { Membership, OrganizationOption } from '@/lib/types';

const RECENT_ORG_KEY = 'org-switcher:recent';
const RECENT_ORG_MAX = 3;
const SEARCH_THRESHOLD = 8;
/** Delay (ms) before auto-focusing search, to let the bottom-sheet slide-in animation complete */
const SEARCH_FOCUS_DELAY_MS = 320;

function readRecentOrgIds(): string[] {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(RECENT_ORG_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as unknown[]).filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeRecentOrgId(id: string) {
  try {
    const existing = readRecentOrgIds().filter((v) => v !== id);
    const next = [id, ...existing].slice(0, RECENT_ORG_MAX);
    window.localStorage.setItem(RECENT_ORG_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

/** Maps current pathname to a safe top-level path to navigate after org switch */
function resolveContextPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const topLevel = segments[0] ? `/${segments[0]}` : '/dashboard';
  const safeTopLevel = new Set([
    '/dashboard', '/cases', '/case-hubs', '/clients', '/calendar',
    '/notifications', '/inbox', '/settings', '/collections', '/portal'
  ]);
  // /hub/* is hub-specific — always fall back to hub list
  if (topLevel === '/hub') return '/case-hubs';
  if (safeTopLevel.has(topLevel)) return topLevel;
  return '/dashboard';
}

type OrgEntry = {
  id: string;
  name: string;
  roleLabel: string;
};

export function OrganizationSwitchSheet({
  memberships,
  currentOrganizationId,
  platformOrganizations,
  currentPathname,
  open,
  onClose
}: {
  memberships: Membership[];
  currentOrganizationId: string | null;
  platformOrganizations?: OrganizationOption[];
  currentPathname: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const allOrgs = useMemo<OrgEntry[]>(() => {
    if (platformOrganizations?.length) {
      return platformOrganizations.map((org) => ({
        id: org.id,
        name: org.name,
        roleLabel: '플랫폼 관리'
      }));
    }
    return memberships.map((m) => ({
      id: m.organization_id,
      name: m.organization?.name ?? m.organization_id,
      roleLabel: membershipRoleLabel(m.role)
    }));
  }, [memberships, platformOrganizations]);

  const showSearch = allOrgs.length >= SEARCH_THRESHOLD;

  // Read recent orgs from localStorage after mount (client-only)
  useEffect(() => {
    setRecentIds(readRecentOrgIds());
  }, [open]);

  // Focus search when sheet opens and there are enough orgs
  useEffect(() => {
    if (open && showSearch) {
      const t = window.setTimeout(() => searchRef.current?.focus(), SEARCH_FOCUS_DELAY_MS);
      return () => window.clearTimeout(t);
    }
  }, [open, showSearch]);

  // Reset search query when closed
  useEffect(() => {
    if (!open) setSearchQuery('');
  }, [open]);

  const filteredOrgs = useMemo<OrgEntry[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allOrgs;
    return allOrgs.filter((o) => o.name.toLowerCase().includes(q) || o.roleLabel.toLowerCase().includes(q));
  }, [allOrgs, searchQuery]);

  // Build ordered list: recent first (excluding current), then rest
  const orderedOrgs = useMemo<{ org: OrgEntry; isRecent: boolean }[]>(() => {
    if (searchQuery.trim()) {
      return filteredOrgs.map((org) => ({ org, isRecent: false }));
    }
    const recentSet = new Set(recentIds);
    const recentOrgs = recentIds
      .map((id) => allOrgs.find((o) => o.id === id))
      .filter((o): o is OrgEntry => Boolean(o) && o.id !== currentOrganizationId);
    const otherOrgs = allOrgs.filter((o) => !recentSet.has(o.id) || o.id === currentOrganizationId);
    return [
      ...recentOrgs.map((org) => ({ org, isRecent: true })),
      ...otherOrgs.map((org) => ({ org, isRecent: false }))
    ];
  }, [allOrgs, recentIds, currentOrganizationId, searchQuery]);

  function handleSelectOrg(targetOrgId: string) {
    if (isPending || targetOrgId === currentOrganizationId) {
      onClose();
      return;
    }

    const formData = new FormData();
    formData.set('organizationId', targetOrgId);
    // The action requires contextOrganizationId to scope permission checks.
    // When currentOrganizationId is null (no org yet), use the target org itself as context.
    formData.set('contextOrganizationId', currentOrganizationId ?? targetOrgId);

    startTransition(async () => {
      try {
        await switchDefaultOrganizationAction(formData);
        writeRecentOrgId(targetOrgId);
        const targetPath = resolveContextPath(currentPathname);
        router.push(targetPath);
        router.refresh();
        success('조직이 전환되었습니다.');
        onClose();
      } catch {
        showError('조직 전환에 실패했습니다.', {
          message: '요청을 처리할 수 없었습니다. 잠시 후 다시 시도하거나 문제가 지속되면 관리자에게 문의해 주세요.'
        });
      }
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="조직 전환"
      className={`fixed inset-0 z-[60] transition ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      {/* Backdrop */}
      <button
        type="button"
        className={`absolute inset-0 bg-slate-950/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-label="닫기"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
      />

      {/* Sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 flex max-h-[90dvh] flex-col rounded-t-3xl bg-white shadow-[0_-18px_48px_rgba(15,23,42,0.18)] transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Handle + header */}
        <div className="shrink-0 px-4 pb-2 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" aria-hidden />
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">조직 전환</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Search — shown when >= 8 orgs */}
          {showSearch ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Search className="size-4 shrink-0 text-slate-400" aria-hidden />
              <input
                ref={searchRef}
                type="search"
                aria-label="조직 검색"
                placeholder="조직 이름 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery ? (
                <button
                  type="button"
                  aria-label="검색어 지우기"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Org list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-1">
          {orderedOrgs.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">검색 결과가 없습니다.</div>
          ) : (
            <ul className="space-y-2" role="listbox" aria-label="조직 목록">
              {!searchQuery.trim() && recentIds.filter((id) => id !== currentOrganizationId).length > 0 ? (
                <li className="pb-1 pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">최근 조직</p>
                </li>
              ) : null}
              {orderedOrgs.map(({ org, isRecent }, index) => {
                const isCurrent = org.id === currentOrganizationId;
                const showRecentDivider =
                  !searchQuery.trim()
                  && index > 0
                  && !isRecent
                  && orderedOrgs[index - 1]?.isRecent;

                return (
                  <li key={org.id} role="option" aria-selected={isCurrent}>
                    {showRecentDivider ? (
                      <div className="mb-2 mt-1 border-t border-slate-100 pt-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">전체 조직</p>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSelectOrg(org.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                        isCurrent
                          ? 'border-violet-300 bg-violet-50 text-slate-950 shadow-[0_4px_12px_rgba(124,58,237,0.10)]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100'
                      } ${isPending ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <span
                        className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                          isCurrent ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'
                        }`}
                        aria-hidden
                      >
                        {org.name.charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{org.name}</span>
                        <span className="block text-xs text-slate-500">{org.roleLabel}</span>
                      </span>
                      {isCurrent ? (
                        <Check className="size-4 shrink-0 text-violet-600" aria-label="현재 조직" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Loading overlay during transition */}
        {isPending ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-t-3xl bg-white/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="size-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" aria-hidden />
              <p className="text-sm font-medium text-slate-700">전환 중...</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
