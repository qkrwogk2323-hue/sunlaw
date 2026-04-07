/**
 * 변제기간 자동결정 6규칙 엔진 (P1-8)
 *
 * colaw repaymentperiodsetting (anatomy §2.5) — 6가지 규칙:
 *   1: 원금을 5년에 이르기까지 변제 (60개월, 이자 미포함)
 *   2: 원리금을 5년에 이르기까지 변제 (60개월, 이자 포함)
 *   3: 3~5년에 원금 100% 후 이자 추가 변제
 *   4: 36개월 내 원금 100% 후 이자 추가 변제
 *   5: 36개월 내 원리금 100% 변제
 *   6: 원금만 변제 (이자 무시) — 김한경 케이스
 *
 * 두 축의 결합:
 *   축 A (이 모듈) — repaymentperiodsetting: 변제 대상·1차 기간·이자 포함 여부
 *   축 B — 청산가치 보장 테스트 (post-step): PV가 청산가치 미만이면 기간 연장
 *
 * 김한경 setting=6 검증 (anatomy §9.3):
 *   targetPrincipal = 52,164,516 (= 62,844,516 − 10,680,000 별제권 완제분)
 *   targetInterest = 0
 *   monthlyAvailable = 561,457, months = 36
 *   totalScheduled = 20,212,452
 *   ratePrincipal = 38.748% → 표기 39%
 */

import { presentValue } from './leibniz';
import type { RepaymentPeriod } from './repayment-period';

export type PeriodSetting = 1 | 2 | 3 | 4 | 5 | 6;

export interface CreditorClaim {
  capital: number;
  interest: number;
  isSecured: boolean;
  securedCollateralValue: number;
  isOtherUnconfirmed: boolean;
}

export interface PeriodSettingInput {
  setting: PeriodSetting;
  creditors: CreditorClaim[];
  monthlyAvailable: number;
  liquidationValue: number;
  /** 사용자가 강제로 잡은 변제기간(36/48/60). 없으면 setting 기본값 */
  forcedMonths?: RepaymentPeriod;
}

export interface PeriodSettingResult {
  setting: PeriodSetting;
  /** 변제 대상 원금 합계 (별제권 완제분 제외, 무담보 부족액 포함) */
  targetPrincipal: number;
  /** 변제 대상 이자 합계 (규칙별 0 또는 합계) */
  targetInterest: number;
  /** 분모 (= targetPrincipal + targetInterest) */
  targetDenominator: number;
  /** 결정된 변제기간 (개월) */
  months: RepaymentPeriod;
  /** 총변제예정액 = monthlyAvailable × months */
  totalScheduled: number;
  /** 변제율 (원금) */
  ratePrincipal: number;
  /** 변제율 (이자) */
  rateInterest: number;
  /** 청산가치 보장 충족 여부 (post-step) */
  liquidationGuaranteed: boolean;
  notes: string[];
}

/**
 * 별제권 완제분 제외한 무담보 변제 대상 원금 합계
 *
 * - 별제권부 채권: capital − securedCollateralValue (부족분만)
 * - 기타 미확정/일반 무담보: capital 전액
 */
function unsecuredPrincipal(creditors: CreditorClaim[]): number {
  return creditors.reduce((s, c) => {
    if (c.isSecured) {
      return s + Math.max(0, c.capital - c.securedCollateralValue);
    }
    return s + c.capital;
  }, 0);
}

function totalInterest(creditors: CreditorClaim[]): number {
  return creditors.reduce((s, c) => s + (c.interest ?? 0), 0);
}

export function decidePeriodSetting(input: PeriodSettingInput): PeriodSettingResult {
  const principal = unsecuredPrincipal(input.creditors);
  const interest = totalInterest(input.creditors);
  let targetPrincipal = 0;
  let targetInterest = 0;
  let baseMonths: RepaymentPeriod = 36;
  const notes: string[] = [];

  switch (input.setting) {
    case 1:
      targetPrincipal = principal;
      targetInterest = 0;
      baseMonths = 60;
      notes.push('원금 기준 60개월 분할 (이자 미포함)');
      break;
    case 2:
      targetPrincipal = principal;
      targetInterest = interest;
      baseMonths = 60;
      notes.push('원리금 기준 60개월 분할');
      break;
    case 3:
      targetPrincipal = principal;
      targetInterest = interest;
      baseMonths = 60;
      notes.push('3~5년에 원금 완납 후 이자 추가 변제');
      break;
    case 4:
      targetPrincipal = principal;
      targetInterest = interest;
      baseMonths = 36;
      notes.push('36개월 내 원금 완납 후 이자 추가 변제');
      break;
    case 5:
      targetPrincipal = principal;
      targetInterest = interest;
      baseMonths = 36;
      notes.push('36개월 내 원리금 100% 변제');
      break;
    case 6:
      targetPrincipal = principal;
      targetInterest = 0;
      baseMonths = 36;
      notes.push('원금만 변제 — 이자 무시 (김한경 케이스)');
      break;
  }

  const denom = targetPrincipal + targetInterest;
  let months: RepaymentPeriod = input.forcedMonths ?? baseMonths;

  // 청산가치 보장 post-step (축 B)
  let pv = presentValue(input.monthlyAvailable, months);
  if (pv < input.liquidationValue) {
    notes.push(`청산가치(${input.liquidationValue}) 미충족 — 기간 연장 시도`);
    for (const m of [48, 60] as const) {
      if (m <= months) continue;
      const p = presentValue(input.monthlyAvailable, m);
      if (p >= input.liquidationValue) {
        months = m;
        pv = p;
        notes.push(`→ ${m}개월에서 충족`);
        break;
      }
    }
    if (pv < input.liquidationValue) {
      // 60개월 강제 시도
      const p60 = presentValue(input.monthlyAvailable, 60);
      months = 60;
      pv = p60;
    }
  }

  const liquidationGuaranteed = pv >= input.liquidationValue;
  if (!liquidationGuaranteed) {
    notes.push('60개월에도 청산가치 미달 — 보장 위배 플래그');
  }

  const totalScheduled = input.monthlyAvailable * months;
  const ratePrincipal = targetPrincipal > 0 ? totalScheduled / targetPrincipal : 0;
  const rateInterest = targetInterest > 0 ? totalScheduled / targetInterest : 0;

  return {
    setting: input.setting,
    targetPrincipal,
    targetInterest,
    targetDenominator: denom,
    months,
    totalScheduled,
    ratePrincipal,
    rateInterest,
    liquidationGuaranteed,
    notes,
  };
}
