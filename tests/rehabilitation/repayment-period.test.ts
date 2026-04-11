import { describe, expect, it } from 'vitest';
import { decideRepaymentPeriod } from '@/lib/rehabilitation/repayment-period';

describe('변제기간 자동결정 (P1-2)', () => {
  it('김한경: 36개월 통과 (청산가치 18,961,469, 버림)', () => {
    const result = decideRepaymentPeriod({
      monthlyPayment: 561_457,
      liquidationValue: 18_961_469,
      unsecuredTotal: 73_405_688,
    });
    expect(result.period).toBe(36);
    expect(result.reason).toBe('minimum_36');
    expect(result.pvAtPeriod).toBe(18_961_469);
  });

  it('60개월 필요 케이스 — 36/48 모두 청산가치 미달', () => {
    // 월 400,000, 청산 18,000,000, 일반 50,000,000
    // 36: 400000 × 33.7719 = 13,508,760 < 18,000,000 fail
    // 48: 400000 × 43.9555 = 17,582,200 < 18,000,000 fail
    // 60: 400000 × 53.6433 = 21,457,320 ≥ 18,000,000 pass
    const result = decideRepaymentPeriod({
      monthlyPayment: 400_000,
      liquidationValue: 18_000_000,
      unsecuredTotal: 50_000_000,
    });
    expect(result.period).toBe(60);
    expect(result.reason).toBe('liquidation_test');
    expect(result.pvAtPeriod).toBe(21_457_320);
  });

  it('48개월 통과 케이스', () => {
    // 월 500,000, 청산 18,000,000
    // 36: 500000 × 33.7719 = 16,885,950 < 18,000,000 fail
    // 48: 500000 × 43.9555 = 21,977,750 ≥ 18,000,000 pass
    const result = decideRepaymentPeriod({
      monthlyPayment: 500_000,
      liquidationValue: 18_000_000,
      unsecuredTotal: 50_000_000,
    });
    expect(result.period).toBe(48);
    expect(result.reason).toBe('liquidation_test');
    expect(result.pvAtPeriod).toBe(21_977_750);
  });

  it('cap_60: 60개월로도 청산가치 미달', () => {
    // 월 100,000, 청산 50,000,000
    // 60: 100000 × 53.6433 = 5,364,330 < 50,000,000 → cap_60
    const result = decideRepaymentPeriod({
      monthlyPayment: 100_000,
      liquidationValue: 50_000_000,
      unsecuredTotal: 80_000_000,
    });
    expect(result.period).toBe(60);
    expect(result.reason).toBe('cap_60');
    expect(result.pvAtPeriod).toBe(5_364_330);
  });

  it('변제율 계산: pv / unsecuredTotal', () => {
    const result = decideRepaymentPeriod({
      monthlyPayment: 561_457,
      liquidationValue: 0,
      unsecuredTotal: 73_405_688,
    });
    // pv = 18,961,469 / 73,405,688 ≈ 0.2583 (25.83%)
    expect(result.rateAtPeriod).toBeCloseTo(0.2583, 4);
  });

  it('unsecuredTotal=0이면 rate=0', () => {
    const result = decideRepaymentPeriod({
      monthlyPayment: 561_457,
      liquidationValue: 0,
      unsecuredTotal: 0,
    });
    expect(result.rateAtPeriod).toBe(0);
  });
});
