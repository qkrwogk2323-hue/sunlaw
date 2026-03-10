import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 클래스명을 병합하는 유틸리티 함수
 * Tailwind CSS 클래스를 충돌 없이 결합합니다.
 *
 * @param  {...string} inputs - 결합할 클래스명들
 * @returns {string} - 병합된 클래스명
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
