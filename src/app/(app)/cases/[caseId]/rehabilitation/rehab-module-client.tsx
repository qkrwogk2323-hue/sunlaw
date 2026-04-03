'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { RehabApplicantTab } from './tabs/rehab-applicant-tab';
import { RehabCreditorsTab } from './tabs/rehab-creditors-tab';
import { RehabPropertyTab } from './tabs/rehab-property-tab';
import { RehabIncomeTab } from './tabs/rehab-income-tab';
import { RehabAffidavitTab } from './tabs/rehab-affidavit-tab';
import { RehabPlanTab } from './tabs/rehab-plan-tab';
import { RehabDocumentsTab } from './tabs/rehab-documents-tab';

const TABS = [
  { key: 'applicant', label: '신청인' },
  { key: 'creditors', label: '채권자' },
  { key: 'property', label: '재산' },
  { key: 'income', label: '소득/생계비' },
  { key: 'affidavit', label: '진술서' },
  { key: 'plan', label: '변제계획' },
  { key: 'documents', label: '출력/문서' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

interface RehabModuleClientProps {
  caseId: string;
  organizationId: string;
  caseTitle: string;
  primaryClient: Record<string, unknown> | null;
  application: Record<string, unknown> | null;
  creditorSettings: Record<string, unknown> | null;
  creditors: Record<string, unknown>[];
  securedProperties: Record<string, unknown>[];
  properties: Record<string, unknown>[];
  propertyDeductions: Record<string, unknown>[];
  familyMembers: Record<string, unknown>[];
  incomeSettings: Record<string, unknown> | null;
  affidavit: Record<string, unknown> | null;
  planSections: Record<string, unknown>[];
}

export function RehabModuleClient({
  caseId,
  organizationId,
  caseTitle,
  primaryClient,
  application,
  creditorSettings,
  creditors,
  securedProperties,
  properties,
  propertyDeductions,
  familyMembers,
  incomeSettings,
  affidavit,
  planSections,
}: RehabModuleClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('applicant');

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">개인회생 자동작성</h1>
        <p className="mt-1 text-sm text-slate-500">
          {caseTitle} — 신청서류를 단계별로 작성합니다
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              'whitespace-nowrap rounded-t-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* 탭 컨텐츠 */}
      <div role="tabpanel">
        {activeTab === 'applicant' && (
          <RehabApplicantTab
            caseId={caseId}
            organizationId={organizationId}
            primaryClient={primaryClient}
            application={application}
            familyMembers={familyMembers}
          />
        )}
        {activeTab === 'creditors' && (
          <RehabCreditorsTab
            caseId={caseId}
            organizationId={organizationId}
            creditorSettings={creditorSettings}
            creditors={creditors}
            securedProperties={securedProperties}
          />
        )}
        {activeTab === 'property' && (
          <RehabPropertyTab
            caseId={caseId}
            organizationId={organizationId}
            properties={properties}
            propertyDeductions={propertyDeductions}
          />
        )}
        {activeTab === 'income' && (
          <RehabIncomeTab
            caseId={caseId}
            organizationId={organizationId}
            incomeSettings={incomeSettings}
            familyMembers={familyMembers}
          />
        )}
        {activeTab === 'affidavit' && (
          <RehabAffidavitTab
            caseId={caseId}
            organizationId={organizationId}
            affidavit={affidavit}
          />
        )}
        {activeTab === 'plan' && (
          <RehabPlanTab
            caseId={caseId}
            organizationId={organizationId}
            creditors={creditors}
            securedProperties={securedProperties}
            properties={properties}
            propertyDeductions={propertyDeductions}
            incomeSettings={incomeSettings}
            familyMembers={familyMembers}
            planSections={planSections}
          />
        )}
        {activeTab === 'documents' && (
          <RehabDocumentsTab
            caseId={caseId}
            organizationId={organizationId}
          />
        )}
      </div>
    </div>
  );
}
