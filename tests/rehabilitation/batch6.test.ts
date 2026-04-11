/**
 * Batch 6 테스트 — D5111 전환 판정 + 투입액 계산 + 변제시작일
 */
import { describe, expect, it } from 'vitest';
import {
  determineFormType,
  calculateDisposalAmount,
  allocateDisposalToCreditors,
} from '@/lib/rehabilitation/repayment-calculator';
import { computeRepayStartDate, computePhasedRepaySegments } from '@/lib/rehabilitation/schedule-generator';

describe('D5111 전환 판정', () => {
  it('현재가치 > 청산가치 → D5110', () => {
    expect(determineFormType(18_000_000, 10_000_000)).toBe('D5110');
  });

  it('현재가치 ≤ 청산가치 → D5111', () => {
    expect(determineFormType(17_073_552, 30_000_000)).toBe('D5111');
  });

  it('현재가치 = 청산가치 → D5111 (이하이므로)', () => {
    expect(determineFormType(10_000_000, 10_000_000)).toBe('D5111');
  });

  it('현재가치 null → D5111', () => {
    expect(determineFormType(null, 10_000_000)).toBe('D5111');
  });
});

describe('D5111 투입액 계산', () => {
  it('작성례2: (30,000,000 - 17,073,552) × 1.3 = 올림', () => {
    // 법원사무관 (isExternalTrustee = false), 1년 이내
    const amount = calculateDisposalAmount(30_000_000, 17_073_552, 1, false);
    // gap = 12,926,448
    // 12,926,448 × 1.3 = 16,804,382.4 → ceil → 16,804,383
    expect(amount).toBe(Math.ceil(12_926_448 * 1.3));
    expect(amount).toBe(16_804_383);
  });

  it('2년 이내 승수 1.5 적용', () => {
    const amount = calculateDisposalAmount(30_000_000, 17_073_552, 2, false);
    expect(amount).toBe(Math.ceil(12_926_448 * 1.5));
  });

  it('외부 위원 시 1% 차감', () => {
    const internal = calculateDisposalAmount(30_000_000, 17_073_552, 1, false);
    const external = calculateDisposalAmount(30_000_000, 17_073_552, 1, true);
    const fee = Math.round(internal * 0.01);
    expect(external).toBe(internal - fee);
  });

  it('청산가치 ≤ 현재가치 → 투입액 0', () => {
    expect(calculateDisposalAmount(10_000_000, 18_000_000, 1, false)).toBe(0);
  });
});

describe('D5111 채권자별 배분 (올림)', () => {
  it('배분 합계 = 투입액', () => {
    const result = allocateDisposalToCreditors(16_804_383, [
      { id: 'A', claim: 19_365_500 },
      { id: 'B', claim: 17_873_000 },
      { id: 'C', claim: 15_456_300 },
    ]);
    expect(result).toHaveLength(3);
    // 올림이므로 합계가 투입액보다 약간 클 수 있으나 마지막 잔여분 보정
    const total = result.reduce((s, r) => s + r.amount, 0);
    expect(total).toBe(16_804_383);
  });
});

describe('변제시작일 자동계산', () => {
  it('확정 날짜가 있으면 그대로 반환', () => {
    expect(computeRepayStartDate({
      repaymentStartDate: '2026-07-25',
      repaymentStartUncertain: false,
    })).toBe('2026-07-25');
  });

  it('불특정 모드 + day 있음 → null (문서에서 텍스트 표기)', () => {
    const result = computeRepayStartDate({
      repaymentStartUncertain: true,
      repaymentStartDay: 25,
      filingDate: '2026-04-10',
    });
    expect(result).toBeNull();
  });

  it('day 없음 → null (UI 경고 표시)', () => {
    const result = computeRepayStartDate({});
    expect(result).toBeNull();
  });
});

describe('Phase별 단계변제', () => {
  const creditors = [
    { id: 'A', bondNumber: 1, capital: 5_000_000, interest: 1_000_000 },
    { id: 'B', bondNumber: 2, capital: 3_000_000, interest: 500_000 },
  ] as import('@/lib/rehabilitation/types').RehabCreditor[];

  it('원금 전부 + 이자 일부 변제 시 3구간 생성', () => {
    // 총원금 8,000,000 / 총이자 1,500,000 / 총변제 = 500,000 × 36 = 18,000,000
    // 원금 완납 = 8,000,000 / 500,000 = 16개월
    // Phase 1: 1~16 (원금 안분)
    // Phase 2: 없음 (나머지 0)
    // Phase 3: 17~36 (이자 안분)
    const segments = computePhasedRepaySegments(creditors, 500_000, 36);
    expect(segments.length).toBeGreaterThanOrEqual(2);
    expect(segments[0].phase).toBe(1);
    expect(segments[0].startMonth).toBe(1);
    expect(segments[0].endMonth).toBe(16);
    // 마지막 구간은 이자 안분
    const lastSeg = segments[segments.length - 1];
    expect(lastSeg.phase).toBe(3);
    expect(lastSeg.endMonth).toBe(36);
  });

  it('원금이 월변제액으로 나누어떨어지지 않으면 Phase 2 (전환 회차) 존재', () => {
    // 총원금 8,000,000 / 월변제 300,000 = 26.67개월
    // capitalFullMonths = 26, remainder = 200,000
    // Phase 1: 1~26, Phase 2: 27, Phase 3: 28~36
    const segments = computePhasedRepaySegments(creditors, 300_000, 36);
    expect(segments).toHaveLength(3);
    expect(segments[0].phase).toBe(1);
    expect(segments[1].phase).toBe(2);
    expect(segments[1].startMonth).toBe(segments[1].endMonth); // 단일 회차
    expect(segments[2].phase).toBe(3);
  });

  it('총변제액 ≤ 총원금이면 빈 배열 (단계변제 불필요)', () => {
    const segments = computePhasedRepaySegments(creditors, 100_000, 36);
    // 100,000 × 36 = 3,600,000 < 8,000,000 (총원금)
    expect(segments).toHaveLength(0);
  });
});
