import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

/**
 * 날짜를 포맷팅하는 함수
 * @param {string|Date|null} date - 포맷팅할 날짜
 * @param {string} formatStr - 날짜 포맷 문자열 (기본값: 'yyyy-MM-dd')
 * @returns {string} 포맷팅된 날짜 문자열
 */
export function formatDate(date, formatStr = "yyyy-MM-dd") {
  if (!date) return "-";

  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, formatStr, { locale: ko });
  } catch (error) {
    console.error("날짜 포맷 에러:", error);
    return "-";
  }
}

/**
 * 숫자를 통화 형식으로 포맷팅하는 함수
 * @param {number|string|null} amount - 포맷팅할 금액
 * @param {string} currency - 통화 코드 (기본값: 'KRW')
 * @returns {string} 포맷팅된 통화 문자열
 */
export function formatCurrency(amount, currency = "KRW") {
  if (amount === null || amount === undefined || amount === "") return "-";

  try {
    const numberAmount = typeof amount === "string" ? parseFloat(amount) : amount;

    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: currency,
    }).format(numberAmount);
  } catch (error) {
    console.error("금액 포맷 에러:", error);
    return "-";
  }
}

/**
 * 숫자에 천 단위 구분 기호를 추가하는 함수
 * @param {number|string|null} number - 포맷팅할 숫자
 * @returns {string} 포맷팅된 숫자 문자열
 */
export function formatNumber(number) {
  if (number === null || number === undefined || number === "") return "-";

  try {
    const num = typeof number === "string" ? parseFloat(number) : number;
    return new Intl.NumberFormat("ko-KR").format(num);
  } catch (error) {
    console.error("숫자 포맷 에러:", error);
    return "-";
  }
}

/**
 * 파일 크기를 읽기 쉬운 형식으로 포맷팅하는 함수
 * @param {number} bytes - 바이트 단위의 파일 크기
 * @returns {string} 포맷팅된 파일 크기 문자열
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * 전화번호 포맷팅 함수
 * @param {string} phoneNumber - 포맷팅할 전화번호
 * @returns {string} 포맷팅된 전화번호 문자열
 */
export function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return "-";

  // 숫자만 추출
  const numbers = phoneNumber.replace(/\D/g, "");

  // 한국 전화번호 포맷 적용 (010-1234-5678)
  if (numbers.length === 11) {
    return numbers.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  }
  // 8자리 전화번호 (12345678 -> 1234-5678)
  else if (numbers.length === 8) {
    return numbers.replace(/(\d{4})(\d{4})/, "$1-$2");
  }
  // 그 외에는 원래 값 반환
  return phoneNumber;
}

/**
 * 이메일 유효성 검사 함수
 * @param {string} email - 검사할 이메일 주소
 * @returns {boolean} 유효한 이메일 여부
 */
export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * 주어진 글자수로 텍스트를 자르고 말줄임표(...) 추가하는 함수
 * @param {string} text - 원본 텍스트
 * @param {number} maxLength - 최대 글자수
 * @returns {string} 잘린 텍스트
 */
export function truncateText(text, maxLength = 50) {
  if (!text) return "";
  if (text.length <= maxLength) return text;

  return text.substring(0, maxLength) + "...";
}
