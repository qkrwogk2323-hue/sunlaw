const caseStatusLabels: Record<string, string> = {
  draft: "초안",
  intake: "접수",
  active: "진행 중",
  pending: "대기",
  on_hold: "보류",
  completed: "완료",
  closed: "종결",
  cancelled: "취소",
};

const approvalStatusLabels: Record<string, string> = {
  pending: "승인 대기",
  approved: "승인됨",
  rejected: "반려됨",
  cancelled: "취소됨",
};

const supportRequestStatusLabels: Record<string, string> = {
  open: "접수됨",
  in_progress: "처리 중",
  waiting: "응답 대기",
  resolved: "해결됨",
  closed: "종료됨",
};

const paymentStatusLabels: Record<string, string> = {
  pending: "결제 대기",
  paid: "결제 완료",
  failed: "결제 실패",
  refunded: "환불됨",
  cancelled: "취소됨",
};

const billingStatusLabels: Record<string, string> = {
  draft: "청구 초안",
  issued: "청구 완료",
  pending: "납부 대기",
  paid: "납부 완료",
  overdue: "연체",
  cancelled: "취소됨",
};

const invoiceStatusLabels: Record<string, string> = {
  draft: "송장 초안",
  sent: "발송됨",
  viewed: "열람됨",
  paid: "결제 완료",
  overdue: "연체",
  void: "무효",
};

const caseRequestStatusLabels: Record<string, string> = {
  submitted: "제출됨",
  reviewing: "검토 중",
  approved: "승인됨",
  rejected: "반려됨",
  withdrawn: "철회됨",
};

const organizationSignupStatusLabels: Record<string, string> = {
  draft: "작성 중",
  submitted: "신청 완료",
  under_review: "검토 중",
  approved: "승인됨",
  rejected: "반려됨",
};

const invitationStatusLabels: Record<string, string> = {
  pending: "초대 대기",
  sent: "발송됨",
  accepted: "수락됨",
  expired: "만료됨",
  revoked: "회수됨",
};

const collectionStatusLabels: Record<string, string> = {
  pending: "수금 대기",
  in_progress: "수금 진행 중",
  completed: "수금 완료",
  failed: "수금 실패",
  cancelled: "취소됨",
};

const settlementStatusLabels: Record<string, string> = {
  pending: "정산 대기",
  processing: "정산 처리 중",
  settled: "정산 완료",
  failed: "정산 실패",
  cancelled: "취소됨",
};

const compensationEntryStatusLabels: Record<string, string> = {
  draft: "초안",
  projected: "예상",
  pending: "대기",
  approved: "승인됨",
  paid: "지급 완료",
  cancelled: "취소됨",
};

function labelFrom(map: Record<string, string>, value: string): string {
  return map[value] ?? value;
}

function caseStatusLabel(value: string): string {
  return labelFrom(caseStatusLabels, value);
}

function approvalStatusLabel(value: string): string {
  return labelFrom(approvalStatusLabels, value);
}

function supportRequestStatusLabel(value: string): string {
  return labelFrom(supportRequestStatusLabels, value);
}

function paymentStatusLabel(value: string): string {
  return labelFrom(paymentStatusLabels, value);
}

function billingStatusLabel(value: string): string {
  return labelFrom(billingStatusLabels, value);
}

function invoiceStatusLabel(value: string): string {
  return labelFrom(invoiceStatusLabels, value);
}

function caseRequestStatusLabel(value: string): string {
  return labelFrom(caseRequestStatusLabels, value);
}

function orgSignupStatusLabel(value: string): string {
  return labelFrom(organizationSignupStatusLabels, value);
}

function invitationStatusLabel(value: string): string {
  return labelFrom(invitationStatusLabels, value);
}

function collectionStatusLabel(value: string): string {
  return labelFrom(collectionStatusLabels, value);
}

function settlementStatusLabel(value: string): string {
  return labelFrom(settlementStatusLabels, value);
}

function compensationEntryStatusLabel(value: string): string {
  return labelFrom(compensationEntryStatusLabels, value);
}

export {
  approvalStatusLabel,
  billingStatusLabel,
  caseRequestStatusLabel,
  caseStatusLabel,
  collectionStatusLabel,
  compensationEntryStatusLabel,
  invoiceStatusLabel,
  invitationStatusLabel,
  labelFrom,
  orgSignupStatusLabel,
  paymentStatusLabel,
  settlementStatusLabel,
  supportRequestStatusLabel,
};
