'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, BellRing, Boxes, Building2, CalendarRange, ChevronDown, ChevronRight, ClipboardList, FileText, LayoutDashboard, LifeBuoy, MessageSquareText, ReceiptText, Settings, ShieldCheck, Users, Wallet } from 'lucide-react';
import { ModeSwitcher, getDefaultMode, getOrganizationAdminMode, type ModeKey } from '@/components/mode-switcher';
import { Button, segmentStyles } from '@/components/ui/button';
import type { Membership, OrganizationOption, Profile } from '@/lib/types';
import { ACTIVE_VIEW_MODE_COOKIE, isPlatformAdminOnlyPath } from '@/lib/view-mode';
import { PLATFORM_SCENARIO_MEMBER_STORAGE_KEY, PLATFORM_SCENARIO_ORGANIZATIONS, PLATFORM_SCENARIO_TEAM, isPlatformScenarioMode } from '@/lib/platform-scenarios';

const PLATFORM_WORK_MODE_STORAGE_KEY = 'vs_platform_admin_work_mode';

type NavBadge = { count: number; variant?: 'default' | 'urgent' };
type NavItem = { href: string; label: string; icon: React.ComponentType<any>; badge?: NavBadge | null; pulse?: boolean };
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
  },
  'extra-modules': {
    soft: 'border-rose-200 bg-rose-50/75',
    active: 'border-rose-300 bg-rose-50 text-slate-950 shadow-[0_12px_24px_rgba(244,63,94,0.10)]',
    icon: 'bg-rose-100 text-rose-700',
    dot: 'bg-rose-500',
    mobile: 'bg-rose-600'
  }
} as const;

function isManagementRole(role?: string | null) {
  return role === 'org_owner' || role === 'org_manager';
}

function kindLabel(kind?: string | null) {
  if (kind === 'law_firm') return '법률/법무 조직';
  if (kind === 'collection_company') return '채권추심 조직';
  if (kind === 'mixed_practice') return '법률·추심 복합 조직';
  if (kind === 'corporate_legal_team') return '기업 법무 조직';
  return '협업 조직';
}

function enabledModuleLabels(enabledModules?: Record<string, boolean> | null) {
  if (!enabledModules) return [];

  return [
    enabledModules.client_portal ? '의뢰인 포털' : null,
    enabledModules.collections ? '추심 운영' : null,
    enabledModules.reports ? '성과 리포트' : null,
    enabledModules.billing ? '비용/정산' : null
  ].filter(Boolean) as string[];
}

function roleViewLabel(mode: ModeKey, profile: Profile) {
  if (mode === 'platform_admin') return '플랫폼 관리자';
  if (mode === 'organization_staff' && profile.platform_role === 'platform_admin') return '직원';
  if (mode === 'law_admin' || mode === 'collection_admin' || mode === 'other_admin') return '가상직원 시야';
  if (mode === 'organization_staff') return '직원';
  if (mode === 'client_communication') return '의뢰인 시야';
  return profile.platform_role === 'platform_support' ? '플랫폼 지원' : '조직 사용자';
}

function contextLabel(mode: ModeKey, membership: Membership | null) {
  if (mode === 'platform_admin') return '플랫폼 운영';
  if (mode === 'organization_staff' && membership?.organization?.name) return '직원 업무 시야';
  if (mode === 'organization_staff') return kindLabel(membership?.organization?.kind);
  if (mode === 'client_communication') return '의뢰인 협업';
  if (mode === 'collection_admin') return '채권추심 조직';
  if (mode === 'law_admin') return '법률/법무 조직';
  if (mode === 'other_admin') return '기타 조직';
  return kindLabel(membership?.organization?.kind);
}

