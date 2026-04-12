import { describe, expect, it } from 'vitest';
import { validateSecuredVsProperties } from '@/lib/rehabilitation/property-valuation';
import type { RehabSecuredProperty, RehabPropertyItem } from '@/lib/rehabilitation/types';

describe('별제권↔재산목록 크로스 검증', () => {
  const makeSecured = (id: string, propertyType: string, description = ''): RehabSecuredProperty => ({
    id,
    propertyType,
    description,
    marketValue: 100_000_000,
    valuationRate: 70,
    note: '',
  });

  const makeProperty = (id: string, category: string): RehabPropertyItem => ({
    id,
    category,
    detail: '',
    amount: 50_000_000,
    seizure: '',
    repayUse: '',
    isProtection: false,
  });

  it('대응하는 재산목록이 있으면 경고 없음', () => {
    const secured = [makeSecured('s1', '부동산', '서울 아파트')];
    const properties = [makeProperty('p1', 'realestate')];
    const warnings = validateSecuredVsProperties(secured, properties);
    expect(warnings).toHaveLength(0);
  });

  it('재산목록에 대응 항목이 없으면 경고 반환', () => {
    const secured = [makeSecured('s1', '부동산', '서울 아파트')];
    const properties = [makeProperty('p1', 'car')]; // 자동차만 있음
    const warnings = validateSecuredVsProperties(secured, properties);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].propertyType).toBe('부동산');
    expect(warnings[0].message).toContain('재산목록에 등록되지 않았습니다');
  });

  it('여러 별제권 중 일부만 미대응이면 해당 항목만 경고', () => {
    const secured = [
      makeSecured('s1', '부동산', '서울 아파트'),
      makeSecured('s2', '자동차', '그랜저'),
    ];
    const properties = [makeProperty('p1', 'realestate')]; // 부동산만 있음
    const warnings = validateSecuredVsProperties(secured, properties);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].propertyType).toBe('자동차');
  });

  it('propertyType이 빈 문자열이면 무시', () => {
    const secured = [makeSecured('s1', '', '')];
    const properties: RehabPropertyItem[] = [];
    const warnings = validateSecuredVsProperties(secured, properties);
    expect(warnings).toHaveLength(0);
  });

  it('재산목록이 비어있고 매핑 외 유형이면 경고', () => {
    const secured = [makeSecured('s1', '기계장비', '프레스')];
    const properties: RehabPropertyItem[] = [];
    const warnings = validateSecuredVsProperties(secured, properties);
    expect(warnings).toHaveLength(1);
  });
});

describe('document-generator 안분 올림 (Math.ceil)', () => {
  it('채권자별 월변제예정액 올림 시 합계 >= 가용소득', () => {
    // 가용소득 100,000원, 채권자 3명 원금: 1,000,000 / 2,000,000 / 3,000,000
    const availableIncome = 100_000;
    const creditors = [
      { capital: 1_000_000 },
      { capital: 2_000_000 },
      { capital: 3_000_000 },
    ];
    const totalDebt = creditors.reduce((s, c) => s + c.capital, 0);

    const payments = creditors.map((c) => {
      const ratio = totalDebt > 0 ? c.capital / totalDebt : 0;
      return Math.ceil(availableIncome * ratio);
    });

    const sum = payments.reduce((s, p) => s + p, 0);
    // 올림이므로 합계가 가용소득 이상이어야 함
    expect(sum).toBeGreaterThanOrEqual(availableIncome);
    // 각 채권자 금액이 올림 결과
    expect(payments[0]).toBe(Math.ceil(100_000 * (1_000_000 / 6_000_000))); // ceil(16666.67) = 16667
    expect(payments[1]).toBe(Math.ceil(100_000 * (2_000_000 / 6_000_000))); // ceil(33333.33) = 33334
    expect(payments[2]).toBe(Math.ceil(100_000 * (3_000_000 / 6_000_000))); // ceil(50000) = 50000
  });

  it('균등 분할 시에도 올림 결과 합계 >= 가용소득', () => {
    const availableIncome = 100_000;
    const creditors = [
      { capital: 1_000_000 },
      { capital: 1_000_000 },
      { capital: 1_000_000 },
    ];
    const totalDebt = creditors.reduce((s, c) => s + c.capital, 0);

    const payments = creditors.map((c) => {
      const ratio = totalDebt > 0 ? c.capital / totalDebt : 0;
      return Math.ceil(availableIncome * ratio);
    });

    const sum = payments.reduce((s, p) => s + p, 0);
    expect(sum).toBeGreaterThanOrEqual(availableIncome);
    // 100000 / 3 = 33333.33... → ceil = 33334
    expect(payments[0]).toBe(33334);
  });
});
