import type { Route } from 'next';
import {
  INTERACTION_TYPES,
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
  navigateTarget?: string;
  fallbackRoute?: Route;
};

export type ExecuteInteractionResult = {
  actionResult: RunActionResult;
  appliedState: Record<string, string | undefined> | null;
  navigatedTo: string | null;
};

function contractFailure(message: string): ExecuteInteractionResult {
  return {
    actionResult: {
      ok: false,
      code: 'unknown',
      message
    },
    appliedState: null,
    navigatedTo: null
  };
}

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

  if (definition.type === INTERACTION_TYPES.NAVIGATE && !options.navigate) {
    return contractFailure(`navigate 타입 interaction은 navigate 핸들러가 필요합니다: ${key}`);
  }
  if (definition.type === INTERACTION_TYPES.NAVIGATE && definition.actionKey) {
    return contractFailure(`navigate 타입 interaction은 actionKey를 가질 수 없습니다: ${key}`);
  }
  if (definition.type === INTERACTION_TYPES.MUTATE && options.navigate) {
    return contractFailure(`mutate 타입 interaction은 navigate를 직접 허용하지 않습니다: ${key}`);
  }
  if (definition.type === INTERACTION_TYPES.MUTATE && !definition.actionKey) {
    return contractFailure(`mutate 타입 interaction은 actionKey가 필요합니다: ${key}`);
  }
  if (definition.type === INTERACTION_TYPES.MIXED && !options.navigate) {
    return contractFailure(`mixed 타입 interaction은 navigate 핸들러가 필요합니다: ${key}`);
  }
  if (definition.type === INTERACTION_TYPES.MIXED && !definition.actionKey && !definition.requiresNavigateTarget) {
    return contractFailure(`mixed 타입 interaction은 actionKey 또는 requiresNavigateTarget 계약이 필요합니다: ${key}`);
  }
  if (definition.requiresNavigateTarget && !options.navigateTarget) {
    return contractFailure(`해당 interaction은 navigateTarget이 필요합니다: ${key}`);
  }
  if (definition.type === INTERACTION_TYPES.SCROLL) {
    return contractFailure(`scroll 타입 interaction은 아직 execute 경로가 구현되지 않았습니다: ${key}`);
  }

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
  if (
    (definition.type === INTERACTION_TYPES.NAVIGATE || definition.type === INTERACTION_TYPES.MIXED) &&
    options.navigate
  ) {
    if (options.navigateTarget) {
      options.navigate(options.navigateTarget);
      navigatedTo = options.navigateTarget;
    } else {
      navigatedTo = navigateByKey(key, options.navigate, fallbackRoute);
    }
  }

  return {
    actionResult,
    appliedState: definition.state ?? null,
    navigatedTo
  };
}
