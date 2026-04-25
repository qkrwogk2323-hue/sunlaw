import { describe, expect, it } from 'vitest';
import { buildCreditorListOutput } from '@/lib/rehabilitation/creditor-list-engine';

// Golden case 1: 단순 급여소득자 — 무담보 일반채권 3건
const CASE_1_APPLICATION = {
  applicant_name: '김테스트',
  resident_number_front: '900101',
  court_name: '서울회생법원',
  case_year: '2026',
  case_number: '개회 12345',
};
const CASE_1_SETTINGS = {
  bond_date: '2026-03-15',
  list_date: '2026-04-01',
};
const CASE_1_CREDITORS = [
  { id: 'c1', bond_number: 1, creditor_name: '국민은행', capital: 5_000_000, interest: 500_000, bond_cause: '신용대출', is_secured: false },
  { id: 'c2', bond_number: 2, creditor_name: '신한카드', capital: 3_000_000, interest: 300_000, bond_cause: '카드대금', is_secured: false },
  { id: 'c3', bond_number: 3, creditor_name: '하나은행', capital: 2_000_000, interest: 200_000, bond_cause: '마이너스통장', is_secured: false },
];

// Golden case 2: 보증인·대위변제 포함
const CASE_2_CREDITORS = [
  { id: 'c1', bond_number: 1, creditor_name: '국민은행', capital: 10_000_000, interest: 1_000_000, bond_cause: '주택담보대출', is_secured: true, secured_collateral_value: 7_000_000, guarantor_amount: 3_000_000, guarantor_name: '이보증', bond_type: '주채무' },
  { id: 'c2', bond_number: 2, creditor_name: '신한은행', capital: 5_000_000, interest: 500_000, bond_cause: '신용대출', is_secured: false },
  { id: 'c3', bond_number: 1, creditor_name: '이보증', capital: 3_000_000, interest: 0, bond_cause: '구상채권', is_secured: false, parent_creditor_id: 'c1', sub_number: 1 },
];

// Golden case 3: 미확정 채권 포함
const CASE_3_CREDITORS = [
  { id: 'c1', bond_number: 1, creditor_name: '우리은행', capital: 8_000_000, interest: 800_000, bond_cause: '신용대출', is_secured: false },
  { id: 'c2', bond_number: 2, creditor_name: '별제권은행', capital: 20_000_000, interest: 2_000_000, bond_cause: '근저당', is_secured: true, secured_collateral_value: 17_000_000, remaining_unsecured: 5_000_000 },
  { id: 'c3', bond_number: 3, creditor_name: '미확정채권자', capital: 3_000_000, interest: 0, bond_cause: '소송 중', is_secured: false, is_unsettled: true, unsettled_reason: '채권액 다툼' },
];

describe('buildCreditorListOutput', () => {
  describe('Golden case 1: 단순 급여소득자', () => {
    const output = buildCreditorListOutput(CASE_1_APPLICATION, CASE_1_SETTINGS, CASE_1_CREDITORS);

    it('header에 신청인·법원·사건번호 정확', () => {
      expect(output.header.debtorName).toBe('김테스트');
      expect(output.header.courtName).toBe('서울회생법원');
      expect(output.header.caseNumber).toBe('2026 개회 12345');
      expect(output.header.assessmentDate).toBe('2026-03-15');
    });

    it('summary 합계 정확', () => {
      expect(output.summary.totalCapital).toBe(10_000_000);
      expect(output.summary.totalInterest).toBe(1_000_000);
      expect(output.summary.totalAmount).toBe(11_000_000);
      expect(output.summary.securedTotal).toBe(0);
      expect(output.summary.unsecuredTotal).toBe(11_000_000);
    });

    it('rows 3건 정렬 bond_number 순', () => {
      expect(output.rows).toHaveLength(3);
      expect(output.rows[0].bondNumber).toBe('1');
      expect(output.rows[1].bondNumber).toBe('2');
      expect(output.rows[2].bondNumber).toBe('3');
    });

    it('미확정채권 0건', () => {
      expect(output.unsettledRows).toHaveLength(0);
    });
  });

  describe('Golden case 2: 보증인·대위변제', () => {
    const output = buildCreditorListOutput(CASE_1_APPLICATION, CASE_1_SETTINGS, CASE_2_CREDITORS);

    it('가지번호 정렬 — 보증인(1-1)이 주채무자(1) 뒤에 위치', () => {
      const bondNumbers = output.rows.map((r) => r.bondNumber);
      const idx1 = bondNumbers.indexOf('1');
      const idx1_1 = bondNumbers.indexOf('1-1');
      expect(idx1).toBeLessThan(idx1_1);
    });

    it('대위변제 비고 문구 포함', () => {
      const mainDebtor = output.rows.find((r) => r.bondNumber === '1');
      expect(mainDebtor?.subrogationNote).toContain('일부대위변제');
      expect(mainDebtor?.subrogationNote).toContain('이보증');
      expect(mainDebtor?.subrogationNote).toContain('3,000,000');
    });

    it('담보부 합계 = 담보가치 회수분만 (부족액은 무담보)', () => {
      // 국민은행: totalClaim=11M, collateral=7M → secured=7M, deficiency=4M
      expect(output.summary.securedTotal).toBe(7_000_000);
      expect(output.summary.unsecuredTotal).toBe(4_000_000 + 5_500_000 + 3_000_000); // deficiency + 신한 + 이보증
    });
  });

  describe('Golden case 3: 미확정 채권', () => {
    const output = buildCreditorListOutput(CASE_1_APPLICATION, CASE_1_SETTINGS, CASE_3_CREDITORS);

    it('미확정채권 2건 (is_unsettled + secured remaining)', () => {
      expect(output.unsettledRows).toHaveLength(2);
    });

    it('is_unsettled 채권의 사유 표시', () => {
      const unsettled = output.unsettledRows.find((r) => r.creditorName === '미확정채권자');
      expect(unsettled?.reason).toBe('채권액 다툼');
      expect(unsettled?.amount).toBe(3_000_000);
    });

    it('별제권 부족액 채권의 사유 표시', () => {
      const secured = output.unsettledRows.find((r) => r.creditorName === '별제권은행');
      expect(secured?.reason).toBe('별제권행사 부족액');
      expect(secured?.amount).toBe(5_000_000);
    });
  });

  it('빈 채권자 목록 → 합계 0, rows 0', () => {
    const output = buildCreditorListOutput(CASE_1_APPLICATION, CASE_1_SETTINGS, []);
    expect(output.summary.totalAmount).toBe(0);
    expect(output.rows).toHaveLength(0);
    expect(output.unsettledRows).toHaveLength(0);
  });
});
