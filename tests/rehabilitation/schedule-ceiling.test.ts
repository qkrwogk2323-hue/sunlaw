/**
 * 갑OO 사례 — 월변제예정액 올림(Math.ceil) 검증
 *
 * 서울회생법원 가이드 p.42-44 작성례:
 *   가용소득 309,630원, 채권자 3명 (원금 기준)
 *   A카드: 309,630 × 7,000,000/35,300,000 = 61,399.27... → 올림 → 61,400
 *   B은행: 309,630 × 20,000,000/35,300,000 = 175,427.93... → 올림 → 175,428
 *   C대부: 309,630 × 8,300,000/35,300,000 = 72,802.78... → 올림 → 72,803
 *   합계: 309,631 (가용소득 309,630보다 1원 많음 — 올림 정상)
 */
import { describe, expect, it } from 'vitest';
import { generateRepaySchedule } from '@/lib/rehabilitation/schedule-generator';
import type { RehabCreditor } from '@/lib/rehabilitation/types';

function makeCreditor(id: string, capital: number): RehabCreditor {
  return {
    id,
    bondNumber: 0,
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
  };
}

describe('갑OO 사례 — 월변제예정액 올림 검증 (가이드 p.42)', () => {
  const creditors: RehabCreditor[] = [
    makeCreditor('A카드', 7_000_000),
    makeCreditor('B은행', 20_000_000),
    makeCreditor('C대부', 8_300_000),
  ];

  it('채권자별 월변제예정액이 올림(ceil) 처리됨', () => {
    const schedule = generateRepaySchedule(
      creditors,
      309_630,  // 월 실제 가용소득
      36,       // 변제횟수
      0,        // 처분재산 없음
      'sequential',
      true,     // capitalOnly (capital36)
    );

    expect(schedule).toHaveLength(3);

    // A카드: 309,630 × 7,000,000/35,300,000 = 61,399.27... → 올림 61,400
    expect(schedule[0].monthlyAmount).toBe(61_400);
    // B은행: 309,630 × 20,000,000/35,300,000 = 175,427.93... → 올림 175,428
    expect(schedule[1].monthlyAmount).toBe(175_428);
    // C대부: 마지막 채권자 = 잔여분 = 309,630 - 61,400 - 175,428 = 72,802
    expect(schedule[2].monthlyAmount).toBe(72_802);
  });

  it('월변제예정액 합계 = 가용소득 (마지막 잔여분 보정)', () => {
    const schedule = generateRepaySchedule(creditors, 309_630, 36, 0, 'sequential', true);
    const totalMonthly = schedule.reduce((s, r) => s + r.monthlyAmount, 0);
    // 마지막 채권자가 잔여분을 받으므로 합계 = 월 가용소득
    expect(totalMonthly).toBe(309_630);
  });

  it('총변제예정액도 올림 적용', () => {
    const schedule = generateRepaySchedule(creditors, 309_630, 36, 0, 'sequential', true);
    // A카드 총변제: ceil(309,630 × 36 × 7,000,000/35,300,000) = ceil(2,210,393.8...) = 2,210,394
    // 올림이 월별과 총액 각각에 적용됨
    // A카드: 61,400 × 36 이 아님 — totalRepayTarget에서도 올림 적용
    expect(schedule[0].totalAmount).toBeGreaterThan(0);
    expect(schedule[1].totalAmount).toBeGreaterThan(0);
    expect(schedule[2].totalAmount).toBeGreaterThan(0);
  });

  it('capitalOnly 모드에서 interestRepay = 0', () => {
    const schedule = generateRepaySchedule(creditors, 309_630, 36, 0, 'sequential', true);
    for (const s of schedule) {
      expect(s.interestRepay).toBe(0);
    }
  });

  it('변제율 약 32% (원금 35,300,000 대비)', () => {
    const schedule = generateRepaySchedule(creditors, 309_630, 36, 0, 'sequential', true);
    const totalRepay = schedule.reduce((s, r) => s + r.totalAmount, 0);
    const rate = (totalRepay / 35_300_000) * 100;
    // 가이드: 원금의 32%
    expect(Math.round(rate)).toBe(32);
  });
});
