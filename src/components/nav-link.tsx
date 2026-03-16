'use client';

import type { ReactNode } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

export function NavLink({ href, children }: { href: Route; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        'nav-link rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active ? 'nav-link-active' : 'nav-link-default'
      )}
    >
      {children}
    </Link>
  );
}
