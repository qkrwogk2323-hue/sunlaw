import { describe, expect, it } from 'vitest';
import { discountByLeibniz, getLeibnizCoefficient } from '@/lib/rehabilitation/leibniz';

describe('라이프니츠 현가계수', () => {
  it('김한경 케이스 — 36개월, 월가용 561,457원 → 18,961,470원', () => {
    expect(discountByLeibniz(561_457, 36)).toBe(18_961_470);
  });

  it('36개월 계수 = 33.77190060859514', () => {
    expect(getLeibnizCoefficient(36)).toBe(33.77190060859514);
  });

  it('계수 미보유 기간은 null 반환', () => {
    expect(getLeibnizCoefficient(60)).toBeNull();
    expect(discountByLeibniz(500_000, 60)).toBeNull();
  });
});
