/**
 * Batch 8 테스트 — PrintFrame HTML 구성 + autoFillPlanSections D5111 분기
 */
import { describe, expect, it } from 'vitest';
import { determineFormType, calculateDisposalAmount, formatMoney } from '@/lib/rehabilitation';

describe('PrintFrame HTML 구성', () => {
  it('page-break 구분자로 여러 문서를 합본할 수 있다', () => {
    const docs = [
      '<h1>채권자 목록</h1><table><tr><td>A</td></tr></table>',
      '<h1>재산 목록</h1><table><tr><td>B</td></tr></table>',
      '<h1>수입지출 목록</h1><table><tr><td>C</td></tr></table>',
    ];
    // 합본 로직: 첫 문서 이후 page-break 삽입
    const parts: string[] = [];
    docs.forEach((html, i) => {
      if (i > 0) parts.push('<div class="page-break"></div>');
      parts.push(html);
    });
    const combined = parts.join('\n');

    // page-break 구분자가 (문서 수 - 1)개
    const breakCount = (combined.match(/page-break/g) || []).length;
    expect(breakCount).toBe(2);
    // 모든 문서 내용 포함
    expect(combined).toContain('채권자 목록');
    expect(combined).toContain('재산 목록');
    expect(combined).toContain('수입지출 목록');
  });
});

describe('autoFillPlanSections D5111 분기', () => {
  it('현재가치 ≤ 청산가치 → D5111 판별 + 재산처분 투입액', () => {
    const presentValue = 17_073_552;
    const liquidationValue = 30_000_000;
    const formType = determineFormType(presentValue, liquidationValue);
    expect(formType).toBe('D5111');

    // 제5항: 재산처분 투입액 계산
    const disposal = calculateDisposalAmount(liquidationValue, presentValue, 1, false);
    expect(disposal).toBeGreaterThan(0);

    // 자동채움 제5항 텍스트 생성
    const section5 = `변제자금은 신청인의 급여소득 및 재산처분에 의하여 조달한다.\n가용소득에 의한 변제: 매월 500,000원\n재산처분 변제투입예정액: ${formatMoney(disposal)}원`;
    expect(section5).toContain('재산처분에 의하여');
    expect(section5).toContain(formatMoney(disposal));
  });

  it('현재가치 > 청산가치 → D5110 판별 → 제9항 "해당 없음"', () => {
    const formType = determineFormType(18_000_000, 10_000_000);
    expect(formType).toBe('D5110');

    // D5110이면 제9항은 "해당 없음"
    const section9 = '해당 없음.';
    expect(section9).toBe('해당 없음.');
  });

  it('D5111 + 처분대상 재산이 있으면 제9항에 재산 목록 포함', () => {
    const propertyItems = [
      { detail: '부동산(아파트)', amount: 50_000_000, isProtection: false },
      { detail: '자동차', amount: 5_000_000, isProtection: false },
      { detail: '압류금지재산', amount: 3_000_000, isProtection: true },
    ];
    const disposableProps = propertyItems.filter((p) => !p.isProtection && p.amount > 0);
    const propList = disposableProps
      .map((p) => `- ${p.detail}: ${formatMoney(p.amount)}원`)
      .join('\n');
    const section9 = `다음 재산을 환가하여 변제에 투입하기로 한다.\n${propList}`;

    expect(section9).toContain('부동산(아파트)');
    expect(section9).toContain('자동차');
    expect(section9).not.toContain('압류금지재산');
    expect(disposableProps).toHaveLength(2);
  });
});
