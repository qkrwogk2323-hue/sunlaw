/**
 * 사건 허브 문서 타임라인 — `case-hub-projection.documents` 단일 원천 소비 UI.
 *
 * 입력:
 *   CaseHubDocuments = {
 *     count, generatedCount, contractCount,
 *     recent: [{ id, source: 'case_document' | 'contract', title, documentKind,
 *                approvalStatus, createdAt, createdByName }]
 *   }
 *
 * 출처 배지:
 *   case_document → "생성"  (파란)
 *   contract      → "계약"  (슬레이트)
 *
 * 허브 로비 / 개인회생 문서 탭 / 파산 문서 탭에서 재사용. 이 컴포넌트가 소비하는
 * 데이터는 `getCaseHubProjection(caseId).documents` 하나로 수렴한다 — 독자 쿼리
 * 금지.
 *
 * 서버 안전 컴포넌트 (hooks·이벤트 핸들러 없음). 목록의 클릭 동작이 필요할 경우
 * 호출 측에서 wrapper를 씌우는 것이 원칙.
 */
import { FileText, FileSignature } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatHubRelativeActivity } from '@/lib/case-hub-metrics';
import type { CaseHubDocuments } from '@/lib/queries/case-hub-projection';

interface CaseHubDocumentTimelineProps {
  documents: CaseHubDocuments;
  /** 상단 요약 배지 노출 여부. 기본 true. */
  showSummary?: boolean;
  /** 빈 상태 설명 문구. 호출 맥락(로비/문서 탭)에 맞게 덮어쓸 수 있음. */
  emptyDescription?: string;
  /** 최대 노출 항목 수. 기본 10. projection.recent는 이미 15개로 제한됨. */
  maxItems?: number;
}

export function CaseHubDocumentTimeline({
  documents,
  showSummary = true,
  emptyDescription,
  maxItems = 10,
}: CaseHubDocumentTimelineProps) {
  const items = documents.recent.slice(0, maxItems);

  return (
    <div className="space-y-3">
      {showSummary ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge tone="blue">생성 문서 {documents.generatedCount}</Badge>
          <Badge tone="slate">계약서 {documents.contractCount}</Badge>
          <span className="text-slate-500">합계 {documents.count}건</span>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center">
          <FileText className="mx-auto mb-3 size-6 text-slate-400" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-600">아직 등록된 문서가 없습니다</p>
          <p className="mt-1 text-xs text-slate-500">
            {emptyDescription ?? '문서를 생성하거나 계약서를 작성하면 여기에 타임라인으로 나타납니다.'}
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white/80">
          {items.map((item) => {
            const isContract = item.source === 'contract';
            const Icon = isContract ? FileSignature : FileText;
            return (
              <li key={`${item.source}-${item.id}`} className="flex items-start gap-3 px-4 py-3">
                <Icon
                  className={isContract ? 'mt-0.5 size-4 shrink-0 text-slate-500' : 'mt-0.5 size-4 shrink-0 text-sky-600'}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-900">
                      {item.title ?? (isContract ? '계약서' : '문서')}
                    </span>
                    <Badge tone={isContract ? 'slate' : 'blue'}>
                      {isContract ? '계약' : '생성'}
                    </Badge>
                    {item.documentKind && !isContract ? (
                      <span className="text-[11px] text-slate-400">{item.documentKind}</span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{formatHubRelativeActivity(item.createdAt)}</span>
                    {item.createdByName ? <span>· {item.createdByName}</span> : null}
                    {item.approvalStatus && !isContract ? (
                      <span className="text-slate-400">· {item.approvalStatus}</span>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
