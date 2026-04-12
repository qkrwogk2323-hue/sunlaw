/**
 * 채권자별 변제 스케줄 생성기
 *
 * 총 변제액을 채권자별 채무 비율에 따라 배분합니다.
 * - sequential (원리금변제): 원금 먼저 변제 후 이자 변제
 * - combined (원리금합산변제): 원금과 이자를 비율대로 동시 변제
 */

import type { RehabCreditor, RepayType, CreditorRepaySchedule, TieredScheduleSegment, MonthlyDetailRow, PhasedRepaySegment } from './types';
import { classifyCreditor } from './creditor-classification';

/**
 * 채권자별 변제 스케줄을 생성합니다.
 *
 * 마지막 채권자에게 반올림 오차를 보정하여
 * 합계가 정확히 일치하도록 합니다.
 *
 * tieredTaxPriority 모드:
 *   조세채권(재단채권/우선권) 완납 후 → 무담보 pro-rata 배분.
 *   반환 결과에 내부적으로 계단식 구간 정보를 포함.
 *
 * @param creditors - 채권자 목록
 * @param monthlyRepay - 월 변제액
 * @param repayMonths - 변제기간 (개월)
 * @param disposeAmount - 처분재산 변제투입액
 * @param repayType - 변제 유형
 * @returns 채권자별 변제 스케줄
 */
export function generateRepaySchedule(
  creditors: RehabCreditor[],
  monthlyRepay: number,
  repayMonths: number,
  disposeAmount: number,
  repayType: RepayType,
  capitalOnly: boolean = false,
): CreditorRepaySchedule[] {
  if (creditors.length === 0 || monthlyRepay <= 0) return [];

  // 조세채권 우선순위 분리 배분
  if (repayType === 'tieredTaxPriority') {
    const hasTax = creditors.some((c) => c.priorityClass === 'tax_priority');
    if (hasTax) {
      return generateTieredSchedule(creditors, monthlyRepay, repayMonths, disposeAmount, capitalOnly);
    }
    // 조세채권이 없으면 일반 sequential로 폴백
  }

  // 우선변제채권 분리 (법 §583, §614①: 100% 변제 필수)
  const hasPriority = creditors.some((c) => c.hasPriorityRepay);
  if (hasPriority) {
    return generatePrioritySchedule(creditors, monthlyRepay, repayMonths, disposeAmount, repayType, capitalOnly);
  }

  return generateProRataSchedule(creditors, monthlyRepay, repayMonths, disposeAmount, repayType, capitalOnly);
}

/**
 * 우선변제채권 100% 보장 스케줄 (법 §583, §614①)
 *
 * Phase 1: 우선변제채권 100% 배분
 * Phase 2: 잔여 예산을 일반 채권에 pro-rata
 */
