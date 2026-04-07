/**
 * 개인회생 모듈 공통 타입 정의
 */

// ─── 채권자 ───
export interface RehabCreditor {
  id: string;
  bondNumber: number;
  classify: '자연인' | '법인';
  creditorName: string;
  branchName: string;
  postalCode: string;
  address: string;
  phone: string;
  fax: string;
  mobile: string;
  bondCause: string;
  capital: number;
  capitalCompute: string;
  interest: number;
  interestCompute: string;
  delayRate: number;
  bondContent: string;
  isSecured: boolean;
  securedPropertyId: string | null;
  lienPriority: number;
  lienType: string;
  maxClaimAmount: number;
  hasPriorityRepay: boolean;
  isUnsettled: boolean;
  isAnnuityDebt: boolean;
  applyRestructuring: boolean;
  attachments: number[];
  unsettledReason: string;
  unsettledAmount: number;
  unsettledText: string;
  guarantorName: string;
  guarantorAmount: number;
  guarantorText: string;
  /** 별제권부 담보평가액 (is_secured=true 일 때만 의미) */
  securedCollateralValue?: number;
  /** 기타 미확정 (신탁재산 등) — is_secured와 상호 배타 */
  isOtherUnconfirmed?: boolean;
  /** 채권 우선순위 — 조세(재단채권) / 담보(별제권) / 일반(무담보) */
  priorityClass?: 'tax_priority' | 'secured' | 'unsecured';
}

// ─── 별제권 담보물건 ───
export interface RehabSecuredProperty {
  id: string;
  propertyType: string;
  description: string;
  marketValue: number;
  valuationRate: number;
  note: string;
}

// ─── 별제권 배분 결과 ───
export interface SecuredAllocationResult {
  creditorId: string;
  propertyId: string;
  propertyType: string;
  propertyDesc: string;
  marketValue: number;
  valuationRate: number;
  liquidationValue: number;
  capitalCurrent: number;
  interestCurrent: number;
  securedRepayEstimate: number;
  unrecoverableAmount: number;
  securedRehabAmount: number;
  unsecuredConversion: number;
  lienType: string;
  lienPriority: number;
  maxClaimAmount: number;
}

// ─── 재산 ───
export interface RehabPropertyItem {
  id: string;
  category: string;
  detail: string;
  amount: number;
  seizure: string;
  repayUse: string;
  isProtection: boolean;
}

export interface RehabPropertyCategory {
  items: RehabPropertyItem[];
  deduction: number;
}

export type PropertyCategoryId =
  | 'cash' | 'deposit' | 'insurance' | 'car' | 'lease'
  | 'realestate' | 'equipment' | 'loan' | 'sales'
  | 'retirement' | 'seizure' | 'consignment' | 'etc'
  | 'exempt_housing' | 'exempt_living';

export interface PropertyCategoryDef {
  id: PropertyCategoryId;
  name: string;
  cols: string[];
  hasDeduction: boolean;
  deductionLabel?: string;
  deductionDefault?: number;
  deductionNote?: string;
}

// ─── 가족 ───
export interface RehabFamilyMember {
  id: string;
  relation: string;
  memberName: string;
  age: string;
  cohabitation: string;
  occupation: string;
  monthlyIncome: number;
  totalProperty: number;
  isDependent: boolean;
}

// ─── 변제계획 ───
export type RepayPeriodOption =
  | 'capital60'
  | 'both60'
  | 'capital100_5y'
  | 'capital100_3y'
  | 'full3y';

export interface RepaymentInput {
  creditors: Pick<RehabCreditor, 'capital' | 'interest' | 'isSecured'>[];
  securedResults: SecuredAllocationResult[];
  monthlyIncome: number;
  livingCost: number;
  extraLivingCost: number;
  childSupport: number;
  trusteeCommRate: number;
  disposeAmount: number;
  repayOption: RepayPeriodOption;
  liquidationValue: number;
  extra5y?: boolean;
  extra3y?: boolean;
  capitalOnly?: boolean;
}

export interface RepaymentResult {
  monthlyAvailable: number;
  monthlyRepay: number;
  repayMonths: number;
  totalRepayAmount: number;
  /** (L) 총변제예정액의 라이프니츠 현재가치 — 계수 미보유 시 null */
  presentValue: number | null;
  repayRate: number;
  totalDebt: number;
  totalCapital: number;
  totalInterest: number;
  securedDebt: number;
  unsecuredDebt: number;
  liquidationWarning: boolean;
}

export type RepayType = 'sequential' | 'combined' | 'tieredTaxPriority';

export interface CreditorRepaySchedule {
  creditorId: string;
  ratio: number;
  monthlyAmount: number;
  totalAmount: number;
  capitalRepay: number;
  interestRepay: number;
  /** 확정채권 변제액 (unconfirmed 분리 시) */
  confirmedAmount?: number;
  /** 미확정채권 변제액 */
  unconfirmedAmount?: number;
}

/** 계단식 조세우선 배분 — 구간별 월변제 내역 */
export interface TieredScheduleSegment {
  startMonth: number;
  endMonth: number;
  monthlyAmount: number;
  targets: Array<{ creditorId: string; monthlyShare: number }>;
}
