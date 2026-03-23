'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  BellRing,
  Building2,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Network,
  Receipt,
  Settings,
  ShieldAlert,
  Users,
  X
} from 'lucide-react';
import { getDefaultMode, type ModeKey } from '@/components/mode-switcher';
import { Button, segmentStyles } from '@/components/ui/button';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { MobileOrganizationSwitcher } from '@/components/mobile-organization-switcher';
import { SubmitButton } from '@/components/ui/submit-button';
import { useToast } from '@/components/ui/toast-provider';
import { switchDefaultOrganizationAction } from '@/lib/actions/organization-actions';
import { isPlatformManagementOrganization } from '@/lib/platform-governance';
import type { Membership, OrganizationOption, Profile } from '@/lib/types';
import { ACTIVE_VIEW_MODE_COOKIE } from '@/lib/view-mode';

type NavBadge = { count: number; variant?: 'default' | 'urgent' };
type NavItem = { href: string; label: string; icon: React.ComponentType<any>; badge?: NavBadge | null; pulse?: boolean; emphasize?: boolean };
type NavSection = { id: string; label: string; items: NavItem[] };
type NavUnreadCounts = { unreadCount: number; actionRequiredCount: number; unreadConversationCount: number };

const sectionAccent = {
  'common-menu': {
    soft: 'border-sky-200 bg-sky-50/70',
    active: 'border-sky-300 bg-sky-50 text-slate-950 shadow-[0_12px_24px_rgba(14,165,233,0.10)]',
    icon: 'bg-sky-100 text-sky-700',
    dot: 'bg-sky-500',
    mobile: 'bg-sky-600'
  },
  'organization-menu': {
    soft: 'border-violet-200 bg-violet-50/70',
    active: 'border-violet-300 bg-violet-50 text-slate-950 shadow-[0_12px_24px_rgba(124,58,237,0.10)]',
    icon: 'bg-violet-100 text-violet-700',
    dot: 'bg-violet-500',
    mobile: 'bg-violet-600'
  },
  'platform-menu': {
    soft: 'border-violet-200 bg-violet-50/70',
    active: 'border-violet-300 bg-violet-50 text-slate-950 shadow-[0_12px_24px_rgba(124,58,237,0.10)]',
    icon: 'bg-violet-100 text-violet-700',
    dot: 'bg-violet-500',
    mobile: 'bg-violet-600'
  },
  'collaboration-menu': {
    soft: 'border-emerald-200 bg-emerald-50/70',
    active: 'border-emerald-300 bg-emerald-50 text-slate-950 shadow-[0_12px_24px_rgba(16,185,129,0.10)]',
    icon: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
    mobile: 'bg-emerald-600'
  },
  'company-management-menu': {
    soft: 'border-amber-200 bg-amber-50/75',
    active: 'border-amber-300 bg-amber-50 text-slate-950 shadow-[0_12px_24px_rgba(245,158,11,0.10)]',
    icon: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
    mobile: 'bg-amber-500 text-slate-950'
  }
} as const;

function isManagementRole(role?: string | null) {
  return role === 'org_owner' || role === 'org_manager';
}

function uniqueItems(items: NavItem[]) {
  return items.filter((item, index, list) => list.findIndex((candidate) => candidate.href === item.href) === index);
}

function resolveSectionIdByPath(sections: NavSection[], pathname: string) {
  const matchedSection = sections.find((section) =>
    section.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
  );
  return matchedSection?.id ?? sections[0]?.id ?? 'common-menu';
}

function getRoleLabel(membership: Membership | null, fallback: string) {
  if (membership?.title?.trim()) return membership.title.trim();
  if (membership?.role === 'org_owner' || membership?.role === 'org_manager') return '조직관리자';
  if (membership?.role === 'org_staff') return '조직원';
  return fallback;
}

