import { describe, expect, it } from 'vitest';
import { adjustLivingCost, minimumLivingCost } from '@/lib/rehabilitation/living-cost';
import { getMedianIncome60 } from '@/lib/rehabilitation/median-income';

describe('생계비 자동 조정 (P1-1)', () => {
  it('2026 1인 가구 = 1,538,542원 (floor)', () => {
    expect(minimumLivingCost(1, 2026)).toBe(1_538_542);
  });

  it('2026 3인 가구 = 3,215,421원 (floor)', () => {
    expect(minimumLivingCost(3, 2026)).toBe(3_215_421);
  });

  it('2025 3인 가구 = 3,015,211원', () => {
    expect(minimumLivingCost(3, 2025)).toBe(3_015_211);
  });

  it('입력값이 기준 이상이면 그대로 통과', () => {
    const result = adjustLivingCost(2_000_000, 1, 2026);
    expect(result.wasClamped).toBe(false);
    expect(result.adjusted).toBe(2_000_000);
    expect(result.floor).toBe(1_538_542);
  });

  it('입력값이 기준 미만이면 자동으로 끌어올림', () => {
    const result = adjustLivingCost(1_000_000, 1, 2026);
    expect(result.wasClamped).toBe(true);
    expect(result.adjusted).toBe(1_538_542);
    expect(result.floor).toBe(1_538_542);
  });
});

describe('getMedianIncome60 — 연도 분기', () => {
  it('2024 3인 = 2,828,794원', () => {
    expect(getMedianIncome60(3, 2024)).toBe(2_828_794);
  });

  it('2025 3인 = 3,015,211원', () => {
    expect(getMedianIncome60(3, 2025)).toBe(3_015_211);
  });

  it('2026 3인 = 3,215,421원', () => {
    expect(getMedianIncome60(3, 2026)).toBe(3_215_421);
  });

  it('미등록 연도는 throw', () => {
    expect(() => getMedianIncome60(3, 2099)).toThrow('2099년 수치 미등록');
  });
});
