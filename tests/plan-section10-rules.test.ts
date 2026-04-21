import { describe, expect, it } from 'vitest';
import { buildSection10Clauses } from '@/lib/rehabilitation/rules/plan-section10-rules';

describe('buildSection10Clauses', () => {
  it('보증채무 → 장래 구상권 처리 문구', () => {
    const creditors = [
      { id: 'c1', bond_number: 3, sub_number: 1, creditor_name: '이보증', bond_type: '보증채무', guarantor_amount: 0 },
    ];
    const clauses = buildSection10Clauses(creditors, 'D5110');
    expect(clauses).toHaveLength(1);
    expect(clauses[0].text).toContain('채권번호 3-1번');
    expect(clauses[0].text).toContain('이보증');
    expect(clauses[0].text).toContain('제581조 제2항');
    expect(clauses[0].text).toContain('제430조');
  });

  it('대위변제(guarantor_amount > 0) → 장래 구상권 문구', () => {
    const creditors = [
      { id: 'c1', bond_number: 1, creditor_name: '국민은행', guarantor_amount: 5_000_000, guarantor_name: '김보증인' },
    ];
    const clauses = buildSection10Clauses(creditors, 'D5110');
    const guarantorClause = clauses.find((c) => c.condition === '보증인·연대보증·대위변제');
    expect(guarantorClause).toBeDefined();
    expect(guarantorClause!.text).toContain('국민은행');
  });

  it('별제권 부족액 → 부족분 처리 문구', () => {
    const creditors = [
      { id: 'c1', is_secured: true, remaining_unsecured: 3_000_000 },
    ];
    const clauses = buildSection10Clauses(creditors, 'D5110');
    const deficiency = clauses.find((c) => c.id === 'secured_deficiency');
    expect(deficiency).toBeDefined();
    expect(deficiency!.text).toContain('미확정채권으로 처리');
    expect(deficiency!.text).toContain('동일한 비율로 안분');
  });

  it('미확정 채권 → 유보 처리 문구', () => {
    const creditors = [
      { id: 'c1', is_unsettled: true },
    ];
    const clauses = buildSection10Clauses(creditors, 'D5110');
    const unsettled = clauses.find((c) => c.id === 'unsettled_claims');
    expect(unsettled).toBeDefined();
    expect(unsettled!.text).toContain('유보액을 일시 변제');
  });

  it('D5111 → 재산처분 승수 문구 (1년, 1.3배)', () => {
    const clauses = buildSection10Clauses([], 'D5111', 1, 1.3);
    const disposal = clauses.find((c) => c.id === 'disposal_multiplier');
    expect(disposal).toBeDefined();
    expect(disposal!.text).toContain('1년 이내');
    expect(disposal!.text).toContain('승수 1.3');
  });

  it('D5111 → 재산처분 승수 문구 (2년, 1.5배)', () => {
    const clauses = buildSection10Clauses([], 'D5111', 2, 1.5);
    const disposal = clauses.find((c) => c.id === 'disposal_multiplier');
    expect(disposal!.text).toContain('2년 이내');
    expect(disposal!.text).toContain('승수 1.5');
  });

  it('D5110에서는 재산처분 승수 없음', () => {
    const clauses = buildSection10Clauses([], 'D5110');
    expect(clauses.find((c) => c.id === 'disposal_multiplier')).toBeUndefined();
  });

  it('우선변제채권 → 100% 변제 문구', () => {
    const creditors = [
      { id: 'c1', has_priority_repay: true },
    ];
    const clauses = buildSection10Clauses(creditors, 'D5110');
    const priority = clauses.find((c) => c.id === 'priority_100pct');
    expect(priority).toBeDefined();
    expect(priority!.text).toContain('100% 변제');
  });

  it('해당 조건 없으면 빈 배열', () => {
    const clauses = buildSection10Clauses([], 'D5110');
    expect(clauses).toHaveLength(0);
  });

  it('복합 사건 → 여러 문구 동시 생성', () => {
    const creditors = [
      { id: 'c1', bond_number: 1, creditor_name: '은행', is_secured: true, remaining_unsecured: 2_000_000 },
      { id: 'c2', bond_number: 2, creditor_name: '보증인', bond_type: '보증채무' },
      { id: 'c3', bond_number: 3, creditor_name: '국세청', has_priority_repay: true },
      { id: 'c4', bond_number: 4, creditor_name: '소송상대', is_unsettled: true },
    ];
    const clauses = buildSection10Clauses(creditors, 'D5111', 1, 1.3);
    // 보증(1) + 별제권부족(1) + 미확정(1) + 재산처분(1) + 우선변제(1) = 5
    expect(clauses.length).toBeGreaterThanOrEqual(5);
    expect(clauses.some((c) => c.id.startsWith('guarantor_'))).toBe(true);
    expect(clauses.some((c) => c.id === 'secured_deficiency')).toBe(true);
    expect(clauses.some((c) => c.id === 'unsettled_claims')).toBe(true);
    expect(clauses.some((c) => c.id === 'disposal_multiplier')).toBe(true);
    expect(clauses.some((c) => c.id === 'priority_100pct')).toBe(true);
  });
});
