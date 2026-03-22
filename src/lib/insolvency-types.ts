// Gemini 문서 추출 타입 정의 — API route, actions, UI에서 공유
export type CreditorRaw = {
  creditorName: string;
  claimClass: 'secured' | 'priority' | 'general';
  principalAmount: number;
  interestAmount: number;
  penaltyAmount: number;
  interestRatePct: number | null;
  hasGuarantor: boolean;
  guarantorName: string | null;
  collateralDescription: string | null;    // 담보물 설명 (별제권부)
  prioritySubtype: string | null;          // 우선변제 세부 (세금/임금/보증금)
  sourcePageReference: string | null;
  aiConfidenceScore: number;
};

export type CorrectionChecklistItemRaw = {
  title: string;
  description: string | null;
  responsibility: 'client_self' | 'client_visit' | 'office_prepare';
  requestPurpose: string | null;
  sourcePageReference: string | null;
};

export type CorrectionNoticeSummaryRaw = {
  servedAt: string | null;
  correctionDeadline: string | null;
  courtRequestSummary: string | null;
  requestedDocuments: Array<{
    title: string;
    purpose: string | null;
    responsibility: 'client_self' | 'client_visit' | 'office_prepare';
    sourcePageReference: string | null;
  }>;
};

export type ExtractionResult = {
  documentType: 'debt_certificate' | 'correction_order' | 'correction_recommendation' | 'other';
  creditors: CreditorRaw[];
  correctionItems: CorrectionChecklistItemRaw[];
  correctionNoticeSummary: CorrectionNoticeSummaryRaw | null;
  rawSummary: string;
  aiModel: string;
};