function generatePrioritySchedule(
  creditors: RehabCreditor[],
  monthlyRepay: number,
  repayMonths: number,
  disposeAmount: number,
  repayType: RepayType,
  capitalOnly: boolean,
): CreditorRepaySchedule[] {
  const totalRepayTarget = monthlyRepay * repayMonths + disposeAmount;

  const priorityCreditors = creditors.filter((c) => c.hasPriorityRepay);
  const generalCreditors = creditors.filter((c) => !c.hasPriorityRepay);

  // 우선변제: 원리금 100% (capitalOnly에서도 우선변제는 전액)
  const priorityTotal = priorityCreditors.reduce(
    (s, c) => s + (c.capital || 0) + (c.interest || 0), 0,
  );

  // 일반 채권 예산 = 총 예산 - 우선변제 총액
  const generalBudget = Math.max(0, totalRepayTarget - priorityTotal);

  const results: CreditorRepaySchedule[] = [];

  // Phase 1: 우선변제채권 — 100% 배분
  let priorityMonthlyAllocated = 0;
  const priorityMonthlyBudget = repayMonths > 0 ? Math.ceil(priorityTotal / repayMonths) : 0;

  priorityCreditors.forEach((creditor, idx) => {
    const debt = (creditor.capital || 0) + (creditor.interest || 0);
    const total = debt; // 100%
    const ratio = priorityTotal > 0 ? debt / (priorityTotal + generalCreditors.reduce((s, c) => s + (c.capital || 0) + (capitalOnly ? 0 : (c.interest || 0)), 0)) : 0;

    let monthly: number;
    if (idx === priorityCreditors.length - 1) {
      monthly = Math.max(0, priorityMonthlyBudget - priorityMonthlyAllocated);
    } else {
      monthly = priorityTotal > 0 ? Math.ceil(priorityMonthlyBudget * debt / priorityTotal) : 0;
      priorityMonthlyAllocated += monthly;
    }

    results.push({
      creditorId: creditor.id,
      ratio,
      monthlyAmount: monthly,
      totalAmount: total,
      capitalRepay: creditor.capital || 0,
      interestRepay: creditor.interest || 0,
    });
  });

  // Phase 2: 일반 채권 — 잔여 예산 pro-rata
  const generalMonthly = Math.max(0, monthlyRepay - priorityMonthlyBudget);
  if (generalCreditors.length > 0 && generalBudget > 0) {
    const generalSchedule = generateProRataSchedule(
      generalCreditors, generalMonthly, repayMonths, 0, repayType, capitalOnly,
    );
    // 일반 스케줄의 총액을 generalBudget에 맞게 보정
    const rawTotal = generalSchedule.reduce((s, r) => s + r.totalAmount, 0);
    const scale = rawTotal > 0 ? generalBudget / rawTotal : 0;

    generalSchedule.forEach((s) => {
      const adjTotal = Math.ceil(s.totalAmount * scale);
      const adjMonthly = Math.ceil(s.monthlyAmount * scale);
      results.push({
        ...s,
        totalAmount: adjTotal,
        monthlyAmount: adjMonthly,
        capitalRepay: capitalOnly ? adjTotal : Math.min(
          creditors.find((c) => c.id === s.creditorId)?.capital || 0, adjTotal,
        ),
        interestRepay: capitalOnly ? 0 : Math.max(0, adjTotal - (
          creditors.find((c) => c.id === s.creditorId)?.capital || 0
        )),
      });
    });
  } else {
    // 일반 채권에 배분할 예산 없음 (전액 우선변제로 소진)
    generalCreditors.forEach((c) => {
      results.push({
        creditorId: c.id,
        ratio: 0,
        monthlyAmount: 0,
        totalAmount: 0,
        capitalRepay: 0,
        interestRepay: 0,
      });
    });
  }

  return results;
}

/**
 * 채권자의 유효 채권액 (대위변제 중복 방지)
 *
 * CLAUDE.md: "주채무-보증채무 간 변제 중복 방지 — 보증채무의 안분 기준액은
 * 주채무에서 이미 배분된 금액을 제외해야 한다"
 *
 * - 일부대위변제: 원채권자 원금 = 원금 - guarantorAmount
 * - 전액대위변제: 원채권자 원금 = 0 (이자만 남음)
 * - 보증채무(가지번호): guarantorAmount가 이 채권자의 구상채권액
 */
function getEffectiveDebt(c: RehabCreditor, capitalOnly: boolean): number {
  const gAmount = c.guarantorAmount || 0;
  // 주채무자이고 대위변제가 있으면 원금 차감
  const effectiveCapital = gAmount > 0 && (c.bondType === '주채무' || !c.bondType)
    ? Math.max(0, (c.capital || 0) - gAmount)
    : (c.capital || 0);
  return effectiveCapital + (capitalOnly ? 0 : (c.interest || 0));
}

/**
 * 일반 pro-rata 배분 (우선변제 없는 경우)
 */
