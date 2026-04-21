import { describe, expect, it } from 'vitest';
import { normalizeCourtKey, getCourtAdditionalDocs, COURT_ADDITIONAL_DOCS } from '@/lib/rehabilitation/rules/court-required-docs';

describe('normalizeCourtKey', () => {
  it('서울회생법원 → 서울', () => expect(normalizeCourtKey('서울회생법원')).toBe('서울'));
  it('부산지방법원 → 부산', () => expect(normalizeCourtKey('부산지방법원')).toBe('부산'));
  it('대전지방법원 → 대전', () => expect(normalizeCourtKey('대전지방법원')).toBe('대전'));
  it('대구지방법원 → 대구', () => expect(normalizeCourtKey('대구지방법원')).toBe('대구'));
  it('청주지방법원 → 청주', () => expect(normalizeCourtKey('청주지방법원')).toBe('청주'));
  it('춘천지방법원 강릉지원 → 강릉', () => expect(normalizeCourtKey('춘천지방법원 강릉지원')).toBe('강릉'));
  it('알 수 없는 법원 → 공통', () => expect(normalizeCourtKey('제주특별자치도')).toBe('제주'));
  it('빈 문자열 → 공통', () => expect(normalizeCourtKey('')).toBe('공통'));
});

describe('getCourtAdditionalDocs', () => {
  it('서울회생법원 → 추가 서류 4건 포함', () => {
    const docs = getCourtAdditionalDocs('서울회생법원');
    expect(docs.length).toBeGreaterThan(0);
    const allItems = docs.flatMap((d) => d.items);
    expect(allItems).toContain('신용카드 이용내역서(최근 1년분, 각 카드사별)');
    expect(allItems).toContain('건강보험자격득실확인서');
  });

  it('부산지방법원 → 추가 서류 있음', () => {
    const docs = getCourtAdditionalDocs('부산지방법원');
    expect(docs.length).toBeGreaterThan(0);
  });

  it('강릉 → 강릉지원 추가 서류', () => {
    const docs = getCourtAdditionalDocs('춘천지방법원 강릉지원');
    expect(docs.length).toBeGreaterThan(0);
    const allItems = docs.flatMap((d) => d.items);
    expect(allItems.some((item) => item.includes('건강보험'))).toBe(true);
  });

  it('알 수 없는 법원 → 빈 배열 (공통만)', () => {
    const docs = getCourtAdditionalDocs('모르는법원');
    expect(docs).toHaveLength(0);
  });

  it('등록된 모든 법원이 최소 1개 추가 항목을 가짐', () => {
    for (const [key, rule] of Object.entries(COURT_ADDITIONAL_DOCS)) {
      const totalItems = rule.additionalDocs.flatMap((d) => d.items);
      expect(totalItems.length).toBeGreaterThan(0);
    }
  });
});
