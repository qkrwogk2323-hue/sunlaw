/**
 * Batch 6 테스트 — D5111 전환 판정 + 투입액 계산 + 변제시작일
 */
import { describe, expect, it } from 'vitest';
import {
  determineFormType,
  calculateDisposalAmount,
  allocateDisposalToCreditors,
} from '@/lib/rehabilitation/repayment-calculator';
import { computeRepayStartDate } from '@/lib/rehabilitation/schedule-generator';

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

  it('불특정 모드: 제출일+75일 → 인가추정 → 다음달 N일', () => {
    const result = computeRepayStartDate({
      repaymentStartUncertain: true,
      repaymentStartDay: 25,
      filingDate: '2026-04-10',
    });
    // 2026-04-10 + 75일 = 2026-06-24 (인가추정)
    // 다음달 = 2026-07, 25일 → 2026-07-25
    expect(result).toBe('2026-07-25');
  });
});
