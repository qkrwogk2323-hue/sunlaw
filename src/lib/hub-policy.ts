/**
 * 사건 허브 상태 단일 policy — 2026-04-16.
 *
 * cases/page.tsx, case-hub-connect-button.tsx, cases-bulk-connect-panel.tsx,
 * dashboard-hub-client.tsx 등에서 독자 계산하던 허브 연결 상태, 배지, 문구를
 * 이 파일의 함수 호출로 수렴시킨다.
 *
 * 원천 데이터:
 *   caseHubLinkMap   (case_hubs 직접 소유)
 *   hubRegistrations (organization_collaboration_hubs 공유)
 *   caseClientLinkedMap (case_clients 연결 여부)
 *
 * 이 세 맵을 한 번 조회하고, 각 사건에 대해 deriveHubState()를 호출하면
 * 모든 화면이 같은 상태를 보게 됨.
 */

export type HubLinkState =
  | 'hub_active'       // 허브 존재 + 접근 가능
  | 'no_client'        // 의뢰인 미연결 → 허브 생성 불가
  | 'hub_creatable';   // 의뢰인 있고 허브 없음 → 허브 생성 가능

export type HubBadgeTone = 'green' | 'amber' | 'blue';

export interface HubStateResult {
  state: HubLinkState;
  hubId: string | null;
  hasClient: boolean;
  badge: {
    label: string;
    tone: HubBadgeTone;
  };
  action: {
    label: string;
    type: 'link' | 'button' | 'info';
    href: string | null;
  };
}

export interface HubStateSources {
  caseHubLinkMap: Record<string, { id: string } | null>;
  hubRegistrations: Record<string, { sharedHubId?: string | null } | undefined>;
  caseClientLinkedMap: Record<string, boolean>;
}

/**
 * 사건 1건의 허브 상태를 단일 함수로 결정.
 * 모든 UI가 이 함수를 통해 배지/문구/액션을 가져가야 함.
 */
export function deriveHubState(caseId: string, sources: HubStateSources): HubStateResult {
  const hubLink = sources.caseHubLinkMap[caseId];
  const registration = sources.hubRegistrations[caseId];
  const hubId = hubLink?.id ?? registration?.sharedHubId ?? null;
  const hasClient = Boolean(sources.caseClientLinkedMap[caseId]);

  if (hubId) {
    return {
      state: 'hub_active',
      hubId,
      hasClient,
      badge: { label: '허브 연결', tone: 'green' },
      action: { label: '허브 입장', type: 'link', href: `/case-hubs/${hubId}` },
    };
  }

  if (!hasClient) {
    return {
      state: 'no_client',
      hubId: null,
      hasClient: false,
      badge: { label: '의뢰인 미연결', tone: 'amber' },
      action: { label: '의뢰인 미연결', type: 'info', href: null },
    };
  }

  return {
    state: 'hub_creatable',
    hubId: null,
    hasClient: true,
    badge: { label: '허브 미연결', tone: 'blue' },
    action: { label: '허브 연동', type: 'button', href: null },
  };
}

/**
 * 사건 목록 전체에 대해 한 번에 hubState 맵 생성.
 * cases/page.tsx, dashboard 등에서 반복 호출 대신 이걸 한 번 써야 함.
 */
export function deriveHubStateMap(
  caseIds: string[],
  sources: HubStateSources
): Record<string, HubStateResult> {
  return Object.fromEntries(
    caseIds.map((id) => [id, deriveHubState(id, sources)])
  );
}

/**
 * 일괄 연결 패널용 — 허브 미연결 + 의뢰인 미연결 사건 분류.
 * cases-bulk-connect-panel.tsx가 독자 계산하던 로직.
 */
export function classifyBulkConnectCases(
  caseIds: string[],
  sources: HubStateSources
): { unlinkedHub: string[]; unlinkedClient: string[]; allLinked: boolean } {
  const unlinkedHub: string[] = [];
  const unlinkedClient: string[] = [];

  for (const id of caseIds) {
    const s = deriveHubState(id, sources);
    if (s.state === 'no_client') unlinkedClient.push(id);
    else if (s.state === 'hub_creatable') unlinkedHub.push(id);
  }

  return {
    unlinkedHub,
    unlinkedClient,
    allLinked: unlinkedHub.length === 0 && unlinkedClient.length === 0,
  };
}
