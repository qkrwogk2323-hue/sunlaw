export const ACTIVE_VIEW_MODE_COOKIE = 'vs_active_view_mode';

export function isPlatformAdminOnlyPath(pathname: string) {
  return pathname.startsWith('/admin') || pathname === '/settings/platform' || pathname === '/settings/features';
}

export function normalizeActiveViewMode(value?: string | null) {
  return value?.trim() || null;
}