import { describe, expect, it } from 'vitest';
import {
  buildAdjustedSchedule,
  formatRepaymentRate,
} from '@/lib/rehabilitation/rounding';

describe('라운딩 + 마지막달 보정 (P1-9)', () => {
  it('김한경 36개월 — 1~12회 561,457 / 13~36회 561,461', () => {
    const r = buildAdjustedSchedule({
      monthlyAvailable: 561_457,
      months: 36,
      totalTarget: 20_212_548,
    });
    expect(r.basePayment).toBe(561_457);
    expect(r.diff).toBe(96);
    expect(r.adjustmentStartIndex).toBe(13);
    expect(r.perAdjustment).toBe(4); // ceil(96/24)
    expect(r.rows[0].amount).toBe(561_457); // 1회차
    expect(r.rows[11].amount).toBe(561_457); // 12회차
    expect(r.rows[12].amount).toBe(561_461); // 13회차
    expect(r.rows[35].amount).toBe(561_461); // 36회차
    expect(r.total).toBe(20_212_548);
  });

  it('보정 불필요 (diff=0)', () => {
    const r = buildAdjustedSchedule({
      monthlyAvailable: 500_000,
      months: 36,
    });
    expect(r.diff).toBe(0);
    expect(r.total).toBe(500_000 * 36);
    expect(r.rows.every((x) => x.amount === 500_000)).toBe(true);
  });

  it('마지막달 잔여 흡수 — diff가 perAdjustment로 정확히 안 떨어질 때', () => {
    // diff=100, 24회 분산 → ceil(100/24)=5, 5×24=120, 마지막달 -20 흡수
    const r = buildAdjustedSchedule({
      monthlyAvailable: 100_000,
      months: 36,
      totalTarget: 100_000 * 36 + 100,
    });
    expect(r.perAdjustment).toBe(5);
    expect(r.total).toBe(100_000 * 36 + 100);
    // 마지막달은 100,000 + 5 - 20 = 100,000 - 15? 또는 다른 흡수 방식
    // 핵심은 합계가 정확히 일치
    expect(r.rows.reduce((s, x) => s + x.amount, 0)).toBe(100_000 * 36 + 100);
  });

  it('months ≤ 12면 마지막달 단독 흡수', () => {
    const r = buildAdjustedSchedule({
      monthlyAvailable: 500_000,
      months: 6,
      totalTarget: 500_000 * 6 + 30,
    });
    expect(r.basePayment).toBe(500_000);
    expect(r.diff).toBe(30);
    // 첫 5회 base, 마지막 1회에 30원 가산
    expect(r.rows[0].amount).toBe(500_000);
    expect(r.rows[4].amount).toBe(500_000);
    expect(r.rows[5].amount).toBe(500_030);
    expect(r.total).toBe(500_000 * 6 + 30);
  });

  it('floor 적용: 가용소득에 소수가 있으면 버림', () => {
    const r = buildAdjustedSchedule({
      monthlyAvailable: 561_457.7,
      months: 36,
    });
    expect(r.basePayment).toBe(561_457);
  });
});

describe('변제율 포맷 (P1-9)', () => {
  it('정수 자리 (digits=0)', () => {
    expect(formatRepaymentRate(0.38748)).toBe('39%');
    expect(formatRepaymentRate(0.5)).toBe('50%');
    expect(formatRepaymentRate(0)).toBe('0%');
  });

  it('소수 한자리 (digits=1)', () => {
    expect(formatRepaymentRate(0.38748, 1)).toBe('38.7%');
    expect(formatRepaymentRate(0.39, 1)).toBe('39.0%');
  });
});
