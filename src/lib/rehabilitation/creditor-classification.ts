/**
 * 채권자 분류 함수 (확정 / 미확정 / 별제권 담보 충당분 도출)
 *
 * colaw 핸들러 분석 결과 (2026-04-07):
 *   - 별제권부 담보 부족액 = totalClaim − securedCollateralValue
 *   - 기타 미확정 (신탁재산 등) = totalClaim 전액
 *   - 두 경로는 상호 배타
 *
 * 김한경 케이스 검증:
 *   제이비우리캐피탈(주) 자동차담보대출 23,835,499원
 *   담보평가 10,680,000원 → 부족액 13,155,499원 (B_29와 원 단위 일치)
 */

export interface CreditorClassification {
  /** 확정 무담보 금액 (변제계획 안분 대상) */
  confirmedAmount: number;
  /** 미확정 금액 (별제권부 부족액 또는 기타 미확정) */
  unconfirmedAmount: number;
  /** 담보로 충당되는 부분 (변제계획 제외) */
  securedCoveredAmount: number;
}

export interface ClassifyInput {
  totalClaim: number;
  isSecured: boolean;
  securedCollateralValue: number;
  isOtherUnconfirmed: boolean;
}

export function classifyCreditor(c: ClassifyInput): CreditorClassification {
  // 경로 B: 기타 미확정 (신탁재산 등) — 전액 미확정
  if (c.isOtherUnconfirmed) {
    return {
      confirmedAmount: 0,
      unconfirmedAmount: c.totalClaim,
      securedCoveredAmount: 0,
    };
  }

  // 경로 A: 별제권부 담보 — 담보평가액까지는 별제권으로 회수, 부족분은 미확정
  if (c.isSecured) {
    const covered = Math.min(c.securedCollateralValue, c.totalClaim);
    const deficiency = Math.max(0, c.totalClaim - covered);
    return {
      confirmedAmount: 0,
      unconfirmedAmount: deficiency,
      securedCoveredAmount: covered,
    };
  }

  // 일반 무담보 — 전액 확정
  return {
    confirmedAmount: c.totalClaim,
    unconfirmedAmount: 0,
    securedCoveredAmount: 0,
  };
}
