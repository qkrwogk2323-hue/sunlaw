import type { Route } from 'next';
import { ROUTES } from '@/lib/routes/registry';

const URI_SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * 런타임 URL을 내부 상대 경로만 허용하도록 정규화한다.
 * 허용하지 않는 값은 fallback 경로로 강제한다.
 */
export function isSafeInternalHref(rawHref: string | null | undefined): boolean {
  const href = `${rawHref ?? ''}`.trim();
  if (!href) return false;
  if (href.startsWith('//')) return false;
  if (URI_SCHEME_RE.test(href)) return false;
  if (!href.startsWith('/')) return false;
  return true;
}

/**
 * 허용되는 내부 경로만 통과시키고, 나머지는 fallback으로 강제한다.
 */
export function resolveSafeInternalHref(
  rawHref: string | null | undefined,
  fallback: Route = ROUTES.NOTIFICATIONS
): Route {
  if (!isSafeInternalHref(rawHref)) return fallback;
  return `${rawHref ?? ''}`.trim() as Route;
}
