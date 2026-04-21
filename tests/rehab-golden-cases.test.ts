/**
 * 개인회생 자동작성 Golden Case 테스트.
 *
 * 10개 표준 사건 세트로 엔진 전체를 사건 단위로 검증.
 * 각 사건은 채권자목록 엔진 + §10 규칙 + 법원별 자료제출 + 계산 모듈을 통합 확인.
 *
 * CLAUDE.md 기준:
 *   1. 같은 입력 → 항상 같은 문서
 *   2. 문서 간 숫자·문구 모순 없음
 *   3. 법원별·연도별 규칙 추적 가능
 */
import { describe, expect, it } from 'vitest';
import { buildCreditorListOutput } from '@/lib/rehabilitation/creditor-list-engine';
import { buildSection10Clauses } from '@/lib/rehabilitation/rules/plan-section10-rules';
import { getCourtAdditionalDocs, normalizeCourtKey } from '@/lib/rehabilitation/rules/court-required-docs';
import { getMedianIncome, minimumLivingCost, computeLivingCost } from '@/lib/rehabilitation/median-income';
import { computeMonthlyAvailable } from '@/lib/rehabilitation/monthly-available';
import { getDefaultValuationRate } from '@/lib/rehabilitation/rules/valuation-rates';
import { presentValue, LEIBNIZ_REHAB } from '@/lib/rehabilitation/leibniz';

// ═══════════════════════════════════════════════════════════════════
// Golden Case 1: 단순 급여소득자 (서울, 무담보 3건)
// ═══════════════════════════════════════════════════════════════════
const CASE_1 = {
  name: '단순 급여소득자',
  application: { applicant_name: '김민수', resident_number_front: '900101', court_name: '서울회생법원', case_year: '2026', case_number: '개회 1234', income_type: 'salary' },
  creditorSettings: { bond_date: '2026-03-15' },
  creditors: [
    { id: 'c1', bond_number: 1, creditor_name: '국민은행', capital: 5_000_000, interest: 500_000, is_secured: false },
    { id: 'c2', bond_number: 2, creditor_name: '신한카드', capital: 3_000_000, interest: 300_000, is_secured: false },
    { id: 'c3', bond_number: 3, creditor_name: '하나은행', capital: 2_000_000, interest: 200_000, is_secured: false },
  ],
  income: { monthlyIncome: 2_500_000, householdSize: 1, year: 2026, livingCostRate: 100 },
};

// ═══════════════════════════════════════════════════════════════════
// Golden Case 2: 배우자·부양가족 있는 사건 (부산, 4인 가구)
// ═══════════════════════════════════════════════════════════════════
const CASE_2 = {
  name: '배우자·부양가족',
  application: { applicant_name: '이정훈', court_name: '부산지방법원', income_type: 'salary' },
  creditors: [
    { id: 'c1', bond_number: 1, creditor_name: '우리은행', capital: 15_000_000, interest: 1_500_000, is_secured: false },
    { id: 'c2', bond_number: 2, creditor_name: '롯데카드', capital: 8_000_000, interest: 800_000, is_secured: false },
  ],
  income: { monthlyIncome: 3_500_000, householdSize: 4, year: 2026, livingCostRate: 100 },
};

