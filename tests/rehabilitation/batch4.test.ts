/**
 * Batch 4 테스트 — CSV 필드 매핑 + 채권자목록 요약표
 */
import { describe, expect, it } from 'vitest';
import { convertToEcourtCSV } from '@/lib/rehabilitation/ecourt-csv';
import { generateDocument } from '@/lib/rehabilitation/document-generator';

describe('전자소송 CSV 다운로드', () => {
  it('CSV 필드 매핑이 올바름', () => {
    const csv = convertToEcourtCSV([
      {
        bondNumber: 1,
        name: 'A은행',
        classify: '법인',
        postalCode: '06236',
        address: '서울특별시 강남구 테헤란로 142',
        phone: '02-1234-5678',
        fax: '02-1234-5679',
        mobile: '010-1234-5678',
        bondCause: '대출',
        capital: 10_000_000,
        interest: 500_000,
      },
      {
        bondNumber: 2,
        name: '홍길동',
        classify: '자연인',
        postalCode: '04524',
        address: '서울특별시 중구 세종대로 110 서울시청',
        phone: '',
        fax: '',
        mobile: '010-9876-5432',
        bondCause: '사인간 차용',
        capital: 5_000_000,
        interest: 200_000,
      },
    ]);

    const lines = csv.split('\n');
    // 헤더
    expect(lines[0]).toBe('채권자번호,채권자명,법인/개인,우편번호,도로명주소1,도로명주소2,전화번호,팩스번호,휴대전화번호,채권의원인,원금,이자');
    // A은행 행
    expect(lines[1]).toContain('1,"A은행","법인"');
    expect(lines[1]).toContain('10000000,500000');
    // 홍길동 행 — 개인
    expect(lines[2]).toContain('2,"홍길동","개인"');
    expect(lines[2]).toContain('5000000,200000');
    // 도로명주소 분리 확인
    expect(lines[2]).toContain('"서울특별시 중구 세종대로 110"');
    expect(lines[2]).toContain('"서울시청"');
  });
});

describe('채권자목록 요약표', () => {
  it('구분별 합계가 올바르게 표시됨', () => {
    const html = generateDocument('creditor_summary', {
      application: { applicant_name: '홍길동' },
      creditorSettings: null,
      creditors: [
        { capital: 5_000_000, interest: 100_000, is_secured: false, has_priority_repay: true },
        { capital: 10_000_000, interest: 500_000, is_secured: true, has_priority_repay: false },
        { capital: 7_000_000, interest: 200_000, is_secured: false, has_priority_repay: false },
      ],
      securedProperties: [],
      properties: [],
      propertyDeductions: [],
      familyMembers: [],
      incomeSettings: null,
      affidavit: null,
      planSections: [],
    });

    expect(html).toContain('채 권 자 목 록 요 약 표');
    expect(html).toContain('3명'); // 총 채권자 수
    // 우선변제 1명
    expect(html).toContain('우선변제권 채권');
    // 담보부 1명
    expect(html).toContain('담보부 회생채권');
    // 무담보 1명
    expect(html).toContain('무담보 회생채권');
    // 총합계: 22,800,000
    expect(html).toContain('22,800,000');
  });
});
