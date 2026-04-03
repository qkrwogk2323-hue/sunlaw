'use client';

import { FileText, Download, Printer } from 'lucide-react';

interface RehabDocumentsTabProps {
  caseId: string;
  organizationId: string;
}

const DOCUMENT_TYPES = [
  { key: 'application', label: '개인회생 신청서', description: '법원 제출용 신청서' },
  { key: 'creditor_list', label: '채권자 목록', description: '채권자 현황 목록표' },
  { key: 'property_list', label: '재산 목록', description: '재산 및 청산가치 목록' },
  { key: 'income_statement', label: '수입 및 지출에 관한 목록', description: '월 소득/지출 현황' },
  { key: 'affidavit', label: '진술서', description: '채무 경위 진술서' },
  { key: 'repayment_plan', label: '변제계획안', description: '채권자별 변제 스케줄' },
  { key: 'family_relation', label: '가족관계증명서 첨부목록', description: '가족 구성원 현황' },
] as const;

export function RehabDocumentsTab({
  caseId,
  organizationId,
}: RehabDocumentsTabProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-700">
          각 탭의 데이터를 바탕으로 법원 제출용 문서를 생성합니다.
        </p>
        <p className="mt-1 text-xs text-blue-600">
          모든 탭의 입력이 완료된 후 문서를 출력해주세요.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-base font-semibold text-slate-800">출력 가능 문서</h2>
        <div className="space-y-3">
          {DOCUMENT_TYPES.map((doc) => (
            <div
              key={doc.key}
              className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50/50 p-3"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-700">{doc.label}</p>
                  <p className="text-xs text-slate-500">{doc.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
                  disabled
                  aria-label={`${doc.label} 미리보기`}
                >
                  <Printer className="h-3.5 w-3.5" />
                  미리보기
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-40"
                  disabled
                  aria-label={`${doc.label} 다운로드`}
                >
                  <Download className="h-3.5 w-3.5" />
                  다운로드
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-slate-400">
          문서 출력 기능은 다음 업데이트에서 지원됩니다.
        </p>
      </section>
    </div>
  );
}
