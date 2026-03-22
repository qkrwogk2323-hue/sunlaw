import type { Route } from 'next';
import Link from 'next/link';

const items: { href: Route; label: string }[] = [
  { href: '/settings', label: '개요' },
  { href: '/settings/team', label: '구성원 관리' },
  { href: '/settings/organization', label: '조직 설정' },
  { href: '/settings/subscription' as Route, label: '구독 관리' },
  { href: '/settings/content', label: '문구 관리' },
  { href: '/settings/features', label: '기능 설정' }
];

export function SettingsNav({
  currentPath,
  canViewPlatformControls = false
}: {
  currentPath: string;
  canViewPlatformControls?: boolean;
}) {
  const visibleItems = items.filter((item) => canViewPlatformControls || item.href !== '/settings/features');

  return (
    <div className="flex flex-wrap gap-2">
      {visibleItems.map((item) => {
        const active = currentPath === item.href;
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
