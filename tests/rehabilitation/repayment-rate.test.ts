import { describe, expect, it } from 'vitest';
import { repaymentRate } from '@/lib/rehabilitation/repayment-rate';
import type { RehabCreditor, CreditorRepaySchedule } from '@/lib/rehabilitation/types';

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
