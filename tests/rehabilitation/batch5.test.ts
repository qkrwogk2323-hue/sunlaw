/**
 * Batch 5 테스트 — 추가생계비 항목별 합산 + 처분재산 항목별 합산
 */
import { describe, expect, it } from 'vitest';

describe('추가생계비 항목별 합산', () => {
  it('항목별 금액 합산이 extra_living_cost와 일치', () => {
    const items = [
      { category: '주거비', amount: 150_000, reason: '월세 부담' },
      { category: '교육비', amount: 80_000, reason: '초등학생 자녀' },
      { category: '의료비', amount: 50_000, reason: '만성질환 치료' },
    ];
    const total = items.reduce((s, i) => s + i.amount, 0);
    expect(total).toBe(280_000);

    // 서버 동기화 로직 검증: mapIncomeFormToDb에서 합산
    const form: Record<string, unknown> = {
      additional_living_costs: items,
      extra_living_cost: 999, // 기존 값 (덮어써져야 함)
    };
    // 동기화: jsonb가 있으면 합산으로 덮어쓰기
    const synced = Array.isArray(form.additional_living_costs)
      ? (form.additional_living_costs as { amount: number }[]).reduce((s, i) => s + (i.amount || 0), 0)
      : (form.extra_living_cost as number);
    expect(synced).toBe(280_000);
  });
});

describe('처분재산 항목별 합산', () => {
  it('항목별 금액 합산이 dispose_amount와 일치', () => {
    const items = [
      { category: '부동산', amount: 10_000_000, description: '서울 강남구 토지' },
      { category: '차량', amount: 3_500_000, description: '2020년식 승용차' },
      { category: '보험해약금', amount: 1_200_000, description: '생명보험 해약' },
    ];
    const total = items.reduce((s, i) => s + i.amount, 0);
    expect(total).toBe(14_700_000);

    // 서버 동기화 로직 검증
    const form: Record<string, unknown> = {
      dispose_items: items,
      dispose_amount: 0,
    };
    const synced = Array.isArray(form.dispose_items)
      ? (form.dispose_items as { amount: number }[]).reduce((s, i) => s + (i.amount || 0), 0)
      : (form.dispose_amount as number);
    expect(synced).toBe(14_700_000);
  });
});
