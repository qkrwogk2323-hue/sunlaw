import { describe, expect, it } from 'vitest';
import { answerDashboardAssistant, type BillingGuidanceSnapshot } from '@/lib/ai/dashboard-home';

const snapshot = {
  activeCases: 3,
  pendingDocuments: 1,
  pendingRequests: 2,
  recentMessages: 1,
  pendingBillingCount: 2,
  unreadNotifications: 1,
  urgentSchedules: [],
  recentCases: [],
  recentRequests: [],
  upcomingBilling: [],
  unreadNotificationItems: [],
  clientAccessQueue: [],
  actionableNotifications: [],
  organizationConversations: []
};

const billingGuidance: BillingGuidanceSnapshot = {
  records: [
    {
      agreementId: 'agreement-1',
      title: '착수금 분납 계약',
      caseId: 'case-1',
      caseTitle: '김민수 손해배상',
      targetLabel: '김민수',
      fixedAmount: 1000000,
      paidAmount: 300000,
      shortageAmount: 700000,
      isInstallmentPending: true,
      installmentStartMode: 'after_partial',
      recentPaymentAt: '2026-03-22T10:00:00.000Z'
    }
  ],
  totalInstallmentPendingCount: 1,
  totalInstallmentShortageCount: 1,
  totalInstallmentShortageAmount: 700000
};

describe('common ai billing guidance', () => {
  it('returns shortage-based guidance for installment shortfall questions', () => {
    const response = answerDashboardAssistant({
      organizationId: 'org-1',
      question: '김민수 분납금이 약정보다 부족합니다. 합산 청구할까요 아니면 회차를 늘릴까요?',
      snapshot,
      isPlatformAdmin: false,
      billingGuidance
    });

    expect(response.questionDomain).toBe('billing_contract');
    expect(response.answer).toContain('700,000원');
    expect(response.answer).toContain('합산');
    expect(response.actions.map((item) => item.href)).toEqual(['/billing', '/contracts', '/cases/case-1']);
  });
});