function toMembershipShape(organization: OrganizationOption | null | undefined): Membership | null {
  if (!organization) return null;

  return {
    id: organization.id,
    organization_id: organization.id,
    role: 'org_manager',
    status: 'active',
    title: null,
    organization
  };
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

function getOrganizationSections({
  membership,
  profile,
  mode,
  unreadNotificationCount = 0,
  actionRequiredCount = 0,
  unreadConversationCount = 0,
  pulseNotification = false,
  pulseConversation = false
}: {
  membership: Membership | null;
  profile: Profile;
  mode: ModeKey;
  unreadNotificationCount?: number;
  actionRequiredCount?: number;
  unreadConversationCount?: number;
  pulseNotification?: boolean;
  pulseConversation?: boolean;
}) {
  const enabledModules = membership?.organization?.enabled_modules ?? {};
  const isPlatformAdminView = mode === 'platform_admin';
  const isPlatformStaffView = profile.platform_role === 'platform_admin' && mode === 'organization_staff';
  const isClientView = mode === 'client_communication';
  const effectiveKind = mode === 'collection_admin' ? 'collection_company' : mode === 'law_admin' ? 'law_firm' : membership?.organization?.kind ?? 'other';
  const isCollectionOrgView = mode === 'collection_admin' || effectiveKind === 'collection_company';
  const notificationBadge: NavBadge | null =
    actionRequiredCount > 0
      ? { count: actionRequiredCount, variant: 'urgent' }
      : unreadNotificationCount > 0
        ? { count: unreadNotificationCount, variant: 'default' }
        : null;
  const conversationBadge: NavBadge | null = unreadConversationCount > 0 ? { count: unreadConversationCount, variant: 'default' } : null;
  const commonItems = uniqueItems([
    { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
    ...(!isPlatformAdminView ? [{ href: '/cases', label: '사건 보기', icon: FileText }] : []),
    ...(!isPlatformAdminView && !isClientView ? [{ href: '/inbox', label: '오늘 할 일', icon: ClipboardList, badge: conversationBadge, pulse: pulseConversation }] : []),
    { href: '/notifications', label: '알림 센터', icon: BellRing, badge: notificationBadge, pulse: pulseNotification },
    { href: '/calendar', label: '일정 확인', icon: CalendarRange },
    ...(!isPlatformAdminView && !isClientView && !isCollectionOrgView ? [{ href: '/billing', label: '비용 관련', icon: Wallet }] : []),
    { href: '/documents', label: '승인/검토', icon: ReceiptText }
  ]);
  const organizationItems: NavItem[] = [];
  const collaborationItems: NavItem[] = [];
  const companyManagementItems: NavItem[] = [];
  const extraItems: NavItem[] = [];

  if (isPlatformAdminView) {
    organizationItems.push(
      { href: '/admin/organization-requests', label: '조직 개설 검토', icon: Building2 },
      { href: '/admin/modules', label: '추가 모듈', icon: Boxes },
      { href: '/admin/support', label: '지원 요청 관리', icon: LifeBuoy },
      { href: '/settings/platform', label: '플랫폼 설정', icon: Settings },
      { href: '/organizations', label: '조직 참여 현황', icon: Building2 },
      { href: '/clients', label: '의뢰인 연결 현황', icon: Users }
    );
  } else if (isPlatformStaffView) {
    organizationItems.push(
      { href: '/cases', label: '사건/업무 보기', icon: FileText },
      { href: '/clients', label: '고객/의뢰인 보기', icon: Users },
      { href: '/reports', label: '리포트 보기', icon: BarChart3 },
      { href: '/settings/organization', label: '조직 설정 보기', icon: Settings }
    );
  } else if (isClientView) {
    organizationItems.push(
      { href: '/portal', label: '의뢰인 홈', icon: LayoutDashboard },
      { href: '/portal/cases', label: '내 사건', icon: FileText },
      { href: '/portal/messages', label: '사건 소통', icon: MessageSquareText },
      { href: '/portal/notifications', label: '알림 확인', icon: BellRing }
    );
  } else if (mode === 'collection_admin' || effectiveKind === 'collection_company') {
    organizationItems.push(
      { href: '/collections', label: '추심 대시보드', icon: LayoutDashboard },
      { href: '/cases', label: '추심 사건 보기', icon: FileText },
      { href: '/billing', label: '약정 및 회수금 관리', icon: Wallet },
      { href: '/documents', label: '법률 실행/자료 관리', icon: ReceiptText },
      { href: '/clients', label: '의뢰인/외부 협업', icon: Users },
      { href: '/reports', label: '회수 실적 보기', icon: BarChart3 }
    );
  } else if (mode === 'law_admin') {
    organizationItems.push(
      { href: '/cases', label: '사건 목록', icon: FileText },
      { href: '/clients', label: '의뢰인 관리', icon: Users },
      { href: '/reports', label: '미정 1', icon: BarChart3 },
      { href: '/settings/organization', label: '미정 2', icon: Settings }
    );
  } else if (effectiveKind === 'mixed_practice') {
    organizationItems.push(
      { href: '/cases', label: '사건/업무 보드', icon: FileText },
      { href: '/clients', label: '고객/의뢰인 관리', icon: Users },
      { href: '/reports', label: '성과 리포트', icon: BarChart3 },
      { href: '/collections', label: '추심 운영', icon: Wallet }
    );
  } else if (mode === 'other_admin') {
    organizationItems.push(
      { href: '/cases', label: '업무 현황판', icon: FileText },
      { href: '/clients', label: '고객 관리', icon: Users },
      { href: '/reports', label: '성과 리포트', icon: BarChart3 },
      { href: '/settings/organization', label: '운영 기준 설정', icon: Settings }
    );
  } else if (effectiveKind === 'law_firm' || effectiveKind === 'corporate_legal_team') {
    organizationItems.push(
      { href: '/cases', label: '사건 목록', icon: FileText },
      { href: '/clients', label: '의뢰인 관리', icon: Users },
      { href: '/reports', label: '미정 1', icon: BarChart3 },
      { href: '/settings/organization', label: '미정 2', icon: Settings }
    );
  } else {
    organizationItems.push(
      { href: '/cases', label: '업무 현황판', icon: FileText },
      { href: '/clients', label: '고객 관리', icon: Users },
      { href: '/reports', label: '성과 리포트', icon: BarChart3 },
      { href: '/settings/organization', label: '운영 기준 설정', icon: Settings }
    );
  }

  if (!isPlatformAdminView) {
    if (isCollectionOrgView) {
      collaborationItems.push(
        { href: '/inbox', label: '전달/회신 확인', icon: ClipboardList, badge: conversationBadge },
        { href: '/client-access', label: '의뢰인 협업 요청', icon: MessageSquareText },
        { href: '/organizations', label: '외부 협업 찾기', icon: Building2 }
      );
    } else {
      collaborationItems.push(
        { href: '/organizations', label: '조직 검색하기', icon: Building2 },
        { href: '/clients', label: '의뢰인 연결 보기', icon: Users },
        { href: '/inbox', label: '협업 소통함', icon: ClipboardList, badge: conversationBadge },
        { href: '/documents', label: '약정/협업 문서', icon: ReceiptText }
      );
    }
  }

  if (enabledModules.collections && !organizationItems.some((item) => item.href === '/collections')) {
    extraItems.push({ href: '/collections', label: '추가 모듈 · 추심 운영', icon: Wallet });
  }
  if (enabledModules.reports && !organizationItems.some((item) => item.href === '/reports')) {
    extraItems.push({ href: '/reports', label: '추가 모듈 · 성과 리포트', icon: BarChart3 });
  }
  const canManageMembership = Boolean(membership && isManagementRole(membership.role));
  const showOperations = mode === 'law_admin' || mode === 'collection_admin' || mode === 'other_admin' || (mode === 'organization_staff' ? false : canManageMembership);

  if (showOperations) {
    companyManagementItems.push(
      { href: '/settings/organization', label: '조직 설정', icon: Settings },
      { href: '/settings/team', label: '구성원 관리', icon: Building2 },
      ...(canManageMembership ? [{ href: '/admin/support', label: '지원 요청 관리', icon: LifeBuoy }] : [])
    );
  }

  const sections: NavSection[] = [{ id: 'common-menu', label: '공통 메뉴', items: commonItems }];

  if (organizationItems.length) {
    sections.push({ id: 'organization-menu', label: '조직 메뉴', items: uniqueItems(organizationItems) });
  }

  if (collaborationItems.length) {
    sections.push({ id: 'collaboration-menu', label: '협업 메뉴', items: uniqueItems(collaborationItems) });
  }

  if (companyManagementItems.length) {
    sections.push({ id: 'company-management-menu', label: '회사 관리', items: uniqueItems(companyManagementItems) });
  }

  if (extraItems.length) {
    sections.push({ id: 'extra-modules', label: '추가 메뉴', items: uniqueItems(extraItems) });
  }

  return sections;
}

function ModeNavItem({
  href,
  label,
  icon: Icon,
  active,
  sectionId,
  badge,
  pulse = false
}: {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  active: boolean;
  sectionId: string;
  badge?: NavBadge | null;
  pulse?: boolean;
}) {
  const accent = sectionAccent[sectionId as keyof typeof sectionAccent] ?? sectionAccent['common-menu'];
  return (
    <Link
      href={href as Route}
      className={`inline-flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition duration-200 ${
        active
          ? accent.active
          : 'border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950'
      }`}
    >
      <span className={`inline-flex size-8 items-center justify-center rounded-lg ${active ? accent.icon : 'bg-slate-100 text-slate-500'} ${pulse ? 'animate-pulse' : ''}`}>
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

function createExpandedSections(sections: NavSection[]) {
  return Object.fromEntries(sections.map((section) => [section.id, true]));
}

function sectionButtonLabel(label: string) {
  return label.replace(' 메뉴', '').replace(' 관리', '관리');
}

function MobileSectionBar({
  sections,
  pathname,
  currentOrgMembership,
  baseRoleLabel,
  currentOrganizationName
}: {
  sections: NavSection[];
  pathname: string;
  currentOrgMembership: Membership | null;
  baseRoleLabel: string;
  currentOrganizationName: string;
}) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? 'common-menu');
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0] ?? null;

  useEffect(() => {
    if (!sections.some((section) => section.id === activeSectionId)) {
      queueMicrotask(() => {
        setActiveSectionId(sections[0]?.id ?? 'common-menu');
      });
    }
  }, [sections, activeSectionId]);

  useEffect(() => {
    const nextSectionId = resolveSectionIdByPath(sections, pathname);
    if (nextSectionId !== activeSectionId) {
      queueMicrotask(() => {
        setActiveSectionId(nextSectionId);
      });
    }
  }, [sections, pathname, activeSectionId]);

  return (
    <div className="space-y-3 lg:hidden">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.10)]">
        <p className="text-lg font-semibold tracking-tight text-slate-950">{currentOrganizationName || currentOrgMembership?.organization?.name || '협업 조직'}</p>
        <p className="mt-1 text-sm text-slate-600">{baseRoleLabel}</p>
      </div>
      <div className="fixed inset-x-3 bottom-3 z-40 rounded-[1.5rem] border border-slate-200/80 bg-white/94 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-md">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {sections.slice(0, 4).map((section) => (
            (() => {
              const accent = sectionAccent[section.id as keyof typeof sectionAccent] ?? sectionAccent['common-menu'];
              return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSectionId(section.id)}
              className={segmentStyles({
                active: activeSectionId === section.id,
                className: `min-h-11 rounded-2xl px-3 py-2.5 text-center text-xs font-semibold leading-tight ${activeSectionId === section.id ? accent.mobile : ''}`
              })}
            >
              {sectionButtonLabel(section.label)}
            </button>
              );
            })()
          ))}
        </div>
        {activeSection ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {activeSection.items.map((item) => (
              (() => {
                const accent = sectionAccent[activeSection.id as keyof typeof sectionAccent] ?? sectionAccent['common-menu'];
                const badge = item.badge;
                return (
              <Link
                key={item.href}
                href={item.href as Route}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition ${pathname === item.href || pathname.startsWith(`${item.href}/`) ? accent.active : 'border-slate-200 bg-white text-slate-700'}`}
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
              })()
            ))}
          </div>
        ) : null}
      </div>
      <div className="h-52" />
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
  const router = useRouter();
  const [navCounts, setNavCounts] = useState<NavUnreadCounts>({
    unreadCount: unreadNotificationCount,
    actionRequiredCount,
    unreadConversationCount
  });
  const [pulseNotification, setPulseNotification] = useState(false);
  const [pulseConversation, setPulseConversation] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isModeKey = (value: string | null | undefined): value is ModeKey => (
    value === 'platform_admin'
    || value === 'law_admin'
    || value === 'collection_admin'
    || value === 'other_admin'
    || value === 'organization_staff'
    || value === 'client_communication'
  );
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const basePlatformMembership = memberships.find((membership) => membership.organization_id === profile.default_organization_id) ?? memberships[0] ?? null;
  const [mode, setMode] = useState<ModeKey>(() => {
    if (isModeKey(initialMode)) {
      return initialMode;
    }

    const baseMode = getDefaultMode(
      profile.platform_role ?? 'standard',
      basePlatformMembership?.organization?.kind,
      Boolean(basePlatformMembership && isManagementRole(basePlatformMembership.role))
    );
    return profile.platform_role === 'platform_admin' ? 'organization_staff' : baseMode;
  });
  const activeScenarioOrganization = useMemo(
    () => profile.platform_role === 'platform_admin' && (mode === 'law_admin' || mode === 'collection_admin' || mode === 'other_admin')
      ? PLATFORM_SCENARIO_ORGANIZATIONS[mode]
      : null,
    [mode, profile.platform_role]
  );
  const currentOrgMembership = useMemo(
    () => profile.platform_role === 'platform_admin' && (mode === 'platform_admin' || mode === 'organization_staff')
      ? basePlatformMembership
      : profile.platform_role === 'platform_admin'
        ? toMembershipShape(activeScenarioOrganization)
        : basePlatformMembership,
    [activeScenarioOrganization, basePlatformMembership, mode, profile.platform_role]
  );
  const currentOrganization = useMemo(
    () => currentOrgMembership?.organization
      ?? activeScenarioOrganization
      ?? platformOrganizations.find((organization) => organization.id === profile.default_organization_id)
      ?? memberships[0]?.organization
      ?? null,
    [activeScenarioOrganization, currentOrgMembership, memberships, platformOrganizations, profile.default_organization_id]
  );
  const managerDefaultMode = getDefaultMode(
    profile.platform_role ?? 'standard',
    currentOrganization?.kind,
    Boolean(currentOrgMembership && isManagementRole(currentOrgMembership.role))
  );
  const [platformSetupOpen, setPlatformSetupOpen] = useState(false);
  const [platformSetupMode, setPlatformSetupMode] = useState<ModeKey>('platform_admin');
  const [selectedScenarioMemberId, setSelectedScenarioMemberId] = useState('');
  const sectionMembership = useMemo(
    () => currentOrgMembership ?? toMembershipShape(currentOrganization),
    [currentOrgMembership, currentOrganization]
  );
  const sections = useMemo(
    () =>
      getOrganizationSections({
        membership: sectionMembership,
        profile,
        mode,
        unreadNotificationCount: navCounts.unreadCount,
        actionRequiredCount: navCounts.actionRequiredCount,
        unreadConversationCount: navCounts.unreadConversationCount,
        pulseNotification,
        pulseConversation
      }),
    [sectionMembership, profile, mode, navCounts, pulseNotification, pulseConversation]
  );
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => createExpandedSections(sections));
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? 'common-menu');
  const scenarioMembers = profile.platform_role === 'platform_admin' && isPlatformScenarioMode(mode) ? PLATFORM_SCENARIO_TEAM[mode] : [];
  const selectedScenarioMember = scenarioMembers.find((member) => member.id === selectedScenarioMemberId) ?? scenarioMembers[0] ?? null;
  const baseRoleLabel = selectedScenarioMember?.title ?? roleViewLabel(mode, profile);
  const organizationLabel = contextLabel(mode, sectionMembership);
  const moduleLabels = mode === 'platform_admin' || mode === 'client_communication' ? [] : enabledModuleLabels(currentOrganization?.enabled_modules);
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0] ?? null;
  const isPlatformAdminMode = profile.platform_role === 'platform_admin' && mode === 'platform_admin';
  const currentModeAccent =
    mode === 'platform_admin'
      ? 'border-blue-200 bg-blue-50 text-blue-800'
      : mode === 'law_admin'
        ? 'border-violet-200 bg-violet-50 text-violet-800'
        : mode === 'collection_admin'
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : mode === 'client_communication'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : mode === 'other_admin'
              ? 'border-teal-200 bg-teal-50 text-teal-800'
              : 'border-slate-200 bg-slate-100 text-slate-800';
  const displayName = selectedScenarioMember?.name ?? profile.full_name;

  useEffect(() => {
    let cancelled = false;

    const syncUnreadCounts = async () => {
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
            setToastMessage(`새 알림 ${notificationDelta}건이 도착했습니다.`);
            window.setTimeout(() => setPulseNotification(false), 3200);
            window.setTimeout(() => setToastMessage(null), 2600);
          }

          if (conversationDelta > 0) {
            setPulseConversation(true);
            setToastMessage(`새 대화 ${conversationDelta}건이 도착했습니다.`);
            window.setTimeout(() => setPulseConversation(false), 3200);
            window.setTimeout(() => setToastMessage(null), 2600);
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
    const intervalId = window.setInterval(() => {
      void syncUnreadCounts();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setExpandedSections((prev) => {
        const next = createExpandedSections(sections);
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);

        if (prevKeys.length === nextKeys.length && nextKeys.every((key) => prev[key] === next[key])) {
          return prev;
        }

        return next;
      });
    });
  }, [sections]);

  useEffect(() => {
    if (!sections.some((section) => section.id === activeSectionId)) {
      queueMicrotask(() => {
        setActiveSectionId(sections[0]?.id ?? 'common-menu');
      });
    }
  }, [sections, activeSectionId]);

  useEffect(() => {
    if (profile.platform_role !== 'platform_admin' || !isPlatformScenarioMode(mode)) {
      queueMicrotask(() => {
        setSelectedScenarioMemberId('');
      });
      return;
    }

    const raw = window.localStorage.getItem(PLATFORM_SCENARIO_MEMBER_STORAGE_KEY);
    const savedSelections = raw ? JSON.parse(raw) as Record<string, string> : {};
    const nextMemberId = savedSelections[mode];
    const fallbackMemberId = PLATFORM_SCENARIO_TEAM[mode][0]?.id ?? '';
    queueMicrotask(() => {
      setSelectedScenarioMemberId(PLATFORM_SCENARIO_TEAM[mode].some((member) => member.id === nextMemberId) ? nextMemberId : fallbackMemberId);
    });
  }, [mode, profile.platform_role]);

  useEffect(() => {
    if (profile.platform_role !== 'platform_admin' || !isPlatformScenarioMode(mode) || !selectedScenarioMemberId) return;

    const raw = window.localStorage.getItem(PLATFORM_SCENARIO_MEMBER_STORAGE_KEY);
    const savedSelections = raw ? JSON.parse(raw) as Record<string, string> : {};
    savedSelections[mode] = selectedScenarioMemberId;
    window.localStorage.setItem(PLATFORM_SCENARIO_MEMBER_STORAGE_KEY, JSON.stringify(savedSelections));
  }, [mode, profile.platform_role, selectedScenarioMemberId]);

  useEffect(() => {
    if (profile.platform_role !== 'platform_admin') {
      queueMicrotask(() => {
        setPlatformSetupOpen(false);
        setMode(managerDefaultMode);
      });
      return;
    }
  }, [profile.platform_role, mode, currentOrganization?.kind, managerDefaultMode]);

  useEffect(() => {
    if (profile.platform_role !== 'platform_admin') return;

    const cookies = document.cookie.split(';').map((item) => item.trim());
    const activeModeCookie = cookies.find((item) => item.startsWith(`${ACTIVE_VIEW_MODE_COOKIE}=`))?.split('=')[1];
    const savedPlatformMode = window.localStorage.getItem(PLATFORM_WORK_MODE_STORAGE_KEY);
    const preferredMode = activeModeCookie === 'platform_admin'
      || activeModeCookie === 'organization_staff'
      || activeModeCookie === 'law_admin'
      || activeModeCookie === 'collection_admin'
      || activeModeCookie === 'other_admin'
      ? activeModeCookie
      : savedPlatformMode;
    const nextMode = preferredMode === 'platform_admin'
      || preferredMode === 'organization_staff'
      || preferredMode === 'law_admin'
      || preferredMode === 'collection_admin'
      || preferredMode === 'other_admin'
      ? preferredMode
      : 'organization_staff';

    queueMicrotask(() => {
      setPlatformSetupMode(nextMode);
      setMode(nextMode);
    });
  }, [profile.platform_role]);

  useEffect(() => {
    const activeMode = mode;
    document.cookie = `${ACTIVE_VIEW_MODE_COOKIE}=${activeMode}; path=/; max-age=31536000; samesite=lax`;

    if (profile.platform_role === 'platform_admin' && mode !== 'platform_admin') {
      window.localStorage.setItem(PLATFORM_WORK_MODE_STORAGE_KEY, mode);
    }

    if (profile.platform_role === 'platform_admin' && activeMode !== 'platform_admin' && isPlatformAdminOnlyPath(pathname)) {
      router.replace('/dashboard');
    }
  }, [mode, pathname, profile.platform_role, router]);

  return (
    <div className="space-y-3">
      <MobileSectionBar sections={sections} pathname={pathname} currentOrgMembership={currentOrgMembership} baseRoleLabel={baseRoleLabel} currentOrganizationName={currentOrganization?.name ?? ''} />
      <div className="hidden lg:block">
      <div className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f4f8fc)] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.10)]">
        {profile.platform_role === 'platform_admin' ? (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ShieldCheck className="size-4 text-emerald-600" /> 플랫폼 관리자 모드
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  {isPlatformAdminMode
                    ? '업무 특성: 플랫폼 관리자'
                    : '업무모드에서 플랫폼/직원/가상조직 시야를 선택한 뒤 활성화합니다.'}
                </p>
              </div>
              <Button
                variant={isPlatformAdminMode ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  if (isPlatformAdminMode) {
                    setMode(window.localStorage.getItem(PLATFORM_WORK_MODE_STORAGE_KEY) === 'law_admin'
                      || window.localStorage.getItem(PLATFORM_WORK_MODE_STORAGE_KEY) === 'collection_admin'
                      || window.localStorage.getItem(PLATFORM_WORK_MODE_STORAGE_KEY) === 'other_admin'
                      || window.localStorage.getItem(PLATFORM_WORK_MODE_STORAGE_KEY) === 'organization_staff'
                      ? window.localStorage.getItem(PLATFORM_WORK_MODE_STORAGE_KEY) as ModeKey
                      : 'organization_staff');
                    setPlatformSetupOpen(false);
                    return;
                  }

                  setPlatformSetupMode(mode);
                  setPlatformSetupOpen(true);
                }}
                className="min-w-18 rounded-full px-3"
              >
                {isPlatformAdminMode ? 'ON' : platformSetupOpen ? '설정중' : 'OFF'}
              </Button>
            </div>
            {platformSetupOpen ? (
              <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-3">
                <p className="text-sm font-semibold text-slate-900">플랫폼 관리자 ON 전에 사용할 시야를 먼저 선택하세요.</p>
                <p className="mt-1 text-xs text-slate-600">플랫폼 관리자와 직원모드는 베인을 유지하고, 나머지는 가상조직 시나리오로 전환됩니다.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    { key: 'platform_admin' as const, label: '플랫폼 관리자' },
                    { key: 'organization_staff' as const, label: '직원모드' },
                    { key: 'law_admin' as const, label: '법률/법무조직' },
                    { key: 'collection_admin' as const, label: '추심조직' },
                    { key: 'other_admin' as const, label: '기타조직' }
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setPlatformSetupMode(item.key)}
                      className={segmentStyles({
                        active: platformSetupMode === item.key,
                        className: 'rounded-xl px-3 py-2 text-sm font-semibold'
                      })}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setMode(platformSetupMode);
                      setPlatformSetupOpen(false);
                    }}
                  >
                    체크 완료
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPlatformSetupOpen(false)}>
                    닫기
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <div>
          <p className="text-xl font-semibold tracking-tight text-slate-950">{displayName}</p>
          <p className="mt-1 text-sm text-slate-600">{baseRoleLabel}</p>
          <div className="mt-3 space-y-3">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.08em] ${currentModeAccent}`}>
              {organizationLabel}
            </span>
            {moduleLabels.length ? (
              <div className="flex flex-wrap gap-2">
                {moduleLabels.map((label) => (
                  <span key={label} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-5 rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">현재 조직</p>
          <p className="mt-2 text-base font-semibold text-slate-950">{currentOrganization?.name ?? '선택된 조직 없음'}</p>
          <p className="mt-1 text-sm text-slate-600">
            {profile.platform_role === 'platform_admin' && isPlatformScenarioMode(mode)
              ? '플랫폼이 이해를 위해 구성한 가상조직 시나리오'
              : profile.platform_role === 'platform_admin' && mode === 'organization_staff'
                ? '플랫폼 운영에 사용하는 기본 조직'
                : '플랫폼 기준 기본 조직'}
          </p>
        </div>
        {profile.platform_role === 'platform_admin' && isPlatformScenarioMode(mode) ? (
          <div className="mt-4 rounded-[1.4rem] border border-violet-200 bg-violet-50/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700">가상직원 선택</p>
                <p className="mt-1 text-sm text-slate-700">관리자/조직원 구분 없이, 지금 보고 싶은 사람 기준으로 시야를 고릅니다.</p>
              </div>
              {selectedScenarioMember ? <span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-700">현재: {selectedScenarioMember.name}</span> : null}
            </div>
            <div className="mt-3 grid gap-2">
              {scenarioMembers.map((member) => {
                const isActive = selectedScenarioMember?.id === member.id;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedScenarioMemberId(member.id)}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${isActive ? 'border-violet-300 bg-white shadow-sm' : 'border-violet-100 bg-white/70 hover:border-violet-200 hover:bg-white'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{member.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{member.title}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700'}`}>{isActive ? '선택됨' : '선택'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {profile.platform_role === 'platform_admin' ? (
          <div className="mt-4">
            <ModeSwitcher
              platformRole={profile.platform_role}
              mode={mode}
              onChange={(nextMode) => {
                setMode(nextMode);
              }}
            />
          </div>
        ) : null}
      </div>
      <div className="mt-3 rounded-[1.4rem] border border-slate-200 bg-white p-2 shadow-[0_18px_42px_rgba(15,23,42,0.10)]">
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 rounded-[1.1rem] border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.99]"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">메뉴</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{mode === 'platform_admin' ? '플랫폼 메뉴' : currentOrganization?.name ?? '협업 메뉴'}</p>
          </div>
          <span className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            {isMenuOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </span>
        </button>

        {isMenuOpen ? (
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2 rounded-[1.15rem] border border-slate-200 bg-slate-50 p-2">
              {sections.map((section) => {
                const accent = sectionAccent[section.id as keyof typeof sectionAccent] ?? sectionAccent['common-menu'];
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSectionId(section.id)}
                    className={segmentStyles({
                      active: activeSectionId === section.id,
                      className: `rounded-xl px-3 py-2.5 text-sm font-semibold ${activeSectionId === section.id ? accent.mobile : ''}`
                    })}
                  >
                    {sectionButtonLabel(section.label)}
                  </button>
                );
              })}
            </div>
            {activeSection ? (
              <div className={`rounded-[1.15rem] border p-2 ${sectionAccent[activeSection.id as keyof typeof sectionAccent]?.soft ?? 'border-slate-200 bg-slate-50'}`}>
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-slate-900">{activeSection.label}</p>
                  <p className="mt-1 text-xs text-slate-500">선택한 메뉴군의 항목만 표시합니다.</p>
                </div>
                <div className="mt-1 space-y-1">
                  {activeSection.items.map((item) => (
                    <ModeNavItem
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      sectionId={activeSection.id}
                      active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                      pulse={Boolean(item.pulse)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      </div>
      {toastMessage ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-[0_10px_28px_rgba(15,23,42,0.32)]">
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}