function generateProRataSchedule(
  creditors: RehabCreditor[],
  monthlyRepay: number,
  repayMonths: number,
  disposeAmount: number,
  repayType: RepayType,
  capitalOnly: boolean,
): CreditorRepaySchedule[] {
  const totalDebt = creditors.reduce(
    (s, c) => s + getEffectiveDebt(c, capitalOnly),
    0,
  );
  const totalRepayTarget = monthlyRepay * repayMonths + disposeAmount;

  // 반올림 오차 보정을 위한 누적 방식
  let monthlyAllocated = 0;
  let totalAllocated = 0;

  return creditors.map((creditor, idx) => {
    const creditorDebt = getEffectiveDebt(creditor, capitalOnly);
    const ratio = totalDebt > 0 ? creditorDebt / totalDebt : 0;

    let monthly: number;
    let total: number;

    if (idx === creditors.length - 1) {
      // 마지막 채권자: 잔여분 흡수 (올림 오차 보정) — Math.max(0) 방어
      monthly = Math.max(0, monthlyRepay - monthlyAllocated);
      total = Math.max(0, totalRepayTarget - totalAllocated);
    } else {
      // 가이드 p.12: "원 미만은 '올림'으로 처리"
      monthly = Math.ceil(monthlyRepay * ratio);
      total = Math.ceil(totalRepayTarget * ratio);
      monthlyAllocated += monthly;
      totalAllocated += total;
    }

    let capitalRepay: number;
    let interestRepay: number;

    if (capitalOnly) {
      capitalRepay = total;
      interestRepay = 0;
    } else if (repayType === 'sequential') {
      capitalRepay = Math.min(creditor.capital || 0, total);
      interestRepay = Math.max(0, total - (creditor.capital || 0));
    } else {
      const capRatio = creditorDebt > 0
        ? (creditor.capital || 0) / creditorDebt
        : 0;
      capitalRepay = Math.round(total * capRatio);
      interestRepay = total - capitalRepay;
    }

    return {
      creditorId: creditor.id,
      ratio,
      monthlyAmount: monthly,
      totalAmount: total,
      capitalRepay,
      interestRepay,
    };
  });
}

/**
 * 계단식 조세우선 변제 스케줄
 *
 * 동작:
 *   1) 조세채권(재단채권) pro-rata 완납까지 월 전액 배분
 *   2) 완납 회차에서 조세 잔여 + 무담보 혼합
 *   3) 이후 회차는 무담보만 pro-rata
 *
 * 반환: 채권자별 월평균/총변제액. 계단식 구간 정보는 내부 계산에서만 사용.
 * (회차별 상세는 document-generator에서 별도 생성)
 */
function generateTieredSchedule(
  creditors: RehabCreditor[],
  monthlyRepay: number,
  repayMonths: number,
  disposeAmount: number,
  capitalOnly: boolean = false,
): CreditorRepaySchedule[] {
  // 채권자별 분류 (확정/미확정/담보충당)
  const classified = creditors.map((c) => {
    const totalClaim = (c.capital || 0) + (capitalOnly ? 0 : (c.interest || 0));
    const cls = classifyCreditor({
      totalClaim,
      isSecured: c.isSecured,
      securedCollateralValue: c.securedCollateralValue ?? 0,
      isOtherUnconfirmed: c.isOtherUnconfirmed ?? false,
    });
    return { creditor: c, totalClaim, ...cls };
  });

  // 별제권부 담보 충당분은 변제계획에서 제외
  // 무담보 안분 대상 = confirmed + unconfirmed (둘 다 변제 대상)
  const taxClaims = classified.filter((x) => x.creditor.priorityClass === 'tax_priority');
  const others = classified.filter((x) => x.creditor.priorityClass !== 'tax_priority');

  const taxTotal = taxClaims.reduce((s, x) => s + x.totalClaim, 0);
  // others의 변제 안분 기준액 = confirmed + unconfirmed (담보 충당분 제외)
  const othersAnchor = others.reduce((s, x) => s + x.confirmedAmount + x.unconfirmedAmount, 0);

  // 조세채권 완납까지의 개월 수
  const taxFullMonths = Math.floor(taxTotal / monthlyRepay);
  const taxRemainder = taxTotal - taxFullMonths * monthlyRepay;
  const hasMixedMonth = taxRemainder > 0;
  const pureUnsecuredMonths = repayMonths - taxFullMonths - (hasMixedMonth ? 1 : 0);

  // 각 채권자의 총변제액 계산
  const totalByCreditor = new Map<string, { monthly: number; total: number }>();

  // 1) 조세채권: 전액 완납
  for (const x of taxClaims) {
    const total = x.totalClaim;
    const monthly = Math.ceil(total / repayMonths);
    totalByCreditor.set(x.creditor.id, { monthly, total });
  }

  // 2) 무담보채권: 남은 예산 (무담보 구간 + 혼합회차 무담보분 + 처분재산)
  const mixedMonthUnsecured = hasMixedMonth ? monthlyRepay - taxRemainder : 0;
  const unsecuredBudget = pureUnsecuredMonths * monthlyRepay + mixedMonthUnsecured + disposeAmount;

  let allocatedUnsecured = 0;
  others.forEach((x, idx) => {
    const anchorAmount = x.confirmedAmount + x.unconfirmedAmount;
    const ratio = othersAnchor > 0 ? anchorAmount / othersAnchor : 0;
    let total: number;
    if (idx === others.length - 1) {
      total = Math.max(0, unsecuredBudget - allocatedUnsecured);
    } else {
      total = Math.ceil(unsecuredBudget * ratio);
      allocatedUnsecured += total;
    }
    const monthly = Math.ceil(total / repayMonths);
    totalByCreditor.set(x.creditor.id, { monthly, total });
  });

  // 원래 creditors 순서대로 결과 반환
  return classified.map((x) => {
    const entry = totalByCreditor.get(x.creditor.id) ?? { monthly: 0, total: 0 };
    const anchor = x.confirmedAmount + x.unconfirmedAmount;
    // 확정/미확정 비율로 totalAmount 분할
    const confirmedShare = anchor > 0
      ? Math.round(entry.total * (x.confirmedAmount / anchor))
      : entry.total;
    const unconfirmedShare = entry.total - confirmedShare;
    // 원금·이자 배분
    let capitalRepay: number;
    let interestRepay: number;
    if (capitalOnly) {
      capitalRepay = entry.total;
      interestRepay = 0;
    } else {
      capitalRepay = Math.min(x.creditor.capital || 0, entry.total);
      interestRepay = Math.max(0, entry.total - (x.creditor.capital || 0));
    }
    return {
      creditorId: x.creditor.id,
      ratio: x.totalClaim > 0 ? entry.total / x.totalClaim : 0,
      monthlyAmount: entry.monthly,
      totalAmount: entry.total,
      capitalRepay,
      interestRepay,
      confirmedAmount: confirmedShare,
      unconfirmedAmount: unconfirmedShare,
    };
  });
}

