import { describe, expect, it } from 'vitest';
import { classifyCreditor } from '@/lib/rehabilitation/creditor-classification';

describe('classifyCreditor', () => {
  it('김한경 제이비우리캐피탈 — 별제권부 담보 부족액 도출', () => {
    const result = classifyCreditor({
      totalClaim: 23_835_499,
      isSecured: true,
      securedCollateralValue: 10_680_000,
      isOtherUnconfirmed: false,
    });
    expect(result).toEqual({
      confirmedAmount: 0,
      unconfirmedAmount: 13_155_499,
      securedCoveredAmount: 10_680_000,
    });
  });

  it('일반 무담보 채권 — 전액 확정', () => {
    const result = classifyCreditor({
      totalClaim: 5_000_000,
      isSecured: false,
      securedCollateralValue: 0,
      isOtherUnconfirmed: false,
    });
    expect(result).toEqual({
      confirmedAmount: 5_000_000,
      unconfirmedAmount: 0,
      securedCoveredAmount: 0,
    });
  });

  it('기타 미확정 (신탁재산 등) — 전액 미확정', () => {
    const result = classifyCreditor({
      totalClaim: 8_000_000,
      isSecured: false,
      securedCollateralValue: 0,
      isOtherUnconfirmed: true,
    });
    expect(result).toEqual({
      confirmedAmount: 0,
      unconfirmedAmount: 8_000_000,
      securedCoveredAmount: 0,
    });
  });

  it('별제권부 — 담보평가가 채권액보다 큰 경우 (전액 충당)', () => {
    const result = classifyCreditor({
      totalClaim: 5_000_000,
      isSecured: true,
      securedCollateralValue: 10_000_000,
      isOtherUnconfirmed: false,
    });
    expect(result).toEqual({
      confirmedAmount: 0,
      unconfirmedAmount: 0,
      securedCoveredAmount: 5_000_000,
    });
  });
});
