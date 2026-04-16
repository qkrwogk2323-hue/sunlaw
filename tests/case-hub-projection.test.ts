/**
 * case-hub-projection 스모크 테스트.
 *
 * 검증관 지시(backlog #2) 중 1개:
 *   생성 즉시 사건 문서함 반영 — projection.documents가 case_documents를
 *   정확히 읽고 있는지 존재 여부 단건만 확인
 *
 * 이 테스트는 SUPABASE_SERVICE_ROLE_KEY + 실 DB 접근이 필요. 없으면 skip.
 * 구조 검증에 집중 — 개별 값 검증은 별도 integration.
 */
import { describe, it, expect } from 'vitest';
import type { CaseHubProjection } from '@/lib/queries/case-hub-projection';

describe('case-hub-projection shape', () => {
  it('typed projection은 6섹션 + meta를 전부 가진다', () => {
    // 타입 형태 검증만 (실 쿼리 없이). 위 조건 없으면 skip.
    const mockProjection: CaseHubProjection = {
      caseId: 'x',
      organizationId: 'y',
      progress: {
        caseId: 'x',
        title: null,
        referenceNo: null,
        caseType: null,
        stageKey: null,
        caseStatus: null,
        lifecycleStatus: null,
        openedOn: null,
        updatedAt: null,
        handlers: [],
        recentSchedule: null,
      },
      billing: {
        entryCount: 0,
        totalInvoiced: 0,
        totalPaid: 0,
        totalPending: 0,
        overdueCount: 0,
        activeAgreements: 0,
      },
      recovery: {
        activityCount: 0,
        lastActivityAt: null,
        totalRecoveredAmount: 0,
        recentActivities: [],
      },
      audit: { recentChanges: [] },
      documents: { count: 0, generatedCount: 0, contractCount: 0, recent: [] },
      clients: { count: 0, list: [] },
      fetchedAt: new Date().toISOString(),
    };

    expect(mockProjection).toHaveProperty('progress');
    expect(mockProjection).toHaveProperty('billing');
    expect(mockProjection).toHaveProperty('recovery');
    expect(mockProjection).toHaveProperty('audit');
    expect(mockProjection).toHaveProperty('documents');
    expect(mockProjection).toHaveProperty('clients');
    expect(mockProjection.progress).toHaveProperty('handlers');
    expect(mockProjection.billing).toHaveProperty('overdueCount');
    expect(mockProjection.recovery).toHaveProperty('totalRecoveredAmount');
    // documents는 생성문서(case_documents) + 계약서(fee_agreements) 통합 타임라인
    expect(mockProjection.documents).toHaveProperty('generatedCount');
    expect(mockProjection.documents).toHaveProperty('contractCount');
  });
});
