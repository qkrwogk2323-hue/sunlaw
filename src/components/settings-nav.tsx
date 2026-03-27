'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast-provider';
import { LockIcon } from 'lucide-react';
import { NAVIGATION_MAP } from '@/lib/routes/navigation-map';

const items: { href: Route; label: string; platformOnly?: boolean; adminOnly?: boolean }[] = [
  { href: NAVIGATION_MAP.settingsOverview, label: '개요' },
  { href: NAVIGATION_MAP.settingsTeam, label: '구성원 관리', adminOnly: true },
  { href: NAVIGATION_MAP.settingsOrganization, label: '조직 설정', adminOnly: true },
  { href: NAVIGATION_MAP.settingsContent, label: '문구 관리', adminOnly: true },
  // 아래 두 항목은 플랫폼 관리자 전용 (일반 조직 메뉴에 노출 금지)
  { href: NAVIGATION_MAP.settingsSubscription, label: '구독 관리', platformOnly: true },
  { href: NAVIGATION_MAP.settingsFeatures, label: '기능 설정', platformOnly: true }
];

export function SettingsNav({
  currentPath,
  canViewPlatformControls = false,
  isWorkspaceAdmin = false
}: {
  currentPath: string;
  canViewPlatformControls?: boolean;
  isWorkspaceAdmin?: boolean;
}) {
  const { error } = useToast();
  const visibleItems = items.filter((item) => !item.platformOnly || canViewPlatformControls);

  const handleAdminOnlyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    error('접근이 제한되었습니다.', {
      message: '이 메뉴는 조직 관리자만 접근할 수 있습니다. 관리자에게 권한을 요청해 주세요.'
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {visibleItems.map((item) => {
        const active = currentPath === item.href;
        const disabled = item.adminOnly && !isWorkspaceAdmin;

        if (disabled) {
          return (
            <button
              key={item.href}
              onClick={handleAdminOnlyClick}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400 cursor-not-allowed hover:bg-slate-200 transition"
              aria-label={`${item.label} (관리자 전용)`}
            >
              <LockIcon className="h-3.5 w-3.5 opacity-70" />
              {item.label}
            </button>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              active
                ? 'bg-sky-700 text-white ring-1 ring-sky-700 shadow-[0_10px_22px_rgba(3,105,161,0.18)]'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
