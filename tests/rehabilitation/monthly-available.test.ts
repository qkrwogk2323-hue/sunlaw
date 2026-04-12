import { describe, expect, it } from 'vitest';
import { computeMonthlyAvailable } from '@/lib/rehabilitation/monthly-available';
import { computeLivingCost } from '@/lib/rehabilitation/median-income';

describe('월가용소득 공식 확장 (P1-7)', () => {
  /**
   * 김한경 케이스 (anatomy §2.3):
   *   monthlyIncome = 2,100,000
   *   1인 가구 / 2026
   *
   * VS는 기준중위소득 60% 직접 사용 (rate=100 기본).
   *   baseline60 = floor(2,564,238 × 0.6) = 1,538,542
   *   monthlyAvailable = 2,100,000 - 1,538,542 = 561,458
   *
   * colaw는 40% 기반 + rate=150 방식으로 1,538,543 (1원 차이, round vs floor).
   * → VS 561,458 vs colaw 561,457 (1원 floor 정책 차이, 알려진 허용 범위)
   */
  it('김한경: 2,100,000 / 1인 / 2026 → VS 561,458 (colaw 561,457 대비 1원 차이)', () => {
    const r = computeMonthlyAvailable({
      monthlyIncome: 2_100_000,
      householdSize: 1,
      year: 2026,
    });
    expect(r.livingCost.baseline60).toBe(1_538_543);
    expect(r.livingCost.afterRate).toBe(1_538_543);
    expect(r.livingCost.applied).toBe(1_538_543);
    expect(r.monthlyAvailable).toBe(561_457);
  });

  it('생계비율 100% (기본) — afterRate = baseline60', () => {
    const r = computeMonthlyAvailable({
      monthlyIncome: 3_000_000,
      householdSize: 2,
      year: 2025,
    });
    expect(r.livingCost.afterRate).toBe(r.livingCost.baseline60);
  });

  it('생계비율 150% — afterRate = baseline60 × 1.5', () => {
    const r = computeMonthlyAvailable({
      monthlyIncome: 5_000_000,
      householdSize: 1,
      year: 2026,
      livingCostRate: 150,
    });
    // baseline60 = 1,538,543 (공표값) × 1.5 = 2,307,814.5 → round = 2,307,815
    expect(r.livingCost.afterRate).toBe(2_307_815);
  });

  it('추가생계비 (extraFamilyLowMoney) 포함', () => {
    const r = computeMonthlyAvailable({
      monthlyIncome: 4_000_000,
      householdSize: 2,
      year: 2025,
      extraFamilyLowMoney: 200_000,
    });
    expect(r.livingCost.applied).toBe(r.livingCost.afterRate + 200_000);
  });

  it('양육비 + 회생위원보수 공제', () => {
    const r = computeMonthlyAvailable({
      monthlyIncome: 3_000_000,
      householdSize: 1,
      year: 2025,
      childSupport: 300_000,
      trusteeCommissionRate: 3,
    });
    // CLAUDE.md: ④ = ③ × 3% (③ = 월소득 - 생계비 - 양육비)
    const preComm = 3_000_000 - r.livingCost.applied - 300_000;
    const expectedComm = Math.round((preComm * 3) / 100);
    expect(r.trusteeCommission).toBe(expectedComm);
    expect(r.monthlyAvailable).toBe(
      Math.max(0, Math.floor(preComm - expectedComm)),
    );
  });

  it('월가용 음수 → 0 + warning', () => {
    const r = computeMonthlyAvailable({
      monthlyIncome: 500_000,
      householdSize: 4,
      year: 2025,
    });
    expect(r.monthlyAvailable).toBe(0);
    expect(r.warnings.some((w) => w.includes('음수'))).toBe(true);
  });

  it('생계비율 100% 미만 → warning', () => {
    const r = computeMonthlyAvailable({
      monthlyIncome: 5_000_000,
      householdSize: 1,
      year: 2026,
      livingCostRate: 80,
    });
    expect(r.warnings.some((w) => w.includes('100% 미만'))).toBe(true);
  });

  it('생계비율 200% 초과 → warning', () => {
    const r = computeMonthlyAvailable({
      monthlyIncome: 10_000_000,
      householdSize: 1,
      year: 2026,
      livingCostRate: 250,
    });
    expect(r.warnings.some((w) => w.includes('200% 초과'))).toBe(true);
  });
});

describe('computeLivingCost (단독)', () => {
  it('기본 rate=100', () => {
    const r = computeLivingCost({ householdSize: 1, year: 2026 });
    expect(r.baseline60).toBe(1_538_543);
    expect(r.afterRate).toBe(1_538_543);
    expect(r.applied).toBe(1_538_543);
    expect(r.rate).toBe(100);
  });

  it('rate=150 + 추가생계비', () => {
    const r = computeLivingCost({
      householdSize: 1,
      year: 2026,
      rate: 150,
      extraFamilyLowMoney: 100_000,
    });
    expect(r.baseline60).toBe(1_538_543);
    expect(r.afterRate).toBe(2_307_815);
    expect(r.applied).toBe(2_407_815);
  });
});
