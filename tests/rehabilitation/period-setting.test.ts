import { describe, expect, it } from 'vitest';
import { decidePeriodSetting, type CreditorClaim } from '@/lib/rehabilitation/period-setting';

/**
 * 김한경 채권 fixture (anatomy §9.2 합계 기준 가설 분배)
 *
 * - capital 합계: 62,844,516
 * - interest 합계: 4,549,968
 * - 별제권부: 제이비우리캐피탈 자동차담보 23,835,499 / 담보평가 10,680,000
 * - 무담보 부족액: 13,155,499
 * - 무담보 변제대상 원금 = 7,067,290(인천세무서) + 31,941,727(나머지) + 13,155,499(부족분)
 *                       = 52,164,516
 *
 * VS DB 실제 값과는 데이터 드리프트 존재 (P1-6(b) 추적 대상).
 * 본 테스트는 엔진 수식 검증이 목적이므로 anatomy 값 사용.
 */
const kimHanGyeong: CreditorClaim[] = [
  // 별제권부: 제이비우리캐피탈 23,835,499 / 담보 10,680,000 → 부족분 13,155,499
  {
    capital: 23_835_499,
    interest: 0,
    isSecured: true,
    securedCollateralValue: 10_680_000,
    isOtherUnconfirmed: false,
  },
  // 인천세무서 (조세) — 원금만
  {
    capital: 7_067_290,
    interest: 0,
    isSecured: false,
    securedCollateralValue: 0,
    isOtherUnconfirmed: false,
  },
  // 나머지 무담보 (원금 31,941,727 + 이자 4,549,968)
  {
    capital: 31_941_727,
    interest: 4_549_968,
    isSecured: false,
    securedCollateralValue: 0,
    isOtherUnconfirmed: false,
  },
];

// 합계 검증:
//   capital sum = 23,835,499 + 7,067,290 + 31,941,727 = 62,844,516 ✓ (anatomy §9.2)
//   interest sum = 4,549,968 ✓
//   unsecured principal = 13,155,499 + 7,067,290 + 31,941,727 = 52,164,516

describe('변제기간 6규칙 (P1-8)', () => {
  it('setting 6 (원금만 변제) — 김한경 39% 변제율 재현', () => {
    const r = decidePeriodSetting({
      setting: 6,
      creditors: kimHanGyeong,
      monthlyAvailable: 561_457,
      liquidationValue: 18_961_470,
      forcedMonths: 36,
    });
    expect(r.targetPrincipal).toBe(52_164_516);
    expect(r.targetInterest).toBe(0);
    expect(r.months).toBe(36);
    expect(r.totalScheduled).toBe(20_212_452); // 561457 × 36
    // 변제율 = 20,212,452 / 52,164,516 = 0.38748... → 표기 39%
    expect(Math.round(r.ratePrincipal * 100)).toBe(39);
    expect(r.rateInterest).toBe(0);
    expect(r.liquidationGuaranteed).toBe(true);
  });

  it('setting 1 (원금만 60개월)', () => {
    const r = decidePeriodSetting({
      setting: 1,
      creditors: kimHanGyeong,
      monthlyAvailable: 561_457,
      liquidationValue: 18_961_470,
    });
    expect(r.months).toBe(60);
    expect(r.targetPrincipal).toBe(52_164_516);
    expect(r.targetInterest).toBe(0);
  });

  it('setting 2 (원리금 60개월)', () => {
    const r = decidePeriodSetting({
      setting: 2,
      creditors: kimHanGyeong,
      monthlyAvailable: 561_457,
      liquidationValue: 18_961_470,
    });
    expect(r.months).toBe(60);
    expect(r.targetInterest).toBe(4_549_968);
    expect(r.targetDenominator).toBe(52_164_516 + 4_549_968);
  });

  it('setting 5 (원리금 36개월 최단)', () => {
    const r = decidePeriodSetting({
      setting: 5,
      creditors: kimHanGyeong,
      monthlyAvailable: 561_457,
      liquidationValue: 18_961_470,
    });
    expect(r.months).toBe(36);
    expect(r.targetInterest).toBe(4_549_968);
  });

  it('청산가치 미충족 시 자동 연장', () => {
    // 36: 400000×33.7719=13,508,760 < 20m → 48: 17,582,200 < 20m → 60: 21,457,320 ≥ 20m
    const r = decidePeriodSetting({
      setting: 6,
      creditors: kimHanGyeong,
      monthlyAvailable: 400_000,
      liquidationValue: 20_000_000,
      forcedMonths: 36,
    });
    expect(r.months).toBe(60);
    expect(r.liquidationGuaranteed).toBe(true);
    expect(r.notes.some((n) => n.includes('60개월에서 충족'))).toBe(true);
  });

  it('60개월에도 미달 → liquidationGuaranteed false', () => {
    const r = decidePeriodSetting({
      setting: 6,
      creditors: kimHanGyeong,
      monthlyAvailable: 100_000,
      liquidationValue: 50_000_000,
      forcedMonths: 36,
    });
    expect(r.months).toBe(60);
    expect(r.liquidationGuaranteed).toBe(false);
    expect(r.notes.some((n) => n.includes('보장 위배'))).toBe(true);
  });

  it('forcedMonths가 baseMonths보다 우선', () => {
    // setting 1 기본 60개월이지만 강제로 36개월
    const r = decidePeriodSetting({
      setting: 1,
      creditors: kimHanGyeong,
      monthlyAvailable: 561_457,
      liquidationValue: 18_961_470,
      forcedMonths: 36,
    });
    expect(r.months).toBe(36);
  });

  it('targetPrincipal=0이면 ratePrincipal=0', () => {
    const r = decidePeriodSetting({
      setting: 6,
      creditors: [],
      monthlyAvailable: 500_000,
      liquidationValue: 0,
    });
    expect(r.targetPrincipal).toBe(0);
    expect(r.ratePrincipal).toBe(0);
  });
});