/**
 * 계단식 구간 정보 계산 (문서 생성용)
 * 변제계획안의 "월변제표"에서 회차 구간을 표시하는 데 사용.
 */
export function computeTieredSegments(
  creditors: RehabCreditor[],
  monthlyRepay: number,
  repayMonths: number,
  capitalOnly: boolean = false,
): TieredScheduleSegment[] {
  const taxClaims = creditors.filter((c) => c.priorityClass === 'tax_priority');
  const others = creditors.filter((c) => c.priorityClass !== 'tax_priority');
  const taxTotal = taxClaims.reduce((s, c) => s + (c.capital || 0) + (capitalOnly ? 0 : (c.interest || 0)), 0);
  const othersTotal = others.reduce((s, c) => s + (c.capital || 0) + (capitalOnly ? 0 : (c.interest || 0)), 0);

  if (taxTotal <= 0) return [];

  const taxFullMonths = Math.floor(taxTotal / monthlyRepay);
  const taxRemainder = taxTotal - taxFullMonths * monthlyRepay;
  const hasMixedMonth = taxRemainder > 0;

  const segments: TieredScheduleSegment[] = [];

  const creditorDebtFn = (c: RehabCreditor) => (c.capital || 0) + (capitalOnly ? 0 : (c.interest || 0));

  // 1구간: 조세 단독
  if (taxFullMonths > 0) {
    segments.push({
      startMonth: 1,
      endMonth: taxFullMonths,
      monthlyAmount: monthlyRepay,
      targets: taxClaims.map((c) => {
        const debt = creditorDebtFn(c);
        const share = Math.ceil(monthlyRepay * (taxTotal > 0 ? debt / taxTotal : 0));
        return { creditorId: c.id, monthlyShare: share };
      }),
    });
  }

  // 2구간: 혼합 (조세 잔여 + 무담보 시작)
  if (hasMixedMonth) {
    const mixedMonth = taxFullMonths + 1;
    const unsecuredPortion = monthlyRepay - taxRemainder;
    const mixedTargets = [
      ...taxClaims.map((c) => {
        const debt = creditorDebtFn(c);
        const share = Math.ceil(taxRemainder * (taxTotal > 0 ? debt / taxTotal : 0));
        return { creditorId: c.id, monthlyShare: share };
      }),
      ...others.map((c) => {
        const debt = creditorDebtFn(c);
        const share = Math.ceil(unsecuredPortion * (othersTotal > 0 ? debt / othersTotal : 0));
        return { creditorId: c.id, monthlyShare: share };
      }),
    ];
    segments.push({
      startMonth: mixedMonth,
      endMonth: mixedMonth,
      monthlyAmount: monthlyRepay,
      targets: mixedTargets,
    });
  }

  // 3구간: 무담보 단독
  const pureStart = taxFullMonths + (hasMixedMonth ? 2 : 1);
  if (pureStart <= repayMonths) {
    segments.push({
      startMonth: pureStart,
      endMonth: repayMonths,
      monthlyAmount: monthlyRepay,
      targets: others.map((c) => {
        const debt = creditorDebtFn(c);
        const share = Math.ceil(monthlyRepay * (othersTotal > 0 ? debt / othersTotal : 0));
        return { creditorId: c.id, monthlyShare: share };
      }),
    });
  }

  return segments;
}

