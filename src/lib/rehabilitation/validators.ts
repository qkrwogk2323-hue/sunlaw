/**
 * 개인회생 입력값 검증 유틸리티
 */

/**
 * 주민등록번호 앞자리(6자리) 형식을 검증합니다.
 */
export function validateResidentFront(front: string): boolean {
  if (!front || front.length !== 6) return false;
  const cleaned = front.replace(/[^0-9]/g, '');
  if (cleaned.length !== 6) return false;

  const month = parseInt(cleaned.substring(2, 4), 10);
  const day = parseInt(cleaned.substring(4, 6), 10);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  return true;
}

/**
 * 주민등록번호 뒷자리(7자리) 형식을 검증합니다.
 */
export function validateResidentBack(back: string): boolean {
  if (!back) return false;
  const cleaned = back.replace(/[^0-9]/g, '');
  return cleaned.length === 7;
}

/**
 * 전화번호에 하이픈을 자동 삽입합니다.
 */
export function formatPhoneNumber(value: string): string {
  const v = value.replace(/[^0-9]/g, '');

  if (v.length >= 11) {
    return `${v.substring(0, 3)}-${v.substring(3, 7)}-${v.substring(7, 11)}`;
  }

  if (v.length >= 7) {
    if (v.startsWith('02')) {
      const mid = v.length - 4;
      return `${v.substring(0, 2)}-${v.substring(2, mid)}-${v.substring(mid)}`;
    }
    const mid = v.length - 4;
    return `${v.substring(0, 3)}-${v.substring(3, mid)}-${v.substring(mid)}`;
  }

  return v;
}

/**
 * 금액 숫자를 콤마 포맷 문자열로 변환합니다.
 */
export function formatMoney(n: number): string {
  return Math.floor(n).toLocaleString('ko-KR');
}

/**
 * 콤마 포맷 문자열을 숫자로 변환합니다.
 */
export function parseMoney(s: string): number {
  return Math.max(0, parseInt(String(s).replace(/[^0-9]/g, ''), 10) || 0);
}

/**
 * 개인회생 자격 한도를 검증합니다.
 * 담보부 15억, 무담보 10억 초과 시 대상 외
 */
export function validateDebtLimits(
  securedDebt: number,
  unsecuredDebt: number,
): {
  valid: boolean;
  message: string | null;
} {
  if (securedDebt >= 1_500_000_000) {
    return {
      valid: false,
      message: `담보부채무 ${formatMoney(securedDebt)}원이 15억원 이상이므로 개인회생신청 대상이 아닙니다.`,
    };
  }

  if (unsecuredDebt >= 1_000_000_000) {
    return {
      valid: false,
      message: `무담보부채무 ${formatMoney(unsecuredDebt)}원이 10억원 이상이므로 개인회생신청 대상이 아닙니다.`,
    };
  }

  return { valid: true, message: null };
}

/**
 * 변제기간 유효성을 검증합니다 (1~120개월).
 */
export function validateRepayMonths(months: number): boolean {
  return Number.isInteger(months) && months >= 1 && months <= 120;
}
