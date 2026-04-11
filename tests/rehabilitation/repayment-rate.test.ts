import { describe, expect, it } from 'vitest';
import { repaymentRate } from '@/lib/rehabilitation/repayment-rate';
import { calculateRepayment, getDebtSummary } from '@/lib/rehabilitation/repayment-calculator';
import type { RehabCreditor, CreditorRepaySchedule, RepaymentInput } from '@/lib/rehabilitation/types';

describe('변제율 계산', () => {
  it('전액 무담보, 50% 변제 → 50%', () => {
    const creditors: RehabCreditor[] = [
      {
        id: 'c1', bondNumber: 1, classify: '법인', creditorName: 'A', branchName: '',
        postalCode: '', address: '', phone: '', fax: '', mobile: '',
        bondCause: '', capital: 10_000_000, capitalCompute: '', interest: 0, interestCompute: '',
        delayRate: 0, bondContent: '', isSecured: false, securedPropertyId: null,
        lienPriority: 0, lienType: '', maxClaimAmount: 0, hasPriorityRepay: false,
        isUnsettled: false, isAnnuityDebt: false, applyRestructuring: false,
        attachments: [], unsettledReason: '', unsettledAmount: 0, unsettledText: '',
        guarantorName: '', guarantorAmount: 0, guarantorText: '',
      },
    ];
    const schedules: CreditorRepaySchedule[] = [
      {
        creditorId: 'c1', ratio: 0.5, monthlyAmount: 0, totalAmount: 5_000_000,
        capitalRepay: 5_000_000, interestRepay: 0,
        confirmedAmount: 5_000_000, unconfirmedAmount: 0,
      },
    ];

    const result = repaymentRate(schedules, creditors);
    expect(result.numerator).toBe(5_000_000);
    expect(result.denominator).toBe(10_000_000);
    expect(result.ratePercent).toBe(50);
  });

  it('별제권 담보 충당분은 분모·분자에서 제외', () => {
    const creditors: RehabCreditor[] = [
      {
        id: 'c1', bondNumber: 1, classify: '법인', creditorName: '제이비우리캐피탈', branchName: '',
        postalCode: '', address: '', phone: '', fax: '', mobile: '',
        bondCause: '', capital: 23_835_499, capitalCompute: '', interest: 0, interestCompute: '',
        delayRate: 0, bondContent: '', isSecured: true, securedPropertyId: null,
        securedCollateralValue: 10_680_000,
        lienPriority: 0, lienType: '', maxClaimAmount: 0, hasPriorityRepay: false,
        isUnsettled: false, isAnnuityDebt: false, applyRestructuring: false,
        attachments: [], unsettledReason: '', unsettledAmount: 0, unsettledText: '',
        guarantorName: '', guarantorAmount: 0, guarantorText: '',
      },
    ];
    const schedules: CreditorRepaySchedule[] = [
      {
        creditorId: 'c1', ratio: 0, monthlyAmount: 0, totalAmount: 5_000_000,
        capitalRepay: 5_000_000, interestRepay: 0,
        confirmedAmount: 0, unconfirmedAmount: 5_000_000,
      },
    ];

    const result = repaymentRate(schedules, creditors);
    // 분모: 13,155,499 (담보 10,680,000 제외 → 부족액)
    expect(result.denominator).toBe(13_155_499);
    expect(result.numerator).toBe(5_000_000);
  });
});

describe('calculateRepayment 변제율 분모 (P0 — 무담보 원금)', () => {
  /**
   * 김한경 케이스 (anatomy §9.2 + capital36 옵션):
   *
   * 채권 구성 (anatomy §9.2 합계 기준 가설 분배):
   *   - 제이비우리캐피탈: 23,835,499 / 별제권 담보 10,680,000 → 부족 13,155,499
   *   - 인천세무서: 7,067,290 (조세, 일반 무담보)
   *   - 나머지 8건 합계: 31,941,727 (원금) + 4,549,968 (이자)
   *
   * unsecuredCapital (분모):
   *   13,155,499 + 7,067,290 + 31,941,727 = 52,164,516
   *
   * capital36 결과:
   *   monthlyAvailable 561,457 × 36 = 20,212,452
   *   변제율 = 20,212,452 / 52,164,516 = 38.748...% → 표기 39%
   *
   * 기존 totalDebt 분모(67,394,484)였다면 30.0%였음.
   */
  it('김한경 capital36 — 변제율 39% (anatomy 일치)', () => {
    const input: RepaymentInput = {
      creditors: [
        {
          capital: 23_835_499,
          interest: 0,
          isSecured: true,
          securedCollateralValue: 10_680_000,
          hasPriorityRepay: false,
        },
        {
          capital: 7_067_290,
          interest: 0,
          isSecured: false,
          hasPriorityRepay: false,
        },
        {
          capital: 31_941_727,
          interest: 4_549_968,
          isSecured: false,
          hasPriorityRepay: false,
        },
      ],
      securedResults: [],
      monthlyIncome: 2_100_000,
      livingCost: 1_538_543,
      extraLivingCost: 0,
      childSupport: 0,
      trusteeCommRate: 0,
      disposeAmount: 0,
      repayOption: 'capital36',
      liquidationValue: 0,
    };

    const result = calculateRepayment(input);
    expect(result).not.toBeNull();
    expect(result!.repayMonths).toBe(36);
    // 가용소득 = 2,100,000 - 1,538,543 = 561,457
    expect(result!.monthlyAvailable).toBe(561_457);
    // 변제율 분모 = unsecuredCapital = 52,164,516
    // 분자 = monthlyRepay × 36
    // 표기 39% 매칭 확인 (반올림)
    expect(Math.round(result!.repayRate)).toBe(39);
  });

  it('getDebtSummary — unsecuredCapital 정확 산출', () => {
    const summary = getDebtSummary(
      [
        // 별제권부 채권: 부족분만 포함
        { capital: 23_835_499, interest: 0, isSecured: true, securedCollateralValue: 10_680_000 },
        // 일반 무담보: 전액
        { capital: 7_067_290, interest: 0, isSecured: false },
        { capital: 31_941_727, interest: 4_549_968, isSecured: false },
      ],
      [],
    );
    // 무담보 원금: 13,155,499 + 7,067,290 + 31,941,727 = 52,164,516
    expect(summary.unsecuredCapital).toBe(52_164_516);
    // 총 채무: 67,394,484
    expect(summary.totalDebt).toBe(67_394_484);
    // 총 원금: 62,844,516
    expect(summary.totalCapital).toBe(62_844_516);
  });
});
