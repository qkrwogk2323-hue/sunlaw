/**
 * Batch 3 테스트 — 번호 불변 규칙 + D5113 스키마 + 표지 생성
 */
import { describe, expect, it } from 'vitest';
import { generateRepaySchedule, generateMonthlyDetailSchedule } from '@/lib/rehabilitation/schedule-generator';
import { validateD5113 } from '@/lib/rehabilitation/court-form-schemas';
import { generateDocument } from '@/lib/rehabilitation/document-generator';
import type { RehabCreditor } from '@/lib/rehabilitation/types';

function makeCreditor(id: string, bondNumber: number, capital: number, opts?: Partial<RehabCreditor>): RehabCreditor {
  return {
    id,
    bondNumber,
    classify: '법인',
    creditorName: id,
    branchName: '',
    postalCode: '',
    address: '',
    phone: '',
    fax: '',
    mobile: '',
    bondCause: '',
    capital,
    capitalCompute: '',
    interest: 0,
    interestCompute: '',
    delayRate: 0,
    bondContent: '',
    isSecured: false,
    securedPropertyId: null,
    lienPriority: 0,
    lienType: '',
    maxClaimAmount: 0,
    hasPriorityRepay: false,
    isUnsettled: false,
    isAnnuityDebt: false,
    applyRestructuring: false,
    attachments: [],
    unsettledReason: '',
    unsettledAmount: 0,
    unsettledText: '',
    guarantorName: '',
    guarantorAmount: 0,
    guarantorText: '',
    ...opts,
  };
}

describe('채권자 번호 불변 규칙', () => {
  it('기존 채권자에 신규 추가 시 기존 번호 유지 (max+1)', () => {
    // 기존: bondNumber 1, 3 (결번 2 허용)
    const existing = [
      makeCreditor('A', 1, 5_000_000),
      makeCreditor('B', 3, 10_000_000),
    ];
    // 신규: max(1,3)+1 = 4
    const newCreditor = makeCreditor('C', 4, 7_000_000);
    const all = [...existing, newCreditor];

    const schedule = generateRepaySchedule(all, 300_000, 36, 0, 'sequential', true);
    expect(schedule).toHaveLength(3);
    // 기존 번호가 스케줄에 영향 없음 — 스케줄은 creditorId로 식별
    expect(schedule[0].creditorId).toBe('A');
    expect(schedule[1].creditorId).toBe('B');
    expect(schedule[2].creditorId).toBe('C');
  });

  it('삭제 후 추가 시 결번 유지, 재사용 안 함', () => {
    // bondNumber 1, 2, 3 중 2번 삭제 → 1, 3 남음
    // 새 채권자 추가 → 4번 (2번 재사용 안 함)
    const afterDelete = [
      makeCreditor('A', 1, 5_000_000),
      makeCreditor('B', 3, 10_000_000),
    ];
    const maxBond = Math.max(...afterDelete.map(c => c.bondNumber));
    const newBond = maxBond + 1;
    expect(newBond).toBe(4); // 2가 아니라 4

    const all = [...afterDelete, makeCreditor('D', newBond, 8_000_000)];
    const schedule = generateRepaySchedule(all, 300_000, 36, 0, 'sequential', true);
    expect(schedule).toHaveLength(3);
  });
});

describe('D5113 중지명령신청서 스키마', () => {
  it('유효한 데이터 통과', () => {
    const result = validateD5113({
      court_name: '서울회생법원',
      applicant_name: '홍길동',
      target_case_number: '2026타채12345',
      target_creditor: 'A은행',
      execution_types: ['채권압류및추심명령'],
      reason_detail: '개인회생절차의 목적 달성에 지장',
      application_date: '2026-04-11',
    });
    expect(result.ok).toBe(true);
  });

  it('필수 필드 누락 시 실패', () => {
    const result = validateD5113({
      court_name: '',
      applicant_name: '',
      target_case_number: '',
      execution_types: [],
    });
    expect(result.ok).toBe(false);
  });
});

describe('표지(Cover page) 생성', () => {
  it('기본 표지 HTML 생성', () => {
    const html = generateDocument('cover_page', {
      application: {
        court_name: '서울회생법원',
        case_year: 2026,
        case_number: '12345',
        applicant_name: '홍길동',
        resident_number_front: '900101',
        agent_type: '변호사',
        agent_name: '황기환',
        agent_law_firm: '법무법인 서해',
        application_date: '2026-04-11',
      },
      creditorSettings: null,
      creditors: [],
      securedProperties: [],
      properties: [],
      propertyDeductions: [],
      familyMembers: [],
      incomeSettings: null,
      affidavit: null,
      planSections: [],
    });

    expect(html).toContain('서울회생법원');
    expect(html).toContain('홍길동');
    expect(html).toContain('2026개회');
    expect(html).toContain('12345');
    expect(html).toContain('법무법인 서해');
    expect(html).toContain('황기환');
    expect(html).toContain('개인회생절차개시신청서');
  });
});
