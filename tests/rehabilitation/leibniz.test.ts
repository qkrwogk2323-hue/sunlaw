import { describe, expect, it } from 'vitest';
import {
  presentValue,
  LEIBNIZ_REHAB,
  discountByLeibniz,
  getLeibnizCoefficient,
} from '@/lib/rehabilitation/leibniz';

describe('라이프니츠 현가계수 (P0-1)', () => {
  it('공표 4자리 표값 — 36/48/60', () => {
    expect(LEIBNIZ_REHAB[36]).toBe(33.7719);
    expect(LEIBNIZ_REHAB[48]).toBe(43.9555);
    expect(LEIBNIZ_REHAB[60]).toBe(53.6433);
  });

  it('김한경: presentValue(561457, 36) === 18,961,469 (버림)', () => {
    // 561457 × 33.7719 = 18,961,469.6583 → 버림 → 18,961,469
    expect(presentValue(561_457, 36)).toBe(18_961_469);
  });

  it('48/60개월 검증 — 561,457원 월변제 기준 (버림)', () => {
    // 561457 × 43.9555 = 24,679,123.0435 → 버림
    expect(presentValue(561_457, 48)).toBe(24_679_123);
    // 561457 × 53.6433 = 30,118,406.1681 → 버림
    expect(presentValue(561_457, 60)).toBe(30_118_406);
  });

  it('지원되지 않는 개월 → throw', () => {
    expect(() => presentValue(500_000, 24 as never)).toThrow(/24/);
  });
});

describe('라이프니츠 하위 호환 함수', () => {
  it('discountByLeibniz는 동일 결과', () => {
    expect(discountByLeibniz(561_457, 36)).toBe(18_961_469);
  });

  it('getLeibnizCoefficient: 미보유 기간은 null', () => {
    expect(getLeibnizCoefficient(36)).toBe(33.7719);
    expect(getLeibnizCoefficient(72)).toBeNull();
  });
});
