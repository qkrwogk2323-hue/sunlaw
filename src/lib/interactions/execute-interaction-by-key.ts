import type { Route } from 'next';
import {
  getInteractionDefinition,
  type InteractionKey
} from '@/lib/interactions/registry';
import { navigateByKey, type NavigateFn } from '@/lib/navigation/navigate-by-key';
import { runActionByKey, type RunActionOptions, type RunActionResult } from '@/lib/actions/run-action-by-key';
import { ROUTES } from '@/lib/routes/registry';

export type ExecuteInteractionOptions = {
  actionOptions?: RunActionOptions;
  applyState?: (state: { state: Record<string, string | undefined>; group: string }) => void;
  navigate?: NavigateFn;
  fallbackRoute?: Route;
};

export type ExecuteInteractionResult = {
  actionResult: RunActionResult;
  appliedState: Record<string, string | undefined> | null;
  navigatedTo: string | null;
};

/**
 * 행동 단위 계약 실행 순서:
 * 1) action
 * 2) state
 * 3) navigate
 */
export async function executeInteractionByKey(
  key: InteractionKey,
  options: ExecuteInteractionOptions = {}
): Promise<ExecuteInteractionResult> {
  const definition = getInteractionDefinition(key);
  const fallbackRoute = options.fallbackRoute ?? ROUTES.NOTIFICATIONS;

  const actionResult = await runActionByKey(key, options.actionOptions);
  if (!actionResult.ok) {
    return {
      actionResult,
      appliedState: null,
      navigatedTo: null
    };
  }

  if (definition.state && options.applyState) {
    options.applyState({
      state: definition.state,
      group: definition.group
    });
  }

  let navigatedTo: string | null = null;
  if ((definition.route || definition.type === 'navigate' || definition.type === 'mixed') && options.navigate) {
    navigatedTo = navigateByKey(key, options.navigate, fallbackRoute);
  }

  return {
    actionResult,
    appliedState: definition.state ?? null,
    navigatedTo
  };
}