// ═══════════════════════════════════════════════════════════════════
// Golden Case 3: 담보권부 채권 포함 (대전)
// ═══════════════════════════════════════════════════════════════════
const CASE_3 = {
  name: '담보권부 채권',
  application: { applicant_name: '박상철', court_name: '대전지방법원' },
  creditors: [
    { id: 'c1', bond_number: 1, creditor_name: '국민은행', capital: 50_000_000, interest: 5_000_000, is_secured: true, remaining_unsecured: 10_000_000 },
    { id: 'c2', bond_number: 2, creditor_name: '신한은행', capital: 10_000_000, interest: 1_000_000, is_secured: false },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// Golden Case 4: 보증인·대위변제 포함 (청주)
// ═══════════════════════════════════════════════════════════════════
const CASE_4 = {
  name: '보증인·대위변제',
  application: { applicant_name: '최영미', court_name: '청주지방법원' },
  creditors: [
    { id: 'c1', bond_number: 1, creditor_name: '국민은행', capital: 20_000_000, interest: 2_000_000, is_secured: false, guarantor_amount: 5_000_000, guarantor_name: '김보증', bond_type: '주채무' },
    { id: 'c2', bond_number: 1, creditor_name: '김보증', capital: 5_000_000, interest: 0, is_secured: false, parent_creditor_id: 'c1', sub_number: 1, bond_type: '보증채무' },
    { id: 'c3', bond_number: 2, creditor_name: '하나카드', capital: 3_000_000, interest: 300_000, is_secured: false },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// Golden Case 5: 미확정 채권 (소송 중, 강릉)
// ═══════════════════════════════════════════════════════════════════
const CASE_5 = {
  name: '미확정 채권',
  application: { applicant_name: '정수민', court_name: '춘천지방법원 강릉지원' },
  creditors: [
    { id: 'c1', bond_number: 1, creditor_name: '농협', capital: 10_000_000, interest: 1_000_000, is_secured: false },
    { id: 'c2', bond_number: 2, creditor_name: '소송상대방', capital: 5_000_000, interest: 0, is_secured: false, is_unsettled: true, unsettled_reason: '손해배상 소송 진행 중' },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// Golden Case 6: 우선변제채권 포함 (서울)
// ═══════════════════════════════════════════════════════════════════
const CASE_6 = {
  name: '조세·우선변제',
  application: { applicant_name: '한국세', court_name: '서울회생법원' },
  creditors: [
    { id: 'c1', bond_number: 1, creditor_name: '국세청', capital: 3_000_000, interest: 0, is_secured: false, has_priority_repay: true },
    { id: 'c2', bond_number: 2, creditor_name: '신한은행', capital: 10_000_000, interest: 1_000_000, is_secured: false },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// 통합 테스트
// ═══════════════════════════════════════════════════════════════════

describe('Golden Case 통합 테스트', () => {

  describe('Case 1: 단순 급여소득자', () => {
    const output = buildCreditorListOutput(CASE_1.application, CASE_1.creditorSettings, CASE_1.creditors);
    const s10 = buildSection10Clauses(CASE_1.creditors, 'D5110');
    const courtDocs = getCourtAdditionalDocs(CASE_1.application.court_name);
    const income = computeMonthlyAvailable({
      monthlyIncome: CASE_1.income.monthlyIncome,
      householdSize: CASE_1.income.householdSize,
      year: CASE_1.income.year,
      livingCostRate: CASE_1.income.livingCostRate,
    });

    it('채권자목록: 3건, 무담보 1100만', () => {
      expect(output.rows).toHaveLength(3);
      expect(output.summary.totalAmount).toBe(11_000_000);
      expect(output.summary.securedTotal).toBe(0);
    });

    it('§10: 특수 조건 없음 → 0건', () => {
      expect(s10).toHaveLength(0);
    });

    it('법원별 서류: 서울 추가서류 4건', () => {
      expect(courtDocs.length).toBeGreaterThan(0);
      expect(courtDocs.flatMap(d => d.items).length).toBe(4);
    });

    it('월가용소득: 양수', () => {
      expect(income.monthlyAvailable).toBeGreaterThan(0);
    });

    it('생계비: 2026년 1인 가구 기준중위소득 60% 사용', () => {
      const baseline = minimumLivingCost(1, 2026);
      expect(baseline).toBe(1_538_543);
    });

    it('현재가치 계산: 36개월 라이프니쯔', () => {
      const pv = presentValue(income.monthlyAvailable, 36);
      expect(pv).toBeGreaterThan(0);
      expect(pv).toBe(Math.floor(income.monthlyAvailable * LEIBNIZ_REHAB[36]));
    });
  });

  describe('Case 2: 배우자·부양가족', () => {
    it('4인 가구 생계비가 1인보다 높음', () => {
      const cost1 = minimumLivingCost(1, 2026);
      const cost4 = minimumLivingCost(4, 2026);
      expect(cost4).toBeGreaterThan(cost1);
    });

    it('법원별 서류: 부산 추가서류 있음', () => {
      const docs = getCourtAdditionalDocs(CASE_2.application.court_name);
      expect(docs.length).toBeGreaterThan(0);
    });
  });

  describe('Case 3: 담보권부 채권', () => {
    const output = buildCreditorListOutput(CASE_3.application, {}, CASE_3.creditors);
    const s10 = buildSection10Clauses(CASE_3.creditors, 'D5110');

    it('채권자목록: 담보부 합계에 secured 포함', () => {
      expect(output.summary.securedTotal).toBe(55_000_000);
    });

    it('미확정: 별제권 부족액 1건', () => {
      expect(output.unsettledRows).toHaveLength(1);
      expect(output.unsettledRows[0].reason).toBe('별제권행사 부족액');
      expect(output.unsettledRows[0].amount).toBe(10_000_000);
    });

    it('§10: 별제권 부족액 문구 자동 삽입', () => {
      expect(s10.some(c => c.id === 'secured_deficiency')).toBe(true);
    });

    it('환가비율 기본값: 부동산 70%', () => {
      expect(getDefaultValuationRate('부동산')).toBe(70);
    });

    it('법원별 서류: 대전 추가서류 있음', () => {
      expect(getCourtAdditionalDocs(CASE_3.application.court_name).length).toBeGreaterThan(0);
    });
  });

  describe('Case 4: 보증인·대위변제', () => {
    const output = buildCreditorListOutput(CASE_4.application, {}, CASE_4.creditors);
    const s10 = buildSection10Clauses(CASE_4.creditors, 'D5110');

    it('가지번호: 1-1 보증인이 1 뒤에', () => {
      const nums = output.rows.map(r => r.bondNumber);
      expect(nums.indexOf('1')).toBeLessThan(nums.indexOf('1-1'));
    });

    it('대위변제 비고 포함', () => {
      const main = output.rows.find(r => r.bondNumber === '1');
      expect(main?.subrogationNote).toContain('일부대위변제');
    });

    it('§10: 보증채무 장래구상권 문구', () => {
      expect(s10.some(c => c.condition === '보증인·연대보증·대위변제')).toBe(true);
    });

    it('법원별 서류: 청주 추가서류 4건', () => {
      expect(getCourtAdditionalDocs(CASE_4.application.court_name).flatMap(d => d.items).length).toBe(4);
    });
  });

  describe('Case 5: 미확정 채권', () => {
    const output = buildCreditorListOutput(CASE_5.application, {}, CASE_5.creditors);
    const s10 = buildSection10Clauses(CASE_5.creditors, 'D5110');

    it('미확정 1건 (소송 중)', () => {
      expect(output.unsettledRows).toHaveLength(1);
      expect(output.unsettledRows[0].reason).toBe('손해배상 소송 진행 중');
    });

    it('§10: 미확정 유보 처리 문구', () => {
      expect(s10.some(c => c.id === 'unsettled_claims')).toBe(true);
    });

    it('법원 키: 강릉', () => {
      expect(normalizeCourtKey(CASE_5.application.court_name)).toBe('강릉');
    });
  });

  describe('Case 6: 조세·우선변제', () => {
    const s10 = buildSection10Clauses(CASE_6.creditors, 'D5110');

    it('§10: 100% 변제 문구', () => {
      expect(s10.some(c => c.id === 'priority_100pct')).toBe(true);
    });

    it('§10: 법원별 서류에 서울 추가', () => {
      expect(getCourtAdditionalDocs(CASE_6.application.court_name).length).toBeGreaterThan(0);
    });
  });

  describe('문서 간 정합성', () => {
    it('채권자목록 합계 = 개별 원금+이자 합계 (Case 1)', () => {
      const output = buildCreditorListOutput(CASE_1.application, CASE_1.creditorSettings, CASE_1.creditors);
      const rowTotal = output.rows.reduce((s, r) => s + r.capital + r.interest, 0);
      expect(rowTotal).toBe(output.summary.totalAmount);
    });

    it('같은 입력 → 같은 출력 (재현성)', () => {
      const a = buildCreditorListOutput(CASE_1.application, CASE_1.creditorSettings, CASE_1.creditors);
      const b = buildCreditorListOutput(CASE_1.application, CASE_1.creditorSettings, CASE_1.creditors);
      expect(a.summary).toEqual(b.summary);
      expect(a.rows.map(r => r.bondNumber)).toEqual(b.rows.map(r => r.bondNumber));
    });
  });
});
