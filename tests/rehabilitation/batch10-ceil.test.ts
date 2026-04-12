import { describe, expect, it } from 'vitest';
import { generateRepaySchedule } from '@/lib/rehabilitation/schedule-generator';
import type { RehabCreditor } from '@/lib/rehabilitation/types';

function makeCreditor(overrides: Partial<RehabCreditor> & { id: string; capital: number }): RehabCreditor {
  return {
    bondNumber: 1,
    classify: '법인',
    creditorName: '',
    branchName: '',
    postalCode: '',
    address: '',
    phone: '',
    fax: '',
    mobile: '',
    bondCause: '',
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
    ...overrides,
  };
}

describe('Math.ceil 올림 + 마지막 채권자 음수 방지', () => {
  it('일반 케이스 — 채권자 3명, 월변제 100,000원, 원금 비율 50:30:20', () => {
    const creditors = [
      makeCreditor({ id: 'a', capital: 5_000_000, bondNumber: 1 }),
      makeCreditor({ id: 'b', capital: 3_000_000, bondNumber: 2 }),
      makeCreditor({ id: 'c', capital: 2_000_000, bondNumber: 3 }),
    ];
    const schedule = generateRepaySchedule(creditors, 100_000, 36, 0, 'sequential', true);

    expect(schedule).toHaveLength(3);
    for (const s of schedule) {
      expect(s.monthlyAmount).toBeGreaterThanOrEqual(0);
      expect(s.totalAmount).toBeGreaterThanOrEqual(0);
    }

    // 올림이므로 합계 ≥ 월변제액
    const monthlySum = schedule.reduce((s, r) => s + r.monthlyAmount, 0);
    expect(monthlySum).toBeGreaterThanOrEqual(100_000);
  });

  it('priority + 일반 혼합 — priorityTotal이 전체의 60%', () => {
    const creditors = [
      makeCreditor({ id: 'p1', capital: 3_000_000, bondNumber: 1, hasPriorityRepay: true }),
      makeCreditor({ id: 'p2', capital: 3_000_000, bondNumber: 2, hasPriorityRepay: true }),
      makeCreditor({ id: 'g1', capital: 2_000_000, bondNumber: 3 }),
      makeCreditor({ id: 'g2', capital: 2_000_000, bondNumber: 4 }),
    ];
    const schedule = generateRepaySchedule(creditors, 200_000, 36, 0, 'sequential', true);

    expect(schedule).toHaveLength(4);
    for (const s of schedule) {
      expect(s.monthlyAmount).toBeGreaterThanOrEqual(0);
      expect(s.totalAmount).toBeGreaterThanOrEqual(0);
    }

    // 우선변제 채권자 100% 변제
    const p1 = schedule.find((s) => s.creditorId === 'p1')!;
    const p2 = schedule.find((s) => s.creditorId === 'p2')!;
    expect(p1.totalAmount).toBe(3_000_000);
    expect(p2.totalAmount).toBe(3_000_000);
  });

  it('극단 fractional — 월변제 7원, 비율 1:1:1 (ceil(7/3)=3)', () => {
    const creditors = [
      makeCreditor({ id: 'x', capital: 100, bondNumber: 1 }),
      makeCreditor({ id: 'y', capital: 100, bondNumber: 2 }),
      makeCreditor({ id: 'z', capital: 100, bondNumber: 3 }),
    ];
    const schedule = generateRepaySchedule(creditors, 7, 36, 0, 'sequential', true);

    expect(schedule).toHaveLength(3);
    for (const s of schedule) {
      expect(s.monthlyAmount).toBeGreaterThanOrEqual(0);
    }

    // ceil(7 * 100/300) = ceil(2.33) = 3 → 첫 2명 합 6, 마지막 max(0, 7-6)=1
    const monthlySum = schedule.reduce((s, r) => s + r.monthlyAmount, 0);
    expect(monthlySum).toBeGreaterThanOrEqual(7);
  });

  it('극단 fractional — 월변제 5원, 비율 1:1:1 (ceil(5/3)=2)', () => {
    const creditors = [
      makeCreditor({ id: 'x', capital: 100, bondNumber: 1 }),
      makeCreditor({ id: 'y', capital: 100, bondNumber: 2 }),
      makeCreditor({ id: 'z', capital: 100, bondNumber: 3 }),
    ];
    const schedule = generateRepaySchedule(creditors, 5, 36, 0, 'sequential', true);

    expect(schedule).toHaveLength(3);
    for (const s of schedule) {
      expect(s.monthlyAmount).toBeGreaterThanOrEqual(0);
    }

    // ceil(5 * 100/300) = ceil(1.67) = 2 → 첫 2명 합 4, 마지막 max(0, 5-4)=1
    const monthlySum = schedule.reduce((s, r) => s + r.monthlyAmount, 0);
    expect(monthlySum).toBeGreaterThanOrEqual(5);
  });
});