/**
 * 변제시작일 산출
 *
 * (a) repaymentStartDate 확정 → 그대로 리턴
 * (b) uncertain=true + repaymentStartDay 있음 → null
 *     문서 출력 시 "인가결정 후 최초로 도래하는 월의 N일" 텍스트 사용
 * (c) repaymentStartDay 자체가 없음 → null
 *     UI에서 "변제개시일을 입력하세요" 경고 표시
 *
 * @returns YYYY-MM-DD 또는 null (미확정)
 */
export function computeRepayStartDate(opts: {
  repaymentStartDate?: string | null;
  repaymentStartUncertain?: boolean;
  repaymentStartDay?: number;
  filingDate?: string | null;
}): string | null {
  // (a) 확정된 날짜가 있고, uncertain이 아니면 그대로
  if (opts.repaymentStartDate && !opts.repaymentStartUncertain) {
    return opts.repaymentStartDate;
  }

  // (b) uncertain 모드이지만 day가 있으면 → null (문서에서 텍스트 표기)
  // (c) day 자체가 없으면 → null (UI에서 경고)
  return null;
}

/**
 * 월별 상세 변제 스케줄을 생성합니다.
 * 1~N회차까지 채권자별 월변제액과 누적액을 계산합니다.
 *
 * @param schedule - generateRepaySchedule 결과
 * @param repayMonths - 변제기간 (개월)
 * @param startDate - 변제시작일 (YYYY-MM-DD) 또는 null
 */
export function generateMonthlyDetailSchedule(
  schedule: CreditorRepaySchedule[],
  repayMonths: number,
  startDate: string | null,
): MonthlyDetailRow[] {
  if (schedule.length === 0 || repayMonths <= 0) return [];

  const hasDate = !!startDate;
  const start = hasDate ? new Date(startDate) : null;
  const cumulatives = new Map<string, number>();
  for (const s of schedule) cumulatives.set(s.creditorId, 0);

  const rows: MonthlyDetailRow[] = [];
  for (let m = 1; m <= repayMonths; m++) {
    let dateLabel: string;
    if (start) {
      const payDate = new Date(start);
      payDate.setMonth(payDate.getMonth() + m - 1);
      dateLabel = `${payDate.getFullYear()}.${String(payDate.getMonth() + 1).padStart(2, '0')}`;
    } else {
      dateLabel = `제${m}회`;
    }

    let rowTotal = 0;
    const creditorPayments = schedule.map((s) => {
      const prev = cumulatives.get(s.creditorId) || 0;
      const cumulative = prev + s.monthlyAmount;
      cumulatives.set(s.creditorId, cumulative);
      rowTotal += s.monthlyAmount;
      return { creditorId: s.creditorId, amount: s.monthlyAmount, cumulative };
    });

    rows.push({ month: m, dateLabel, creditorPayments, rowTotal });
  }

  return rows;
}

/**
 * Phase별 단계변제 구간 계산 (원금 전부 + 이자 일부 변제)
 *
 * 조건: 총변제액 > 총원금 (= 원금 100% + 이자 일부)
 * Phase 1: 원금만 안분 — 월 변제액 전부를 원금 비율로 배분
 * Phase 2: 전환 회차 — 남은 원금 + 이자 시작 (혼합)
 * Phase 3: 이자만 안분 — 잔여 이자를 비율로 배분
 *
 * @returns 구간 배열 (1~3개). 원금 1회차에 끝나면 Phase 2+3만 반환.
 */