function getOrganizationSections({
  membership,
  mode,
  unreadNotificationCount = 0,
  actionRequiredCount = 0,
  unreadConversationCount = 0,
  pulseNotification = false,
  pulseConversation = false
}: {
  membership: Membership | null;
  mode: ModeKey;
  unreadNotificationCount?: number;
  actionRequiredCount?: number;
  unreadConversationCount?: number;
  pulseNotification?: boolean;
  pulseConversation?: boolean;
}) {
  const notificationBadge: NavBadge | null =
    actionRequiredCount > 0
      ? { count: actionRequiredCount, variant: 'urgent' }
      : unreadNotificationCount > 0
        ? { count: unreadNotificationCount, variant: 'default' }
        : null;
  const conversationBadge: NavBadge | null = unreadConversationCount > 0 ? { count: unreadConversationCount, variant: 'default' } : null;
  const organization = membership?.organization;
  const isPlatformManagementOrganizationView = isPlatformManagementOrganization(organization);

  const commonItems = mode === 'client_communication'
    ? uniqueItems([
        { href: '/notifications', label: '알림 확인', icon: BellRing, badge: notificationBadge, pulse: pulseNotification },
        { href: '/support', label: '고객센터', icon: MessageSquareText }
      ])
    : uniqueItems([
        isPlatformManagementOrganizationView
          ? { href: '/product-home', label: '운영 첫 화면', icon: LayoutDashboard }
          : { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
        { href: '/calendar', label: '일정관리', icon: CalendarRange },
        { href: '/notifications', label: '알림 센터', icon: BellRing, badge: notificationBadge, pulse: pulseNotification, emphasize: unreadNotificationCount > 0 },
      ]);

  const platformItems: NavItem[] = [];
  const organizationItems: NavItem[] = [];
  const collaborationItems: NavItem[] = [];
  const companyManagementItems: NavItem[] = [];

  if (isPlatformManagementOrganizationView) {
    platformItems.push(
      { href: '/admin/organization-requests', label: '조직 신청 관리', icon: FileText },
      { href: '/admin/organizations', label: '조직 관리', icon: Building2 },
      { href: '/admin/audit', label: '감사 로그', icon: ShieldAlert },
      { href: '/settings/organization', label: '조직 설정', icon: Settings }
    );
  } else if (mode === 'client_communication') {
    organizationItems.push(
      { href: '/portal', label: '의뢰인 홈', icon: LayoutDashboard },
      { href: '/portal/cases', label: '내 사건', icon: FileText },
      { href: '/portal/messages', label: '사건 소통', icon: MessageSquareText },
      { href: '/portal/notifications', label: '알림 확인', icon: BellRing }
    );
  } else {
    const organizationKind = membership?.organization?.kind;

    if (organizationKind === 'other') {
      organizationItems.push({ href: '/clients', label: '의뢰인 관리', icon: Users });
    } else {
    if (mode === 'collection_admin') {
      organizationItems.push({ href: '/collections', label: '신용정보 운영', icon: FileText });
    }

    organizationItems.push(
      { href: '/cases', label: '사건 목록', icon: FileText },
      { href: '/clients', label: '의뢰인 관리', icon: Users },
      { href: '/documents', label: '업로드 문서', icon: FileText },
      { href: '/billing', label: '비용 관리', icon: Receipt }
    );
    }
  }

  if (!isPlatformManagementOrganizationView) {
    collaborationItems.push(
      { href: '/case-hubs', label: '사건허브', icon: Network },
      { href: '/inbox', label: '조직 협업', icon: MessageSquareText, badge: conversationBadge, pulse: pulseConversation, emphasize: unreadConversationCount > 0 }
    );
  }
  if (!isPlatformManagementOrganizationView && mode !== 'client_communication') {
    collaborationItems.push({ href: '/organizations', label: '조직 찾기', icon: Building2 });
  }

  const canManageMembership = Boolean(membership && isManagementRole(membership.role));
  if (isPlatformManagementOrganizationView) {
    companyManagementItems.push(
      { href: '/admin/support', label: '고객센터', icon: MessageSquareText, badge: notificationBadge, pulse: pulseNotification, emphasize: unreadNotificationCount > 0 }
    );
  }
  if (!isPlatformManagementOrganizationView && (canManageMembership || mode === 'law_admin' || mode === 'collection_admin' || mode === 'other_admin')) {
    companyManagementItems.push(
      { href: '/settings/organization', label: '조직 설정', icon: Settings },
      { href: '/settings/team', label: '구성원 관리', icon: Building2 },
      { href: '/contracts', label: '계약 관리', icon: Receipt },
      { href: '/settings/subscription', label: '구독 관리', icon: Receipt },
      { href: '/support', label: '고객센터', icon: MessageSquareText }
    );
  }

  const sections: NavSection[] = [];
  if (commonItems.length) sections.push({ id: 'common-menu', label: '공통 메뉴', items: commonItems });
  if (platformItems.length) sections.push({ id: 'platform-menu', label: '플랫폼 메뉴', items: uniqueItems(platformItems) });
  if (organizationItems.length) sections.push({ id: 'organization-menu', label: '조직 메뉴', items: uniqueItems(organizationItems) });
  if (collaborationItems.length) sections.push({ id: 'collaboration-menu', label: '협업 메뉴', items: uniqueItems(collaborationItems) });
  if (companyManagementItems.length) sections.push({ id: 'company-management-menu', label: '회사 관리', items: uniqueItems(companyManagementItems) });

  return sections;
}

function ModeNavItem({
  href,
  label,
  icon: Icon,
  active,
  sectionId,
  badge,
  pulse = false,
  emphasize = false
}: {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  active: boolean;
  sectionId: string;
  badge?: NavBadge | null;
  pulse?: boolean;
  emphasize?: boolean;
}) {
  const accent = sectionAccent[sectionId as keyof typeof sectionAccent] ?? sectionAccent['common-menu'];
  return (
    <Link
      href={href as Route}
      className={`inline-flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition-colors duration-150 ${
        active
          ? accent.active
          : emphasize
            ? 'border-amber-300 bg-amber-50/80 text-slate-900 shadow-[0_8px_18px_rgba(245,158,11,0.12)] hover:border-amber-400'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950'
      }`}
    >
      <span className={`inline-flex size-8 items-center justify-center rounded-lg ${active ? accent.icon : emphasize ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'} ${pulse || emphasize ? 'animate-pulse' : ''}`}>
        <Icon className="size-4" />
      </span>
      <span className="flex-1">{label}</span>
      {badge && badge.count > 0 ? (
        <span
          className={`min-w-[1.4rem] rounded-full px-2 py-0.5 text-center text-[11px] font-semibold tabular-nums ${pulse ? 'animate-pulse' : ''} ${
            badge.variant === 'urgent' ? 'bg-red-500 text-white' : 'bg-sky-600 text-white'
          }`}
        >
          {badge.count > 99 ? '99+' : badge.count}
        </span>
      ) : (
        <span className={`h-2.5 w-2.5 rounded-full ${active ? accent.dot : 'bg-slate-200'}`} />
      )}
    </Link>
  );
}

function sectionButtonLabel(label: string) {
  return label.replace(' 메뉴', '').replace(' 관리', '관리');
}

function MobileSectionBar({
  sections,
  pathname,
  currentOrgMembership,
  baseRoleLabel,
  currentOrganization,
  organizationOptions,
  hasUnreadNotifications,
  collapsedSectionIds,
  onToggleSection
}: {
  sections: NavSection[];
  pathname: string;
  currentOrgMembership: Membership | null;
  baseRoleLabel: string;
  currentOrganization: OrganizationOption | Membership['organization'] | null;
  organizationOptions: Array<{ id: string; name: string }>;
  hasUnreadNotifications: boolean;
  collapsedSectionIds: string[];
  onToggleSection: (sectionId: string) => void;
}) {
  const derivedSectionId = useMemo(
    () => resolveSectionIdByPath(sections, pathname),
    [sections, pathname]
  );
  const [manualSectionId, setManualSectionId] = useState<string | null>(null);
  const activeSectionId = useMemo(() => {
    if (!manualSectionId) return derivedSectionId;
    const matchedManualSection = sections.find((section) => section.id === manualSectionId);
    return matchedManualSection ? manualSectionId : derivedSectionId;
  }, [derivedSectionId, manualSectionId, sections]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0] ?? null;
  const isActiveSectionCollapsed = activeSection ? collapsedSectionIds.includes(activeSection.id) : false;

  return (
    <div className="space-y-3 lg:hidden">
      <MobileOrganizationSwitcher
        currentOrganizationId={currentOrganization?.id ?? currentOrgMembership?.organization_id ?? null}
        currentOrganizationName={currentOrganization?.name ?? currentOrgMembership?.organization?.name ?? '협업 조직'}
        roleLabel={baseRoleLabel}
        organizationOptions={organizationOptions}
        onOpenMenu={() => setDrawerOpen(true)}
      />

      <div className={`fixed inset-0 z-50 transition ${drawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <button
          type="button"
          className={`absolute inset-0 bg-slate-950/35 transition ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          aria-label="메뉴 닫기"
          onClick={() => setDrawerOpen(false)}
        />
        <div className={`absolute left-0 top-0 h-full w-[84vw] max-w-[22rem] overflow-y-auto border-r border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition-transform ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">메뉴</p>
            <button type="button" onClick={() => setDrawerOpen(false)} aria-label="메뉴 닫기" className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700">
              <X className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {sections.slice(0, 4).map((section) => {
              const accent = sectionAccent[section.id as keyof typeof sectionAccent] ?? sectionAccent['common-menu'];
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setManualSectionId(section.id)}
                  className={segmentStyles({
                    active: activeSectionId === section.id,
                    className: `min-h-11 rounded-xl px-2 py-2 text-center text-xs font-semibold leading-tight ${activeSectionId === section.id ? accent.mobile : ''}`
                  })}
                >
                  {sectionButtonLabel(section.label)}
                </button>
              );
            })}
          </div>

          {activeSection ? (
            <div className="mt-3 grid gap-2">
              {activeSection.id === 'company-management-menu' ? (
                <button
                  type="button"
                  onClick={() => onToggleSection(activeSection.id)}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-900"
                >
                  <span>회사 관리 {isActiveSectionCollapsed ? '펼치기' : '접기'}</span>
                  <span className="text-lg leading-none">{isActiveSectionCollapsed ? '+' : '-'}</span>
                </button>
              ) : null}

              {!isActiveSectionCollapsed ? activeSection.items.map((item) => {
                const accent = sectionAccent[activeSection.id as keyof typeof sectionAccent] ?? sectionAccent['common-menu'];
                const badge = item.badge;
                return (
                  <Link
                    key={item.href}
                    href={item.href as Route}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition-colors duration-150 ${
                      pathname === item.href || pathname.startsWith(`${item.href}/`)
                        ? accent.active
                        : item.emphasize || (hasUnreadNotifications && activeSection.id === 'common-menu' && item.href === '/notifications')
                          ? 'border-amber-300 bg-amber-50/80 text-slate-900'
                          : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <item.icon className="size-4" />
                    <span className="flex-1">{item.label}</span>
                    {badge && badge.count > 0 ? (
                      <span
                        className={`min-w-[1.25rem] rounded-full px-2 py-0.5 text-center text-[11px] font-semibold tabular-nums ${
                          badge.variant === 'urgent' ? 'bg-red-500 text-white' : 'bg-sky-600 text-white'
                        }`}
                      >
                        {badge.count > 99 ? '99+' : badge.count}
                      </span>
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                    )}
                  </Link>
                );
              }) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ModeAwareNav({
  memberships,
  profile,
  platformOrganizations = [],
  initialMode = null,
  unreadNotificationCount = 0,
  actionRequiredCount = 0,
  unreadConversationCount = 0
}: {
  memberships: Membership[];
  profile: Profile;
  platformOrganizations?: OrganizationOption[];
  initialMode?: ModeKey | null;
  unreadNotificationCount?: number;
  actionRequiredCount?: number;
  unreadConversationCount?: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navCounts, setNavCounts] = useState<NavUnreadCounts>({
    unreadCount: unreadNotificationCount,
    actionRequiredCount,
    unreadConversationCount
  });
  const [pulseNotification, setPulseNotification] = useState(false);
  const [pulseConversation, setPulseConversation] = useState(false);
  const [orgPickerOpen, setOrgPickerOpen] = useState(false);
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<string[]>(['company-management-menu']);
  const { success } = useToast();

  const isModeKey = (value: string | null | undefined): value is ModeKey => (
    value === 'law_admin'
    || value === 'collection_admin'
    || value === 'other_admin'
    || value === 'organization_staff'
    || value === 'client_communication'
  );

  const basePlatformMembership = memberships.find((membership) => membership.organization_id === profile.default_organization_id) ?? memberships[0] ?? null;
  const [mode, setMode] = useState<ModeKey>(() => {
    if (isModeKey(initialMode)) return initialMode;
    return getDefaultMode(basePlatformMembership?.organization?.kind, Boolean(basePlatformMembership && isManagementRole(basePlatformMembership.role)));
  });

  const currentOrgMembership = useMemo(() => basePlatformMembership, [basePlatformMembership]);
  const currentOrganization = useMemo(
    () => currentOrgMembership?.organization
      ?? platformOrganizations.find((organization) => organization.id === profile.default_organization_id)
      ?? memberships[0]?.organization
      ?? null,
    [currentOrgMembership, memberships, platformOrganizations, profile.default_organization_id]
  );

  const managerDefaultMode = getDefaultMode(
    currentOrganization?.kind,
    Boolean(currentOrgMembership && isManagementRole(currentOrgMembership.role))
  );

  const sectionMembership = currentOrgMembership;
  const sections = useMemo(
    () => getOrganizationSections({
      membership: sectionMembership,
      mode,
      unreadNotificationCount: navCounts.unreadCount,
      actionRequiredCount: navCounts.actionRequiredCount,
      unreadConversationCount: navCounts.unreadConversationCount,
      pulseNotification,
      pulseConversation
    }),
    [sectionMembership, mode, navCounts, pulseNotification, pulseConversation]
  );

  const baseRoleLabel = mode === 'client_communication' ? '의뢰인' : '구성원';
  const roleDetail = getRoleLabel(currentOrgMembership, baseRoleLabel);
  const displayName = profile.full_name;
  const hasUnreadNotifications = navCounts.unreadCount > 0 || navCounts.actionRequiredCount > 0;

  const orgOptions = useMemo(() => {
    if (platformOrganizations.length) {
      return platformOrganizations.map((organization) => ({ id: organization.id, name: organization.name }));
    }
    return memberships.map((membership) => ({
      id: membership.organization_id,
      name: membership.organization?.name ?? membership.organization_id
    }));
  }, [memberships, platformOrganizations]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    const syncUnreadCounts = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      try {
        const response = await fetch('/api/nav/unread-counts', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json() as Partial<NavUnreadCounts>;
        if (cancelled) return;

        setNavCounts((prev) => {
          const next: NavUnreadCounts = {
            unreadCount: typeof payload.unreadCount === 'number' ? payload.unreadCount : prev.unreadCount,
            actionRequiredCount: typeof payload.actionRequiredCount === 'number' ? payload.actionRequiredCount : prev.actionRequiredCount,
            unreadConversationCount: typeof payload.unreadConversationCount === 'number' ? payload.unreadConversationCount : prev.unreadConversationCount
          };

          const notificationDelta = next.unreadCount - prev.unreadCount;
          const conversationDelta = next.unreadConversationCount - prev.unreadConversationCount;

          if (notificationDelta > 0) {
            setPulseNotification(true);
            success(`새 알림 ${notificationDelta}건이 도착했습니다.`);
            window.setTimeout(() => setPulseNotification(false), 3200);
          }

          if (conversationDelta > 0) {
            setPulseConversation(true);
            success(`새 대화 ${conversationDelta}건이 도착했습니다.`);
            window.setTimeout(() => setPulseConversation(false), 3200);
          }

          if (
            prev.unreadCount === next.unreadCount
            && prev.actionRequiredCount === next.actionRequiredCount
            && prev.unreadConversationCount === next.unreadConversationCount
          ) {
            return prev;
          }

          return next;
        });
      } catch {
        // keep current counts when polling fails
      }
    };

    void syncUnreadCounts();
    intervalId = window.setInterval(() => {
      void syncUnreadCounts();
    }, 45000);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [success]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const key = `profile-completeness-reminder:${profile.id}:${currentOrganization?.id ?? 'none'}`;
    if (typeof window === 'undefined') return;

    try {
      if (window.localStorage.getItem(key) === today) return;
      window.localStorage.setItem(key, today);
    } catch {
      return;
    }

    void fetch('/api/profile-completeness/reminder', {
      method: 'POST',
      cache: 'no-store'
    }).catch(() => undefined);
  }, [profile.id, currentOrganization?.id]);

  useEffect(() => {
    setMode(managerDefaultMode);
  }, [managerDefaultMode]);

  useEffect(() => {
    const activeMode = mode;
    document.cookie = `${ACTIVE_VIEW_MODE_COOKIE}=${activeMode}; path=/; max-age=31536000; samesite=lax`;
  }, [mode, pathname]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSectionIds((current) => (
      current.includes(sectionId)
        ? current.filter((item) => item !== sectionId)
        : [...current, sectionId]
    ));
  };
  const currentPathWithSearch = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;

  return (
    <div className="space-y-3">
      <MobileSectionBar
        sections={sections}
        pathname={pathname}
        currentOrgMembership={currentOrgMembership}
        baseRoleLabel={baseRoleLabel}
        currentOrganization={currentOrganization}
        organizationOptions={orgOptions}
        hasUnreadNotifications={hasUnreadNotifications}
        collapsedSectionIds={collapsedSectionIds}
        onToggleSection={toggleSection}
      />

      <div className="hidden lg:block lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
        <div className="flex h-full flex-col gap-3">
          <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f4f8fc)] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.10)]">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">조직</p>
              <button
                type="button"
                aria-label={`조직 전환: ${currentOrganization?.name ?? '선택된 조직 없음'}`}
                onClick={() => setOrgPickerOpen((prev) => !prev)}
                className="mt-1 inline-flex items-center gap-2 text-left text-2xl font-semibold tracking-tight text-slate-950 hover:text-slate-700"
              >
                {currentOrganization?.name ?? '선택된 조직 없음'}
                {orgPickerOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
              {orgPickerOpen ? (
                <ClientActionForm
                  action={switchDefaultOrganizationAction}
                  successTitle="조직이 전환되었습니다."
                  onSuccess={() => {
                    window.location.assign(currentPathWithSearch);
                  }}
                  className="mt-3 flex items-center gap-2"
                >
                  <input type="hidden" name="contextOrganizationId" value={currentOrganization?.id ?? ''} />
                  <select
                    aria-label="전환할 조직 선택"
                    name="organizationId"
                    defaultValue={currentOrganization?.id ?? orgOptions[0]?.id}
                    className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
                  >
                    {orgOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                  <SubmitButton variant="secondary" pendingLabel="변경 중..." className="h-10 px-3 text-sm">
                    변경
                  </SubmitButton>
                </ClientActionForm>
              ) : null}
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">사용자</p>
                <Link
                  href={'/settings/team/self' as Route}
                  aria-label="본인 정보 변경"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  ⚙️
                </Link>
              </div>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{displayName}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">직책</p>
              <p className="mt-1 text-lg font-medium text-slate-800">{roleDetail}</p>
            </div>
          </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden rounded-[1.3rem] border border-slate-200 bg-white p-2 shadow-[0_18px_42px_rgba(15,23,42,0.10)]">
            <div className="h-full space-y-2 overflow-y-auto pr-1">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className={`rounded-[1.05rem] border p-2 ${
                    section.id === 'common-menu' && hasUnreadNotifications
                      ? 'border-amber-300 bg-amber-50/65'
                      : sectionAccent[section.id as keyof typeof sectionAccent]?.soft ?? 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 px-2.5 py-1.5">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{section.label}</p>
                      {section.id === 'common-menu' && hasUnreadNotifications ? (
                        <p className="mt-0.5 text-[11px] font-medium text-amber-700">새 알림을 확인하세요!</p>
                      ) : null}
                    </div>
                    {section.id === 'company-management-menu' ? (
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        aria-label={collapsedSectionIds.includes(section.id) ? '회사 관리 메뉴 펼치기' : '회사 관리 메뉴 접기'}
                        className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-base font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {collapsedSectionIds.includes(section.id) ? '+' : '-'}
                      </button>
                    ) : null}
                  </div>
                  {!collapsedSectionIds.includes(section.id) ? (
                    <div className="mt-1 space-y-1">
                      {section.items.map((item) => (
                        <ModeNavItem
                          key={item.href}
                          href={item.href}
                          label={item.label}
                          icon={item.icon}
                          sectionId={section.id}
                          active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                          pulse={Boolean(item.pulse)}
                          emphasize={Boolean(item.emphasize)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Rule 4-2: 인라인 토스트 제거 — useToast()로 대체 완료 */}
    </div>
  );
}
