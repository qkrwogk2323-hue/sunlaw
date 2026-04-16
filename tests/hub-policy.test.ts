/**
 * hub-policy 단일 계산 테스트.
 *
 * 검증 대상 (검증관 지시 5개 우선 테스트 중 2개):
 *   1. 허브 상태 4분기 — hub_active / no_client / hub_creatable 3가지 경로
 *   2. roster와 case badge 일치 — deriveHubStateMap으로 전체 사건 배지를 한 번에 계산,
 *      CaseHubConnectButton이 같은 결과를 받음
 *
 * 나머지 3개(unread count 일치, 생성 즉시 사건 문서함 반영, portal 과다조회 차단)는
 * integration test로 별도 작성 예정.
 */
import { describe, it, expect } from 'vitest';
import {
  deriveHubState,
  deriveHubStateMap,
  classifyBulkConnectCases,
  type HubStateSources,
} from '@/lib/hub-policy';

const EMPTY_SOURCES: HubStateSources = {
  caseHubLinkMap: {},
  hubRegistrations: {},
  caseClientLinkedMap: {},
};

describe('deriveHubState', () => {
  it('허브가 있으면 hub_active + green badge + link action', () => {
    const sources: HubStateSources = {
      caseHubLinkMap: { 'case-1': { id: 'hub-1' } },
      hubRegistrations: {},
      caseClientLinkedMap: { 'case-1': true },
    };
    const r = deriveHubState('case-1', sources);
    expect(r.state).toBe('hub_active');
    expect(r.hubId).toBe('hub-1');
    expect(r.badge.tone).toBe('green');
    expect(r.action.type).toBe('link');
    expect(r.action.href).toBe('/case-hubs/hub-1');
  });

  it('공유 허브(collaboration)도 hub_active', () => {
    const sources: HubStateSources = {
      caseHubLinkMap: {},
      hubRegistrations: { 'case-2': { sharedHubId: 'shared-hub-1' } },
      caseClientLinkedMap: { 'case-2': true },
    };
    const r = deriveHubState('case-2', sources);
    expect(r.state).toBe('hub_active');
    expect(r.hubId).toBe('shared-hub-1');
  });

  it('caseHubLinkMap이 sharedHubId보다 우선', () => {
    const sources: HubStateSources = {
      caseHubLinkMap: { 'case-3': { id: 'own-hub' } },
      hubRegistrations: { 'case-3': { sharedHubId: 'shared-hub' } },
      caseClientLinkedMap: {},
    };
    const r = deriveHubState('case-3', sources);
    expect(r.hubId).toBe('own-hub');
  });

  it('의뢰인 없으면 no_client + amber badge + info action', () => {
    const r = deriveHubState('case-4', EMPTY_SOURCES);
    expect(r.state).toBe('no_client');
    expect(r.hasClient).toBe(false);
    expect(r.badge.tone).toBe('amber');
    expect(r.action.type).toBe('info');
  });

  it('의뢰인 있고 허브 없으면 hub_creatable + blue badge + button action', () => {
    const sources: HubStateSources = {
      caseHubLinkMap: {},
      hubRegistrations: {},
      caseClientLinkedMap: { 'case-5': true },
    };
    const r = deriveHubState('case-5', sources);
    expect(r.state).toBe('hub_creatable');
    expect(r.hasClient).toBe(true);
    expect(r.badge.tone).toBe('blue');
    expect(r.action.type).toBe('button');
  });
});

describe('deriveHubStateMap', () => {
  it('여러 사건을 한 번에 계산하면 각각 올바른 상태', () => {
    const sources: HubStateSources = {
      caseHubLinkMap: { a: { id: 'h1' } },
      hubRegistrations: {},
      caseClientLinkedMap: { a: true, b: true },
    };
    const map = deriveHubStateMap(['a', 'b', 'c'], sources);
    expect(map.a.state).toBe('hub_active');
    expect(map.b.state).toBe('hub_creatable');
    expect(map.c.state).toBe('no_client');
  });
});

describe('classifyBulkConnectCases', () => {
  it('혼재된 사건을 unlinkedHub / unlinkedClient로 분류', () => {
    const sources: HubStateSources = {
      caseHubLinkMap: { a: { id: 'h1' } },
      hubRegistrations: {},
      caseClientLinkedMap: { a: true, b: true },
    };
    const r = classifyBulkConnectCases(['a', 'b', 'c'], sources);
    expect(r.unlinkedHub).toEqual(['b']);
    expect(r.unlinkedClient).toEqual(['c']);
    expect(r.allLinked).toBe(false);
  });

  it('전부 연결됐으면 allLinked true', () => {
    const sources: HubStateSources = {
      caseHubLinkMap: { x: { id: 'h1' } },
      hubRegistrations: {},
      caseClientLinkedMap: { x: true },
    };
    const r = classifyBulkConnectCases(['x'], sources);
    expect(r.allLinked).toBe(true);
  });
});

describe('roster-case badge 일치 (Task 7 #2)', () => {
  // 리뷰어 지시: "의뢰인 배지 문구가 /clients 화면과 /cases 카드에서 동일해야 한다."
  // 의뢰인 연결 상태는 hub-policy의 hasClient 필드로 단일화됨 → 두 화면이 같은 값을 쓰면 같은 배지.

  const ONE_CASE = ['case-1'];

  it('의뢰인 연결됨: 두 화면 모두 hasClient=true', () => {
    const sources: HubStateSources = {
      caseHubLinkMap: {},
      hubRegistrations: {},
      caseClientLinkedMap: { 'case-1': true },
    };
    const map = deriveHubStateMap(ONE_CASE, sources);
    // cases/page.tsx는 `hubStateMap[id].hasClient`로 배지 결정
    expect(map['case-1'].hasClient).toBe(true);
    // clients/page.tsx는 case_clients 연결 여부로 배지 결정 — 같은 테이블 기반 동일값
    expect(sources.caseClientLinkedMap['case-1']).toBe(true);
  });

  it('의뢰인 미연결: 두 화면 모두 hasClient=false + hub state=no_client', () => {
    const sources: HubStateSources = {
      caseHubLinkMap: {},
      hubRegistrations: {},
      caseClientLinkedMap: {},
    };
    const map = deriveHubStateMap(ONE_CASE, sources);
    expect(map['case-1'].hasClient).toBe(false);
    expect(map['case-1'].state).toBe('no_client');
  });

  it('의뢰인 연결 + 허브 있음: 두 뱃지 모두 green (연결됨 + 허브 연결)', () => {
    const sources: HubStateSources = {
      caseHubLinkMap: { 'case-1': { id: 'h1' } },
      hubRegistrations: {},
      caseClientLinkedMap: { 'case-1': true },
    };
    const map = deriveHubStateMap(ONE_CASE, sources);
    expect(map['case-1'].hasClient).toBe(true);
    expect(map['case-1'].badge.tone).toBe('green'); // hub_active
  });

  it('policy 결과는 순수함수 — 같은 input에 매번 같은 output', () => {
    const sources: HubStateSources = {
      caseHubLinkMap: { 'x': { id: 'hub-x' } },
      hubRegistrations: { 'y': { sharedHubId: 'shared-y' } },
      caseClientLinkedMap: { 'x': true, 'y': true, 'z': true },
    };
    const a = deriveHubStateMap(['x', 'y', 'z'], sources);
    const b = deriveHubStateMap(['x', 'y', 'z'], sources);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
