import type { Route } from 'next';
import Link from 'next/link';

const items: { href: Route; label: string }[] = [
  { href: '/settings', label: '개요' },
  { href: '/settings/team', label: '구성원 관리' },
  { href: '/settings/organization', label: '조직 설정' },
  { href: '/settings/content', label: '문구/리소스' },
  { href: '/settings/features', label: '기능 플래그' }
];

export function SettingsNav({ currentPath }: { currentPath: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = currentPath === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-2 text-sm font-medium ${active ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
