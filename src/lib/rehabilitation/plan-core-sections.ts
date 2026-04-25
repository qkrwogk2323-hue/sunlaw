/**
 * 변제계획안 제1항~제9항 자동 생성 (순수 함수).
 *
 * 사용자 편집 불가. 입력 snapshot에서 규칙 기반으로 생성.
 * v4 참조 구현의 10개 textarea 구조를 대체.
 *
 * 설계 원칙:
 *   - 같은 snapshot → 항상 같은 문구
 *   - COLAW 숫자를 상수로 박지 않음. 법원양식 규칙에서 도출
 *   - document-generator.ts와 이 함수가 같은 원천을 공유
 */

import { formatMoney } from './index';
import { determineFormType, calculateDisposalAmount } from './repayment-calculator';

export interface PlanSnapshot {
  // 변제기간
  repaymentStartDate: string; // YYYY-MM-DD 또는 '변제개시일'
  repayMonths: number; // 36 | 48 | 60

  // 소득·생계비
  monthlyIncome: number;
  livingCost: number;
  monthlyAvailable: number;
  incomeType: 'salary' | 'business';

  // 변제 결과
  monthlyRepay: number;
  totalRepayAmount: number;
  repayRate: number;
  totalDebt: number;
  totalCapital: number;
  totalInterest: number;
  presentValue: number | null;

  // 청산가치·재산
  liquidationValue: number;
  disposeAmount: number;
  disposePeriod: 1 | 2;

  // 위원
  trusteeCommRate: number;

  // 재산 항목 (D5111 처분 목록용)
  propertyItems: { detail: string; category: string; amount: number; isProtection: boolean }[];
}

/**
 * 제1항~제9항 텍스트 배열 생성.
 * 인덱스 0=제1항, 인덱스 8=제9항.
 */
export function buildPlanCoreSections(s: PlanSnapshot): string[] {
  const startDate = s.repaymentStartDate || '변제개시일';
  const months = s.repayMonths;
  const incomeLabel = s.incomeType === 'business' ? '영업' : '급여';
  const rateStr = s.repayRate.toFixed(2);

  // D5110 vs D5111
  const formType = determineFormType(s.presentValue, s.liquidationValue);
  const isD5111 = formType === 'D5111';

  // 종료일 계산
  let endDate = '';
  if (startDate !== '변제개시일') {
    const start = new Date(startDate);
    if (!isNaN(start.getTime())) {
      const end = new Date(start);
      end.setMonth(end.getMonth() + months - 1);
      endDate = end.toISOString().slice(0, 10);
    }
  }
  const periodStr = endDate
    ? `${startDate}부터 ${endDate}까지 ${months}개월`
    : `${startDate}부터 ${months}개월`;

  // 제1항: 변제기간
  const section1 = `변제계획안의 기간은 ${periodStr}로 한다.`;

  // 제2항: 변제방법
  const section2 = `신청인은 매월 ${formatMoney(s.monthlyRepay)}원을 개인회생위원에게 납부하고, 개인회생위원은 이를 각 채권자에게 그 채권액의 비율에 따라 안분 변제한다.`;

  // 제3항: 변제율
  const section3 = `총 채무액 ${formatMoney(s.totalDebt)}원 중 ${formatMoney(s.totalRepayAmount)}원을 변제한다 (변제율 ${rateStr}%).\n원금 ${formatMoney(s.totalCapital)}원, 이자 ${formatMoney(s.totalInterest)}원.`;

  // 제4항: 채권자별 변제계획표
  const section4 = '별첨 채권자별 변제계획표에 의한다.';

  // 제5항: 변제자금 조달방법
  let section5: string;
  if (isD5111) {
    const disposal = calculateDisposalAmount(
      s.liquidationValue,
      s.presentValue ?? 0,
      s.disposePeriod,
      s.trusteeCommRate > 0,
    );
    section5 = `변제자금은 신청인의 ${incomeLabel}소득 및 재산처분에 의하여 조달한다.\n가용소득에 의한 변제: 매월 ${formatMoney(s.monthlyRepay)}원\n재산처분 변제투입예정액: ${formatMoney(disposal)}원`;
  } else {
    section5 = `변제자금은 신청인의 ${incomeLabel}소득으로 조달한다.${s.disposeAmount > 0 ? `\n처분할 재산의 변제투입예정액: ${formatMoney(s.disposeAmount)}원` : ''}`;
  }

  // 제6항: 부인채권
  const section6 = '부인채권이 있는 경우 이를 환수하여 변제계획에 포함하기로 한다.';

  // 제7항: 면책
  const section7 = '변제계획에 따른 변제를 완료한 때에는 나머지 채무에 대하여 면책을 받기로 한다.';

  // 제8항: 특별조항
  const section8 = '특별조항 없음.';

  // 제9항: 처분할 재산의 처분방법
  let section9: string;
  if (isD5111) {
    const disposableProps = s.propertyItems.filter((p) => !p.isProtection && p.amount > 0);
    if (disposableProps.length > 0) {
      const propList = disposableProps
        .map((p) => `- ${p.detail || p.category}: ${formatMoney(p.amount)}원`)
        .join('\n');
      section9 = `다음 재산을 환가하여 변제에 투입하기로 한다.\n${propList}`;
    } else {
      section9 = '처분할 재산의 처분 대금은 변제기간 중 처분하여 일시변제에 투입하기로 한다.';
    }
  } else {
    section9 = '해당 없음.';
  }

  return [section1, section2, section3, section4, section5, section6, section7, section8, section9];
}
