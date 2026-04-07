import { describe, expect, it } from 'vitest';
import { adjustLivingCost, minimumLivingCost } from '@/lib/rehabilitation/living-cost';

describe('생계비 자동 조정', () => {
  it('2026 1인 가구 최저 생계비 = 1,538,543원', () => {
    expect(minimumLivingCost(1, 2026)).toBe(1_538_543);
  });

  it('2026 3인 가구 최저 생계비 = 3,215,422원', () => {
    expect(minimumLivingCost(3, 2026)).toBe(3_215_422);
  });

  it('입력값이 기준 이상이면 그대로 통과', () => {
    const result = adjustLivingCost(2_000_000, 1, 2026);
    expect(result.wasClamped).toBe(false);
    expect(result.adjusted).toBe(2_000_000);
    expect(result.floor).toBe(1_538_543);
  });

  it('입력값이 기준 미만이면 자동으로 끌어올림', () => {
    const result = adjustLivingCost(1_000_000, 1, 2026);
    expect(result.wasClamped).toBe(true);
    expect(result.adjusted).toBe(1_538_543);
    expect(result.floor).toBe(1_538_543);
  });

  it('2025 3인 가구 = 3,015,212원', () => {
    expect(minimumLivingCost(3, 2025)).toBe(3_015_212);
  });
});