export function computePhasedRepaySegments(
  creditors: RehabCreditor[],
  monthlyRepay: number,
  repayMonths: number,
): PhasedRepaySegment[] {
  if (creditors.length === 0 || monthlyRepay <= 0 || repayMonths <= 0) return [];

  const totalCapital = creditors.reduce((s, c) => s + (c.capital || 0), 0);
  const totalInterest = creditors.reduce((s, c) => s + (c.interest || 0), 0);
  const totalRepay = monthlyRepay * repayMonths;

  // 원금 전부 변제 불가 시 → 단계변제 불필요 (원금 안분만)
  if (totalRepay <= totalCapital || totalCapital <= 0) return [];
  // 이자가 없으면 단계변제 불필요
  if (totalInterest <= 0) return [];

  // Phase 1: 원금만 변제하는 기간
  const capitalFullMonths = Math.floor(totalCapital / monthlyRepay);
  const capitalRemainder = totalCapital - capitalFullMonths * monthlyRepay;
  const hasMixedMonth = capitalRemainder > 0;

  // 이자 변제에 사용할 예산
  const interestBudget = totalRepay - totalCapital;
  const segments: PhasedRepaySegment[] = [];

  // Phase 1: 원금 안분 구간
  if (capitalFullMonths > 0) {
    segments.push({
      phase: 1,
      startMonth: 1,
      endMonth: capitalFullMonths,
      monthlyAmount: monthlyRepay,
      targets: creditors.map((c) => {
        const share = totalCapital > 0
          ? Math.ceil(monthlyRepay * ((c.capital || 0) / totalCapital))
          : 0;
        return { creditorId: c.id, monthlyCapital: share, monthlyInterest: 0 };
      }),
    });
  }

  // Phase 2: 전환 회차 (원금 잔여 + 이자 시작)
  if (hasMixedMonth) {
    const mixedMonth = capitalFullMonths + 1;
    const interestInMixed = monthlyRepay - capitalRemainder;
    segments.push({
      phase: 2,
      startMonth: mixedMonth,
      endMonth: mixedMonth,
      monthlyAmount: monthlyRepay,
      targets: creditors.map((c) => {
        const capShare = totalCapital > 0
          ? Math.ceil(capitalRemainder * ((c.capital || 0) / totalCapital))
          : 0;
        const intShare = totalInterest > 0
          ? Math.ceil(interestInMixed * ((c.interest || 0) / totalInterest))
          : 0;
        return { creditorId: c.id, monthlyCapital: capShare, monthlyInterest: intShare };
      }),
    });
  }

  // Phase 3: 이자만 안분 구간
  const phase3Start = capitalFullMonths + (hasMixedMonth ? 2 : 1);
  if (phase3Start <= repayMonths) {
    const phase3Months = repayMonths - phase3Start + 1;
    const monthlyInterestPayment = phase3Months > 0
      ? Math.ceil((interestBudget - (hasMixedMonth ? monthlyRepay - capitalRemainder : 0)) / phase3Months)
      : 0;
    segments.push({
      phase: 3,
      startMonth: phase3Start,
      endMonth: repayMonths,
      monthlyAmount: monthlyInterestPayment > 0 ? monthlyRepay : 0,
      targets: creditors.map((c) => {
        const share = totalInterest > 0
          ? Math.ceil(monthlyRepay * ((c.interest || 0) / totalInterest))
          : 0;
        return { creditorId: c.id, monthlyCapital: 0, monthlyInterest: share };
      }),
    });
  }

  return segments;
}

/**
 * 스케줄 합계를 검증합니다.
 * 개별 배분액의 합이 총 변제액과 일치하는지 확인합니다.
 */
export function validateScheduleTotals(
  schedules: CreditorRepaySchedule[],
  expectedMonthly: number,
  expectedTotal: number,
): { monthlyValid: boolean; totalValid: boolean } {
  const actualMonthly = schedules.reduce((s, c) => s + c.monthlyAmount, 0);
  const actualTotal = schedules.reduce((s, c) => s + c.totalAmount, 0);

  return {
    monthlyValid: actualMonthly === expectedMonthly,
    totalValid: actualTotal === expectedTotal,
  };
}
