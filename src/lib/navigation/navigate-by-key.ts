import type { Route } from 'next';
import { resolveInteractionHref, type InteractionKey } from '@/lib/interactions/registry';
import { ROUTES } from '@/lib/routes/registry';

export type NavigateFn = (href: string) => void;

export function resolveRouteByKey(
  key: InteractionKey,
  fallback: Route = ROUTES.NOTIFICATIONS
): string {
  return resolveInteractionHref(key, fallback);
}

export function navigateByKey(
  key: InteractionKey,
  navigate: NavigateFn,
  fallback: Route = ROUTES.NOTIFICATIONS
): string {
  const target = resolveRouteByKey(key, fallback);
  navigate(target);
  return target;
}
